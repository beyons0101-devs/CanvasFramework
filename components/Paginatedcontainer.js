import Component from '../core/Component.js';

/**
 * Conteneur avec pagination manuelle - l'utilisateur définit le contenu de chaque page
 * @class
 * @extends Component
 * 
 * Exemple d'utilisation:
 * const container = new PaginatedContainer(framework, { pageHeight: 400, width: 600 });
 * container.addPage([child1, child2, child3]); // Page 1
 * container.addPage([child4, child5]);         // Page 2
 * container.addPage([child6]);                 // Page 3
 * 
 * Material: Boutons Material You avec numéros de page
 * Cupertino: Boutons iOS style avec compteur
 */
class PaginatedContainer extends Component {
  /**
   * Crée une instance de PaginatedContainer
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.pageHeight=400] - Hauteur d'une page
   * @param {number} [options.padding=16] - Padding interne
   * @param {number} [options.gap=12] - Espacement entre composants
   * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
   * @param {number} [options.elevation=2] - Élévation (Material)
   * @param {number} [options.borderRadius=8] - Rayon des coins
   * @param {boolean} [options.showNavigation=true] - Afficher navigation
   * @param {string} [options.navPosition='bottom'] - Position nav: 'top', 'bottom', 'both'
   * @param {Function} [options.onPageChange] - Callback changement de page
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.platform = framework.platform;
    this.pageHeight = options.pageHeight || 400;
    this.padding = options.padding || 16;
    this.gap = options.gap || 12;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.elevation = options.elevation !== undefined ? options.elevation : 2;
    this.borderRadius = options.borderRadius !== undefined ? options.borderRadius : 8;
    this.showNavigation = options.showNavigation !== false;
    this.navPosition = options.navPosition || 'bottom';
    this.onPageChange = options.onPageChange || (() => {});
    
    // Navigation
    this.navHeight = this.platform === 'material' ? 56 : 50;
    this.currentPage = 0;
    
    // Pages - tableau de tableaux d'enfants
    this.pages = [];
    
    // Calcul hauteur totale
    const navTopHeight = (this.showNavigation && this.navPosition !== 'bottom') ? this.navHeight : 0;
    const navBottomHeight = (this.showNavigation && this.navPosition !== 'top') ? this.navHeight : 0;
    this.height = navTopHeight + this.pageHeight + navBottomHeight;
    
    // Couleurs selon plateforme
    if (this.platform === 'material') {
      this.navColor = '#F5F5F5';
      this.borderColor = '#E0E0E0';
      this.activeColor = '#6200EE';
      this.inactiveColor = '#757575';
      this.shadowColor = 'rgba(0,0,0,0.15)';
      this.buttonBgColor = '#FFFFFF';
      this.buttonDisabledColor = '#F5F5F5';
    } else {
      this.navColor = '#F2F2F7';
      this.borderColor = '#C6C6C8';
      this.activeColor = '#007AFF';
      this.inactiveColor = '#8E8E93';
      this.shadowColor = 'rgba(0,0,0,0.1)';
      this.buttonBgColor = '#FFFFFF';
      this.buttonDisabledColor = '#E5E5EA';
    }
    
    // Élévation
    this._applyElevationStyles();
    
    // Navigation buttons
    this.navButtons = [];
    this.hoveredButton = null;
    this.pressedButton = null;
	
	// Pour l'effet ripple
	  this.rippleButton = null;
	  this.rippleTimer = null;
  }
  
  /**
   * Applique les styles d'élévation
   * @private
   */
  _applyElevationStyles() {
    const elevationStyles = {
      0: { blur: 0, offsetY: 0, spread: 0, opacity: 0 },
      1: { blur: 2, offsetY: 1, spread: 0, opacity: 0.1 },
      2: { blur: 4, offsetY: 2, spread: 1, opacity: 0.15 },
      3: { blur: 8, offsetY: 4, spread: 2, opacity: 0.2 },
      4: { blur: 16, offsetY: 8, spread: 3, opacity: 0.25 },
      5: { blur: 24, offsetY: 12, spread: 4, opacity: 0.3 }
    };
    
    const style = elevationStyles[Math.min(this.elevation, 5)] || elevationStyles[0];
    
    this.shadowBlur = style.blur;
    this.shadowOffsetY = style.offsetY;
    this.shadowSpread = style.spread;
    this.shadowOpacity = style.opacity;
    
    this._updateShadowColor();
  }
  
