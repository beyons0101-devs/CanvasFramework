import Component from '../core/Component.js';

/**
 * Système de notation par étoiles avec variantes Material et Cupertino
 * @class
 * @extends Component
 * 
 * Material: Étoiles avec animation ripple
 * Cupertino: Étoiles iOS style SF Symbols
 */
class Rating extends Component {
  /**
   * Crée une instance de Rating
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.max=5] - Nombre max d'étoiles
   * @param {number} [options.value=0] - Valeur initiale
   * @param {boolean} [options.allowHalf=false] - Autoriser demi-étoiles
   * @param {boolean} [options.readOnly=false] - Mode lecture seule
   * @param {number} [options.size=32] - Taille des étoiles
   * @param {string} [options.activeColor] - Couleur étoiles actives
   * @param {Function} [options.onChange] - Callback changement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.platform = framework.platform;
    this.max = options.max || 5;
    this.value = options.value || 0;
    this.allowHalf = options.allowHalf || false;
    this.readOnly = options.readOnly || false;
    this.size = options.size || 32;
    this.onChange = options.onChange || (() => {});
    
    // Couleurs selon plateforme
    if (this.platform === 'material') {
      this.activeColor = options.activeColor || '#FBC02D';
      this.inactiveColor = '#E0E0E0';
      this.rippleColor = 'rgba(251, 192, 45, 0.3)';
    } else {
      this.activeColor = options.activeColor || '#FFCC00';
      this.inactiveColor = '#E5E5EA';
    }
    
    // Dimensions
    const spacing = this.platform === 'material' ? 8 : 4;
    this.width = this.max * (this.size + spacing);
    this.height = this.size + 16;
    
    // État hover/animation
    this.hoveredStar = null;
    this.pressedStar = null;
    this.ripples = [];
    
    // Positions des étoiles
    this.starPositions = [];
    this.calculateStarPositions();
	
	// ✅ Flag anti-double appel
    this._isChanging = false;
  }
  
  /**
   * Calcule les positions des étoiles
   * @private
   */
  calculateStarPositions() {
    this.starPositions = [];
    const spacing = this.platform === 'material' ? 8 : 4;
    
    for (let i = 0; i < this.max; i++) {
      const x = this.x + i * (this.size + spacing) + this.size / 2;
      const y = this.y + this.height / 2;
      
      this.starPositions.push({ x, y, index: i });
    }
  }
  
