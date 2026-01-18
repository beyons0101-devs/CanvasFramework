import Component from '../core/Component.js';

/**
 * Onglets de navigation avec support Material & Cupertino
 * @class
 * @extends Component
 */
class Tabs extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.tabs = options.tabs || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    this.height = options.height || 56;
    
    this.indicatorColor = options.indicatorColor || 
      (this.platform === 'material' ? '#6200EE' : '#007AFF');
    this.textColor = options.textColor || 
      (this.platform === 'material' ? '#000000' : '#8E8E93');
    this.selectedTextColor = options.selectedTextColor || this.indicatorColor;
    
    // Ripple pour Material
    this.ripples = [];
    this.animationFrame = null;
    this.lastAnimationTime = 0;
    
    // Animation pour Cupertino
    this.pressedTabIndex = -1;
    this.pressAnimation = 0;
    
    // ✅ Structure: tableau de tableaux d'enfants
    // tabChildren[0] = [enfants du tab 0]
    // tabChildren[1] = [enfants du tab 1]
    this.tabChildren = this.tabs.map(() => []);
    
    // ✅ Configuration: nombre d'enfants par tab
    // Si défini, distribue automatiquement les enfants
    // Ex: childrenPerTab = [3, 2] => 3 enfants pour tab 0, 2 pour tab 1
    this.childrenPerTab = options.childrenPerTab || null;
    this.currentTabIndex = 0;
    this.childAddCount = 0; // Compteur d'enfants ajoutés
    
    // Gestionnaire de clic
    this.onPress = this.handlePress.bind(this);
    
    // Position par défaut
    this.position = options.position || (this.platform === 'cupertino' ? 'bottom' : 'top');
    
    if (this.position === 'bottom' && !options.y) {
      this.y = framework.height - this.height;
    } else if (this.position === 'top' && !options.y) {
      this.y = options.appbar || 0;
    }
    
    // Zone de contenu (sous les tabs)
    this.contentY = this.y + this.height;
    this.contentHeight = framework.height - this.height;
  }

  /**
   * ✅ Définit le tab actuel pour l'ajout d'enfants (appelé par UIBuilder)
   * @param {number} tabIndex - Index du tab
   */
  setCurrentTab(tabIndex) {
    if (tabIndex >= 0 && tabIndex < this.tabChildren.length) {
      this.currentTabIndex = tabIndex;
    }
  }

  /**
   * ✅ Ajoute un enfant au tab en cours
   * Distribution automatique: divise les enfants équitablement entre les tabs
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    // Coordonnées relatives à la zone de contenu
    child.x = child.x || 0;
    child.y = child.y || 0;
    
    // Dimensions par défaut
    if (!child.width) child.width = this.framework.width;
    
    // Marquer l'enfant comme appartenant à ce Tabs
    child.parentTabs = this;
    
    // ✅ Calculer quel tab doit recevoir cet enfant
    // On distribue équitablement les enfants entre les tabs
    const totalChildren = this.tabChildren.reduce((sum, arr) => sum + arr.length, 0);
    const childrenPerTab = Math.ceil(totalChildren / this.tabs.length);
    
    // Trouver le premier tab qui n'est pas encore plein
    let targetTabIndex = 0;
    for (let i = 0; i < this.tabChildren.length; i++) {
      if (this.tabChildren[i].length < childrenPerTab) {
        targetTabIndex = i;
        break;
      }
      // Si tous les tabs ont childrenPerTab enfants, recommencer à 0
      if (i === this.tabChildren.length - 1) {
        targetTabIndex = totalChildren % this.tabs.length;
      }
    }
    
    // Ajouter au tableau du tab calculé
    this.tabChildren[targetTabIndex].push(child);
    
    // Visibilité selon le tab sélectionné
    child.visible = (targetTabIndex === this.selectedIndex);
    
    return child;
  }

  /**
   * ✅ Met à jour la visibilité des enfants selon l'onglet sélectionné
   */
  updateChildrenVisibility() {
    this.tabChildren.forEach((children, tabIdx) => {
      const isVisible = (tabIdx === this.selectedIndex);
      children.forEach(child => {
        child.visible = isVisible;
      });
    });
  }

  /**
   * ✅ Retourne tous les enfants du tab sélectionné
   */
  getActiveChildren() {
    return this.tabChildren[this.selectedIndex] || [];
  }

  handlePress(x, y) {
    // D'abord vérifier les clics sur les enfants
    if (y > this.y + this.height && this.checkChildClick(x, y)) {
      return;
    }
    
    // Ensuite vérifier les clics sur la barre de tabs
    if (!this.isPointInside(x, y)) return;
    
    const tabWidth = this.width / this.tabs.length;
    const index = Math.floor((x - this.x) / tabWidth);
    
    if (index < 0 || index >= this.tabs.length) return;
    
    // Ripple pour Material
    if (this.platform === 'material') {
      const rippleCenterX = this.x + index * tabWidth + tabWidth / 2;
      const maxRippleRadius = Math.min(tabWidth * 0.6, this.height * 0.8);
      
      this.ripples.push({
        x: rippleCenterX,
        y: this.y + this.height / 2,
        radius: 0,
        maxRadius: maxRippleRadius,
        opacity: 1
      });
      
      if (!this.animationFrame) this.startRippleAnimation();
    }
    // Animation Cupertino
    else if (this.platform === 'cupertino') {
      this.pressedTabIndex = index;
      this.pressAnimation = 1;
      this.requestRender();
      setTimeout(() => this.animatePressRelease(), 100);
    }
    
    // Changement d'onglet
    if (index !== this.selectedIndex) {
      this.selectedIndex = index;
      this.updateChildrenVisibility();
      if (this.onChange) this.onChange(index, this.tabs[index]);
    }
    
    this.requestRender();
  }

  /**
   * ✅ Vérifie les clics sur les enfants du tab actif
   */
  checkChildClick(x, y) {
    const adjustedY = y - (this.framework.scrollOffset || 0);
    const activeChildren = this.getActiveChildren();
    
    // Parcourir en ordre inverse (derniers ajoutés = au dessus)
    for (let i = activeChildren.length - 1; i >= 0; i--) {
      const child = activeChildren[i];
      
      if (!child.visible) continue;
      
      // Calculer les coordonnées absolues de l'enfant
      const childX = this.x + child.x;
      const childY = this.contentY + child.y;
      
      // Vérifier si le clic est dans l'enfant
      if (adjustedY >= childY && 
          adjustedY <= childY + child.height &&
          x >= childX && 
          x <= childX + child.width) {
        
        // Si l'enfant a un onClick ou onPress, le déclencher
        if (child.onClick) {
          child.onClick();
          return true;
        } else if (child.onPress) {
          child.onPress(x, adjustedY);
          return true;
        }
      }
    }
    
    return false;
  }

  animatePressRelease() {
    let startTime = null;
    const duration = 150;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      this.pressAnimation = 1 - progress;
      this.requestRender();
      
      if (progress < 1) requestAnimationFrame(animate);
      else {
        this.pressAnimation = 0;
        this.pressedTabIndex = -1;
      }
    };
    
    requestAnimationFrame(animate);
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }

  startRippleAnimation() {
    const animate = (timestamp) => {
      if (!this.lastAnimationTime) this.lastAnimationTime = timestamp;
      const deltaTime = timestamp - this.lastAnimationTime;
      this.lastAnimationTime = timestamp;
      
      let needsUpdate = false;
      
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        
        if (ripple.radius < ripple.maxRadius) 
          ripple.radius += (ripple.maxRadius / 300) * deltaTime;
        
        if (ripple.radius >= ripple.maxRadius * 0.4) {
          ripple.opacity -= (0.003 * deltaTime);
          if (ripple.opacity < 0) ripple.opacity = 0;
        }
        
        if (ripple.opacity <= 0 && ripple.radius >= ripple.maxRadius * 0.95) 
          this.ripples.splice(i, 1);
        
        needsUpdate = true;
      }
      
      if (needsUpdate) this.requestRender();
      
      if (this.ripples.length > 0) 
        this.animationFrame = requestAnimationFrame(animate);
      else 
        this.animationFrame = null;
    };
    
    if (this.ripples.length && !this.animationFrame) 
      this.animationFrame = requestAnimationFrame(animate);
  }

  requestRender() {
    if (this.framework && this.framework.requestRender) 
      this.framework.requestRender();
  }

  /**
   * ✅ Dessine les tabs et les enfants du tab actif
   */
  draw(ctx) {
    ctx.save();
    
    // ===== DESSINER LA BARRE DE TABS =====
    
    // Background
    ctx.fillStyle = this.platform === 'material' ? '#FFF' : '#F2F2F7';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    if (this.platform === 'material') {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
    }
    
    const tabWidth = this.width / this.tabs.length;
    
    // Ripples
    if (this.platform === 'material') this.drawRipples(ctx, tabWidth);
    
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const tabX = this.x + i * tabWidth;
      const isSelected = i === this.selectedIndex;
      
      // Cupertino pressed effect
      if (this.platform === 'cupertino' && i === this.pressedTabIndex) {
        ctx.fillStyle = `rgba(0,122,255,${0.1 * this.pressAnimation})`;
        ctx.fillRect(tabX, this.y, tabWidth, this.height);
      }
      
      // Indicators
      if (this.platform === 'cupertino' && isSelected) {
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(tabX + tabWidth/2 - 15, this.y + this.height - 2, 30, 2);
      }
      
      const color = isSelected ? this.selectedTextColor : this.textColor;
      
      // Icon
      if (tab.icon) {
        ctx.font = '24px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        const iconY = this.platform === 'material' ? this.y + 18 : this.y + 20;
        ctx.fillText(tab.icon, tabX + tabWidth/2, iconY);
      }
      
      // Label
      const fontSize = this.platform === 'material' ? 14 : 12;
      const fontWeight = isSelected ? '600' : '400';
      ctx.font = `${fontWeight} ${fontSize}px -apple-system, Roboto, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const labelY = this.platform === 'material' 
        ? (tab.icon ? this.y + 36 : this.y + this.height / 2)
        : (tab.icon ? this.y + 42 : this.y + this.height / 2);
      
      ctx.fillText(tab.label, tabX + tabWidth/2, labelY);
      
      // Material indicator
      if (isSelected && this.platform === 'material') {
        ctx.fillStyle = this.indicatorColor;
        ctx.fillRect(tabX, this.y + this.height - 3, tabWidth, 3);
      }
    }
    
    ctx.restore();
    
    // ===== DESSINER LES ENFANTS DU TAB ACTIF =====
    const activeChildren = this.getActiveChildren();
    
    for (let child of activeChildren) {
      if (child.visible) {
        ctx.save();
        
        // Sauvegarder les coordonnées originales
        const originalX = child.x;
        const originalY = child.y;
        
        // Ajuster les coordonnées pour être absolues
        child.x = this.x + originalX;
        child.y = this.contentY + originalY;
        
        // Dessiner l'enfant
        child.draw(ctx);
        
        // Restaurer les coordonnées originales
        child.x = originalX;
        child.y = originalY;
        
        ctx.restore();
      }
    }
  }

  drawRipples(ctx, tabWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();
    
    for (let ripple of this.ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = this.indicatorColor;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (super.destroy) super.destroy();
  }
}

export default Tabs;