  /**
   * Met à jour la couleur de l'ombre
   * @private
   */
  _updateShadowColor() {
    const rgbMatch = this.shadowColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = rgbMatch[1];
      const g = rgbMatch[2];
      const b = rgbMatch[3];
      this._computedShadowColor = `rgba(${r}, ${g}, ${b}, ${this.shadowOpacity})`;
    } else {
      this._computedShadowColor = this.shadowColor;
    }
  }
  
  /**
   * Ajoute une nouvelle page avec ses enfants
   * @param {Component[]} children - Tableau de composants pour cette page
   * @returns {number} Index de la page ajoutée
   */
  addPage(children = []) {
    const pageIndex = this.pages.length;
    this.pages.push(children);
    this.updateNavButtons();
    this.updateChildrenPositions();
    return pageIndex;
  }
  
  /**
   * Définit le contenu d'une page spécifique
   * @param {number} pageIndex - Index de la page
   * @param {Component[]} children - Tableau de composants
   */
  setPage(pageIndex, children = []) {
    if (pageIndex >= 0) {
      // Étendre le tableau si nécessaire
      while (this.pages.length <= pageIndex) {
        this.pages.push([]);
      }
      this.pages[pageIndex] = children;
      this.updateNavButtons();
      if (pageIndex === this.currentPage) {
        this.updateChildrenPositions();
      }
    }
  }
  
  /**
   * Récupère le contenu d'une page
   * @param {number} pageIndex - Index de la page
   * @returns {Component[]} Tableau des enfants de cette page
   */
  getPage(pageIndex) {
    return this.pages[pageIndex] || [];
  }
  
  /**
   * Retire une page
   * @param {number} pageIndex - Index de la page à retirer
   */
  removePage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      this.pages.splice(pageIndex, 1);
      
      // Ajuster la page courante si nécessaire
      if (this.currentPage >= this.pages.length && this.pages.length > 0) {
        this.currentPage = this.pages.length - 1;
      }
      
      this.updateNavButtons();
      this.updateChildrenPositions();
    }
  }
  
  /**
   * Nombre total de pages
   * @returns {number}
   */
  get totalPages() {
    return this.pages.length;
  }
  
  /**
   * Met à jour les positions de tous les enfants de la page courante
   * @private
   */
  updateChildrenPositions() {
    if (this.currentPage >= this.pages.length) return;
    
    const navTopHeight = (this.showNavigation && this.navPosition !== 'bottom') ? this.navHeight : 0;
    const pageY = this.y + navTopHeight;
    
    const currentPageChildren = this.pages[this.currentPage];
    let currentY = pageY + this.padding;
    
    for (const child of currentPageChildren) {
      // Positionner l'enfant
      child.x = this.x + this.padding;
      child.y = currentY;
      
      // Ajuster la largeur si nécessaire (prend toute la largeur disponible)
      if (!child.width || child.width === 0) {
        child.width = this.width - (this.padding * 2);
      }
      
      // Incrémenter Y pour le prochain enfant
      currentY += (child.height || 0) + this.gap;
    }
  }
  
  /**
   * Change de page
   * @param {number} pageIndex - Index de la nouvelle page
   */
  goToPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.totalPages && pageIndex !== this.currentPage) {
      this.currentPage = pageIndex;
      this.updateChildrenPositions();
      this.updateNavButtons();
      this.onPageChange(this.currentPage, this.totalPages);
      if (this.framework && this.framework.redraw) {
        this.framework.redraw();
      }
    }
  }
  
  /**
   * Page suivante
   */
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }
  
  /**
   * Page précédente
   */
  previousPage() {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }
  
  /**
   * Met à jour les boutons de navigation
   * @private
   */
  updateNavButtons() {
    this.navButtons = [];
    
    if (!this.showNavigation || this.totalPages === 0) return;
    
    const buttonSize = this.platform === 'material' ? 40 : 36;
    const navTopHeight = (this.showNavigation && this.navPosition !== 'bottom') ? this.navHeight : 0;
    
    // Position des boutons
    const leftX = this.x + 16;
    const rightX = this.x + this.width - 16 - buttonSize;
    
    // Navigation du bas (par défaut)
    if (this.navPosition === 'bottom' || this.navPosition === 'both') {
      const navBottomY = this.y + navTopHeight + this.pageHeight;
      const buttonY = navBottomY + (this.navHeight - buttonSize) / 2;
      
      this.navButtons.push({
        x: leftX,
        y: buttonY,
        size: buttonSize,
        action: 'prev',
        disabled: this.currentPage === 0
      });
      
      this.navButtons.push({
        x: rightX,
        y: buttonY,
        size: buttonSize,
        action: 'next',
        disabled: this.currentPage === this.totalPages - 1
      });
    }
    
    // Navigation du haut
    if (this.navPosition === 'top' || this.navPosition === 'both') {
      const navTopY = this.y;
      const buttonY = navTopY + (this.navHeight - buttonSize) / 2;
      
      this.navButtons.push({
        x: leftX,
        y: buttonY,
        size: buttonSize,
        action: 'prev',
        disabled: this.currentPage === 0
      });
      
      this.navButtons.push({
        x: rightX,
        y: buttonY,
        size: buttonSize,
        action: 'next',
        disabled: this.currentPage === this.totalPages - 1
      });
    }
  }
  
  /**
   * Dessine l'ombre
   * @private
   */
  drawShadow(ctx) {
    if (this.elevation === 0) return;
    
    ctx.save();
    
    ctx.shadowColor = this._computedShadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = this.shadowOffsetY;
    
    ctx.fillStyle = this.bgColor;
    
    if (this.borderRadius > 0) {
      ctx.beginPath();
      const spread = this.shadowSpread;
      this.roundRect(
        ctx,
        this.x - spread / 2,
        this.y - spread / 2,
        this.width + spread,
        this.height + spread,
        this.borderRadius + spread / 2
      );
      ctx.fill();
    } else {
      const spread = this.shadowSpread;
      ctx.fillRect(
        this.x - spread / 2,
        this.y - spread / 2,
        this.width + spread,
        this.height + spread
      );
    }
    
    ctx.restore();
  }
  
  /**
   * Dessine la navigation Material
   * @private
   */
  drawMaterialNavigation(ctx, navY) {
    // Background navigation
    ctx.fillStyle = this.navColor;
    ctx.fillRect(this.x, navY, this.width, this.navHeight);
    
    // Ligne de séparation
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, navY);
    ctx.lineTo(this.x + this.width, navY);
    ctx.stroke();
    
    // Boutons navigation
    this.drawMaterialButtons(ctx, navY);
    
    // Compteur de pages (centré)
    ctx.fillStyle = this.inactiveColor;
    ctx.font = '14px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Page ${this.currentPage + 1} / ${this.totalPages}`,
      this.x + this.width / 2,
      navY + this.navHeight / 2
    );
  }
  
	/**
	 * Dessine les boutons Material avec effet ripple (taille doublée)
	 * @private
	 */
	drawMaterialButtons(ctx, navY) {
	  const now = Date.now();
	  
	  for (const btn of this.navButtons) {
		// Ne dessiner que les boutons de cette barre de navigation
		const isThisNav = Math.abs(btn.y - (navY + (this.navHeight - btn.size) / 2)) < 1;
		if (!isThisNav) continue;
		
		const isHovered = this.hoveredButton === btn.action;
		const isPressed = this.rippleButton === btn.action;
		
		ctx.save();
		
		// Centre du bouton
		const centerX = btn.x + btn.size / 2;
		const centerY = btn.y + btn.size / 2;
		const buttonRadius = btn.size / 2;
		
		// Masque circulaire (garde le ripple à l'intérieur du bouton)
		ctx.beginPath();
		ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
		ctx.clip();
		
		// Background du bouton
		if (btn.disabled) {
		  ctx.fillStyle = this.buttonDisabledColor;
		} else {
		  ctx.fillStyle = this.buttonBgColor;
		}
		ctx.beginPath();
		ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
		ctx.fill();
		
		// EFFET RIPPLE - TAILLE DOUBLÉE
		if (isPressed && !btn.disabled && this.rippleStartTime) {
		  const elapsed = now - this.rippleStartTime;
		  
		  if (elapsed < 300) { // Pendant les 300ms
			// Progression de l'animation (0 à 1)
			const progress = elapsed / 300;
			
			// 🌟 TAILLE DOUBLÉE: le ripple atteint le DIAMÈTRE complet (btn.size)
			// Au lieu de rayon (btn.size/2), on utilise le diamètre
			const maxRippleRadius = btn.size; // Double de la taille normale
			const rippleRadius = maxRippleRadius * Math.min(progress, 1);
			
			// Opacité: forte au début, faible à la fin
			const opacity = 0.5 * (1 - progress * 0.7);
			
			// Cercle ripple (plus grand que le bouton, mais clipé)
			ctx.fillStyle = this.hexToRgba(this.activeColor, opacity);
			ctx.beginPath();
			ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
			ctx.fill();
			
			// Forcer un redessin
			if (this.framework && this.framework.redraw) {
			  setTimeout(() => {
				this.framework.redraw();
			  }, 16);
			}
		  }
		}
		
		// Effet hover
		if (isHovered && !btn.disabled && !isPressed) {
		  ctx.fillStyle = this.hexToRgba(this.activeColor, 0.1);
		  ctx.beginPath();
		  ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
		  ctx.fill();
		}
		
		ctx.restore();
		
		// Bordure et icône (sans clip)
		ctx.save();
		
		// Bordure
		ctx.strokeStyle = btn.disabled ? '#E0E0E0' : this.borderColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
		ctx.stroke();
		
		// Icône
		ctx.fillStyle = btn.disabled ? '#BDBDBD' : this.activeColor;
		ctx.font = '28px Roboto, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(
		  btn.action === 'prev' ? '‹' : '›',
		  centerX,
		  centerY
		);
		
		ctx.restore();
	  }
	}
  
  /**
   * Dessine la navigation Cupertino (iOS)
   * @private
   */
  drawCupertinoNavigation(ctx, navY) {
    // Background
    ctx.fillStyle = this.navColor;
    ctx.fillRect(this.x, navY, this.width, this.navHeight);
    
    // Ligne de séparation
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(this.x, navY);
    ctx.lineTo(this.x + this.width, navY);
    ctx.stroke();
    
    // Boutons navigation
    this.drawCupertinoButtons(ctx, navY);
    
    // Compteur de pages (centré)
    ctx.fillStyle = this.inactiveColor;
    ctx.font = '15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Page ${this.currentPage + 1} / ${this.totalPages}`,
      this.x + this.width / 2,
      navY + this.navHeight / 2
    );
  }
  
  /**
   * Dessine les boutons Cupertino (iOS)
   * @private
   */
  drawCupertinoButtons(ctx, navY) {
    for (const btn of this.navButtons) {
      // Ne dessiner que les boutons de cette barre de navigation
      const isThisNav = Math.abs(btn.y - (navY + (this.navHeight - btn.size) / 2)) < 1;
      if (!isThisNav) continue;
      
      const isPressed = this.pressedButton === btn.action;
      
      ctx.save();
      
      // Background iOS style
      if (btn.disabled) {
        ctx.fillStyle = this.buttonDisabledColor;
      } else {
        ctx.fillStyle = this.buttonBgColor;
      }
      
      // Rectangle arrondi (iOS style)
      const padding = 2;
      ctx.beginPath();
      this.roundRect(
        ctx,
        btn.x + padding,
        btn.y + padding,
        btn.size - padding * 2,
        btn.size - padding * 2,
        (btn.size - padding * 2) / 2
      );
      ctx.fill();
      
      // Bordure légère
      if (!btn.disabled) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      
      // Effet pressed
      if (isPressed && !btn.disabled) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();
      }
      
      // Icône chevron iOS
      const chevronColor = btn.disabled ? this.inactiveColor : this.activeColor;
      this.drawChevron(
        ctx,
        btn.x + btn.size / 2,
        btn.y + btn.size / 2,
        btn.action === 'prev' ? 'left' : 'right',
        chevronColor
      );
      
      ctx.restore();
    }
  }
  
  /**
   * Dessine un chevron iOS
   * @private
   */
  drawChevron(ctx, cx, cy, direction, color) {
    const size = 10;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    if (direction === 'left') {
      ctx.moveTo(cx + size / 2, cy - size / 2);
      ctx.lineTo(cx - size / 2, cy);
      ctx.lineTo(cx + size / 2, cy + size / 2);
    } else {
      ctx.moveTo(cx - size / 2, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy);
      ctx.lineTo(cx - size / 2, cy + size / 2);
    }
    ctx.stroke();
    ctx.restore();
  }
  
  /**
   * Dessine le composant - UNIQUEMENT LA PAGE COURANTE
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre
    if (this.platform === 'material') {
      this.drawShadow(ctx);
    }
    
    // Background principal
    ctx.fillStyle = this.bgColor;
    if (this.borderRadius > 0) {
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    // Navigation du haut
    if (this.showNavigation && (this.navPosition === 'top' || this.navPosition === 'both')) {
      if (this.platform === 'material') {
        this.drawMaterialNavigation(ctx, this.y);
      } else {
        this.drawCupertinoNavigation(ctx, this.y);
      }
    }
    
    // Zone de contenu avec clipping
    const navTopHeight = (this.showNavigation && this.navPosition !== 'bottom') ? this.navHeight : 0;
    const pageY = this.y + navTopHeight;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, pageY, this.width, this.pageHeight);
    ctx.clip();
    
    // Dessiner UNIQUEMENT les enfants de la page courante
    if (this.currentPage < this.pages.length) {
      const currentPageChildren = this.pages[this.currentPage];
      for (const child of currentPageChildren) {
        if (child.visible !== false && child.draw) {
          child.draw(ctx);
        }
      }
    }
    
    ctx.restore();
    
    // Navigation du bas
    if (this.showNavigation && (this.navPosition === 'bottom' || this.navPosition === 'both')) {
      const navBottomY = this.y + navTopHeight + this.pageHeight;
      if (this.platform === 'material') {
        this.drawMaterialNavigation(ctx, navBottomY);
      } else {
        this.drawCupertinoNavigation(ctx, navBottomY);
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Gère le survol (pour hover effect)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleHover(x, y) {
    if (!this.showNavigation) return;
    
    let newHovered = null;
    
    for (const btn of this.navButtons) {
      if (btn.disabled) continue;
      
      const margin = 10;
      if (x >= (btn.x - margin) &&
          x <= (btn.x + btn.size + margin) &&
          y >= (btn.y - margin) &&
          y <= (btn.y + btn.size + margin)) {
        newHovered = btn.action;
        break;
      }
    }
    
    if (newHovered !== this.hoveredButton) {
      this.hoveredButton = newHovered;
      if (this.framework && this.framework.redraw) {
        this.framework.redraw();
      }
    }
  }
  
  /**
   * Override setPosition pour mettre à jour les enfants
   */
  setPosition(x, y) {
    super.setPosition(x, y);
    this.updateChildrenPositions();
    this.updateNavButtons();
  }
  
  /**
   * Utilitaire: Convertit hex en rgba
   * @private
   */
  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }
    return `rgba(0, 0, 0, ${alpha})`;
  }
  
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  isPointInside(x, y) {
  const isInside = x >= this.x &&
                   x <= this.x + this.width &&
                   y >= this.y &&
                   y <= this.y + this.height;
  
  if (isInside) {
    if (this.navButtons && this.navButtons.length >= 2) {
      const leftButton = this.navButtons[0];
      const rightButton = this.navButtons[1];
      
      const tolerance = 40;
      
      // Bouton gauche
      if (Math.abs(x - leftButton.x) < tolerance && 
          Math.abs(y - leftButton.y) < tolerance) {
        
        if (!leftButton.disabled) {
          console.log("🎯 Ripple sur bouton gauche"); // LOG DE DEBUG
          
          // EFFET RIPPLE
          this.rippleButton = 'prev';
          this.rippleStartTime = Date.now();
          
          // Redessiner immédiatement
          if (this.framework && this.framework.redraw) {
            this.framework.redraw();
          }
          
          // Action après un petit délai
          setTimeout(() => {
            if (this.currentPage > 0) {
              this.currentPage--;
              this.updateChildrenPositions();
              this.updateNavButtons();
            }
          }, 100);
          
          // Reset ripple après animation
          setTimeout(() => {
            this.rippleButton = null;
            this.rippleStartTime = null;
            if (this.framework && this.framework.redraw) {
              this.framework.redraw();
            }
          }, 350);
        }
        return true;
      }
      
      // Bouton droit
      if (Math.abs(x - rightButton.x) < tolerance && 
          Math.abs(y - rightButton.y) < tolerance) {
        
        if (!rightButton.disabled) {
          console.log("🎯 Ripple sur bouton droit"); // LOG DE DEBUG
          
          // EFFET RIPPLE
          this.rippleButton = 'next';
          this.rippleStartTime = Date.now();
          
          // Redessiner immédiatement
          if (this.framework && this.framework.redraw) {
            this.framework.redraw();
          }
          
          // Action après un petit délai
          setTimeout(() => {
            if (this.currentPage < this.totalPages - 1) {
              this.currentPage++;
              this.updateChildrenPositions();
              this.updateNavButtons();
            }
          }, 100);
          
          // Reset ripple après animation
          setTimeout(() => {
            this.rippleButton = null;
            this.rippleStartTime = null;
            if (this.framework && this.framework.redraw) {
              this.framework.redraw();
            }
          }, 350);
        }
        return true;
      }
    }
  }
  
  return isInside;
}
}

export default PaginatedContainer;