  /**
   * Dessine une étoile pleine
   * @private
   */
  drawStar(ctx, cx, cy, size, fillAmount = 1) {
    const outerRadius = size / 2;
    const innerRadius = outerRadius * 0.4;
    const points = 5;
    
    ctx.save();
    ctx.translate(cx, cy);
    
    // Créer le chemin de l'étoile
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    // Remplissage partiel si demi-étoile
    if (fillAmount < 1 && fillAmount > 0) {
      ctx.save();
      ctx.clip();
      
      // Partie inactive
      ctx.fillStyle = this.inactiveColor;
      ctx.fill();
      
      // Partie active (gauche)
      ctx.beginPath();
      ctx.rect(-outerRadius, -outerRadius, outerRadius * 2 * fillAmount, outerRadius * 2);
      ctx.clip();
      
      // Redessiner l'étoile en couleur active
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = this.activeColor;
      ctx.fill();
      
      ctx.restore();
    } else {
      ctx.fillStyle = fillAmount > 0 ? this.activeColor : this.inactiveColor;
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  /**
   * Dessine le rating Material
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawMaterial(ctx) {
    this.starPositions.forEach((pos, index) => {
      const starValue = index + 1;
      const isHovered = this.hoveredStar === index;
      
      // Ombre si hover (sauf read-only)
      if (isHovered && !this.readOnly) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
      }
      
      // Calculer le remplissage
      let fillAmount = 0;
      const hoverValue = this.hoveredStar !== null ? 
                        (this.allowHalf ? this.getHoverValue() : this.hoveredStar + 1) : 
                        this.value;
      
      const compareValue = this.readOnly ? this.value : hoverValue;
      
      if (compareValue >= starValue) {
        fillAmount = 1;
      } else if (this.allowHalf && compareValue >= starValue - 0.5) {
        fillAmount = 0.5;
      }
      
      // Dessiner l'étoile
      this.drawStar(ctx, pos.x, pos.y, this.size, fillAmount);
      
      if (isHovered && !this.readOnly) {
        ctx.restore();
      }
      
      // Ripple effect
      if (this.platform === 'material') {
        for (let ripple of this.ripples) {
          if (ripple.star === index) {
            ctx.save();
            ctx.globalAlpha = ripple.opacity;
            ctx.fillStyle = this.rippleColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ripple.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    });
  }
  
  /**
   * Dessine le rating Cupertino (iOS)
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawCupertino(ctx) {
    this.starPositions.forEach((pos, index) => {
      const starValue = index + 1;
      const isPressed = this.pressedStar === index;
      
      // Scale animation si pressed
      const scale = isPressed && !this.readOnly ? 1.2 : 1;
      
      // Calculer le remplissage
      let fillAmount = 0;
      const hoverValue = this.hoveredStar !== null ? 
                        (this.allowHalf ? this.getHoverValue() : this.hoveredStar + 1) : 
                        this.value;
      
      const compareValue = this.readOnly ? this.value : hoverValue;
      
      if (compareValue >= starValue) {
        fillAmount = 1;
      } else if (this.allowHalf && compareValue >= starValue - 0.5) {
        fillAmount = 0.5;
      }
      
      // Appliquer scale
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(scale, scale);
      ctx.translate(-pos.x, -pos.y);
      
      // Dessiner l'étoile
      this.drawStar(ctx, pos.x, pos.y, this.size, fillAmount);
      
      ctx.restore();
    });
  }
  
  /**
   * Dessine le composant
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.platform === 'material') {
      this.drawMaterial(ctx);
    } else {
      this.drawCupertino(ctx);
    }
    
    ctx.restore();
  }
  
  /**
   * Gère le clic/touch
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleClick(x, y) {
    if (this.readOnly) return false;
    
    const starIndex = this.getStarAtPoint(x, y);
    if (starIndex !== null) {
      this.pressedStar = starIndex;
      
      // Calculer la nouvelle valeur
      let newValue = starIndex + 1;
      
      if (this.allowHalf) {
        const star = this.starPositions[starIndex];
        const relativeX = x - (star.x - this.size / 2);
        newValue = relativeX < this.size / 2 ? starIndex + 0.5 : starIndex + 1;
      }
      
      // Ripple Material
      if (this.platform === 'material') {
        const star = this.starPositions[starIndex];
        this.ripples.push({
          star: starIndex,
          x: star.x,
          y: star.y,
          radius: 0,
          maxRadius: this.size,
          opacity: 1
        });
        this.animateRipple();
      }
      
      // Mettre à jour
      this.value = newValue;
      this.onChange(this.value);
      this.framework.redraw();
      
      // Reset pressed après animation
      setTimeout(() => {
        this.pressedStar = null;
        this.framework.redraw();
      }, this.platform === 'material' ? 100 : 150);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Gère le survol
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleHover(x, y) {
    if (this.readOnly) return;
    
    const starIndex = this.getStarAtPoint(x, y);
    
    if (starIndex !== this.hoveredStar) {
      this.hoveredStar = starIndex;
      this.framework.redraw();
    }
  }
  
  /**
   * Gère la sortie du survol
   */
  handleHoverEnd() {
    if (this.hoveredStar !== null) {
      this.hoveredStar = null;
      this.framework.redraw();
    }
  }
  
  /**
   * Obtient l'index de l'étoile à une position
   * @private
   */
  getStarAtPoint(x, y) {
    for (let i = 0; i < this.starPositions.length; i++) {
      const star = this.starPositions[i];
      const dx = x - star.x;
      const dy = y - star.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.size / 2) {
        return i;
      }
    }
    return null;
  }
  
  /**
   * Obtient la valeur hover (avec demi-étoiles)
   * @private
   */
  getHoverValue() {
    if (this.hoveredStar === null) return this.value;
    
    // Pour l'instant retourner valeur entière
    // (nécessite position X précise pour demi-étoiles)
    return this.hoveredStar + 1;
  }
  
  /**
   * Anime les ripples Material
   * @private
   */
  animateRipple() {
    const animate = () => {
      for (let ripple of this.ripples) {
        ripple.radius += ripple.maxRadius / 10;
        ripple.opacity -= 0.08;
      }
      
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      
      if (this.framework && this.framework.redraw) {
        this.framework.redraw();
      }
      
      if (this.ripples.length > 0) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Définit la valeur
   * @param {number} value - Nouvelle valeur
   */
  setValue(value) {
    this.value = Math.max(0, Math.min(this.max, value));
    this.framework.redraw();
  }
  
  /**
   * Obtient la valeur
   * @returns {number}
   */
  getValue() {
    return this.value;
  }
  
  /**
   * Vérifie si un point est dans les limites
   */
  isPointInside(x, y) {
	  // Vérifier si le clic est dans le composant
	  if (x < this.x || x > this.x + this.width || 
		  y < this.y || y > this.y + this.height) {
		return false;
	  }
	  
	  // Mode lecture seule - on ne fait rien
	  if (this.readOnly) {
		return true; // Le clic est dans le composant mais on ignore
	  }
	  
	  // Vérifier si on clique sur une étoile
	  const starIndex = this.getStarAtPoint(x, y);
	  
	  // Gestion du survol (même sans clic)
	  if (starIndex !== this.hoveredStar) {
		this.hoveredStar = starIndex;
		if (this.framework && this.framework.redraw) {
		  this.framework.redraw();
		}
	  }
	  
	  // Si on clique sur une étoile
		if (starIndex !== null) {
			// ✅ Éviter les appels multiples
			if (this._isChanging) return true;
			this._isChanging = true;
			
			this.pressedStar = starIndex;
			
			// Calculer la nouvelle valeur
			let newValue = starIndex + 1;
			
			if (this.allowHalf) {
				const star = this.starPositions[starIndex];
				const relativeX = x - (star.x - this.size / 2);
				newValue = relativeX < this.size / 2 ? starIndex + 0.5 : starIndex + 1;
			}
			
			// Ripple Material
			if (this.platform === 'material') {
				const star = this.starPositions[starIndex];
				this.ripples.push({
					star: starIndex,
					x: star.x,
					y: star.y,
					radius: 0,
					maxRadius: this.size,
					opacity: 1
				});
				this.animateRipple();
			}
			
			// Mettre à jour la valeur
			this.value = newValue;
			this.onChange(this.value);
			
			// Redessiner immédiatement
			if (this.framework && this.framework.redraw) {
				this.framework.redraw();
			}
			
			// Reset pressed après animation
			setTimeout(() => {
				this.pressedStar = null;
				// ✅ Réinitialiser le flag
				this._isChanging = false;
				if (this.framework && this.framework.redraw) {
					this.framework.redraw();
				}
			}, this.platform === 'material' ? 100 : 150);
			
			return true;
		}
	  
	  // Clic dans le composant mais pas sur une étoile
	  return true;
	}
}

export default Rating;