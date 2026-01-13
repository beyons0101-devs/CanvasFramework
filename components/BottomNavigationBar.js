import Component from '../core/Component.js';

/**
 * Barre de navigation inférieure (Material & Cupertino)
 * @class
 * @extends Component
 */
class BottomNavigationBar extends Component {
  /**
   * Crée une instance de BottomNavigationBar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.items=[]] - Items [{icon, label}]
   * @param {number} [options.selectedIndex=0] - Index sélectionné
   * @param {Function} [options.onChange] - Callback au changement
   * @param {number} [options.height] - Hauteur
   * @param {string} [options.bgColor] - Couleur de fond
   * @param {string} [options.selectedColor] - Couleur sélectionnée
   * @param {string} [options.unselectedColor] - Couleur non sélectionnée
   */
  constructor(framework, options = {}) {
    const height = options.height || (framework.platform === 'material' ? 56 : 50);
    
    super(framework, {
      x: 0,
      y: framework.height - height,
      width: framework.width,
      height: height,
      ...options
    });
    
    this.items = options.items || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    
    // Couleurs selon la plateforme
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#FFFFFF';
      this.selectedColor = options.selectedColor || '#6200EE';
      this.unselectedColor = options.unselectedColor || '#757575';
      this.rippleColor = 'rgba(98, 0, 238, 0.2)';
    } else {
      // iOS : background transparent avec blur
      this.bgColor = options.bgColor || 'rgba(248, 248, 248, 0.95)';
      this.selectedColor = options.selectedColor || '#007AFF';
      this.unselectedColor = options.unselectedColor || '#8E8E93';
    }
    
    // Ripple effect (Material)
    this.ripples = [];
    this.animationFrame = null;
    this.lastAnimationTime = 0;
    
    // Animation de l'indicateur (iOS)
    this.indicatorX = 0;
    this.targetIndicatorX = 0;
    this.animatingIndicator = false;
    
    this.onPress = this.handlePress.bind(this);
    
    // Initialiser la position de l'indicateur
    this.updateIndicatorPosition();
  }

  /**
   * Démarrer l'animation des ripples
   * @private
   */
  startRippleAnimation() {
    const animate = (timestamp) => {
      if (!this.lastAnimationTime) this.lastAnimationTime = timestamp;
      const deltaTime = timestamp - this.lastAnimationTime;
      this.lastAnimationTime = timestamp;

      let needsUpdate = false;

      // Mettre à jour chaque ripple
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        
        // Animer le rayon (expansion)
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += (ripple.maxRadius / 300) * deltaTime;
          needsUpdate = true;
        }

        // Animer l'opacité (fade out)
        if (ripple.radius >= ripple.maxRadius * 0.4) {
          ripple.opacity -= (0.003 * deltaTime);
          if (ripple.opacity < 0) ripple.opacity = 0;
          needsUpdate = true;
        }

        // Supprimer les ripples terminés
        if (ripple.opacity <= 0 && ripple.radius >= ripple.maxRadius * 0.95) {
          this.ripples.splice(i, 1);
          needsUpdate = true;
        }
      }

      // Redessiner si nécessaire
      if (needsUpdate) {
        this.requestRender();
      }

      // Continuer l'animation
      if (this.ripples.length > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        this.lastAnimationTime = 0;
      }
    };

    if (this.ripples.length > 0 && !this.animationFrame) {
      this.animationFrame = requestAnimationFrame(animate);
    }
  }

  /**
   * Demander un redessin
   * @private
   */
  requestRender() {
    if (this.framework && this.framework.requestRender) {
      this.framework.requestRender();
    }
  }

  /**
   * Nettoyer l'animation lors de la destruction
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    super.destroy();
  }

  /**
   * Met à jour la position de l'indicateur iOS
   * @private
   */
  updateIndicatorPosition() {
    const itemWidth = this.width / this.items.length;
    this.targetIndicatorX = this.selectedIndex * itemWidth;
    
    if (!this.animatingIndicator) {
      this.indicatorX = this.targetIndicatorX;
    }
  }

  /**
   * Anime l'indicateur iOS
   * @private
   */
  animateIndicator() {
    this.animatingIndicator = true;
    const startTime = performance.now();
    const duration = 300; // 300ms d'animation
    const startX = this.indicatorX;
    const endX = this.targetIndicatorX;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      this.indicatorX = startX + (endX - startX) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
        this.requestRender();
      } else {
        this.indicatorX = endX;
        this.animatingIndicator = false;
        this.requestRender();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Dessine la barre de navigation
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Bordure/Ombre supérieure
    if (this.platform === 'material') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = -2;
      ctx.fillRect(this.x, this.y, this.width, 1);
      ctx.shadowColor = 'transparent';
    } else {
      // iOS : fine ligne de séparation
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y);
      ctx.stroke();
    }
    
    // Items
    const itemWidth = this.width / this.items.length;
    
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const itemX = this.x + i * itemWidth;
      const isSelected = i === this.selectedIndex;
      const color = isSelected ? this.selectedColor : this.unselectedColor;
      
      // iOS : Indicateur de sélection (fond arrondi)
      if (this.platform === 'cupertino' && isSelected) {
        ctx.fillStyle = `${this.selectedColor}15`;
        const indicatorWidth = 60;
        const indicatorHeight = 32;
        const indicatorX = itemX + itemWidth / 2 - indicatorWidth / 2;
        const indicatorY = this.y + 6;
        
        ctx.beginPath();
        this.roundRect(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, 16);
        ctx.fill();
      }
      
      // Icône
      const iconY = this.platform === 'material' ? this.y + 12 : this.y + 8;
      this.drawIcon(ctx, item.icon, itemX + itemWidth / 2, iconY, color, isSelected);
      
      // Label
      ctx.fillStyle = color;
      const fontSize = this.platform === 'material' ? 12 : 10;
      ctx.font = `${isSelected && this.platform === 'material' ? 'bold ' : ''}${fontSize}px -apple-system, Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelY = this.platform === 'material' ? this.y + 34 : this.y + 30;
      ctx.fillText(item.label, itemX + itemWidth / 2, labelY);
    }
    
    // Ripples (Material) - DESSINER APRÈS LES ÉLÉMENTS
    if (this.platform === 'material') {
      this.drawRipples(ctx);
    }
    
    ctx.restore();
  }

  /**
   * Dessine les ripples (Material)
   * @private
   */
  drawRipples(ctx) {
    // Sauvegarder le contexte
    ctx.save();
    
    // Créer un masque de clipping pour limiter les ripples à la barre
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();
    
    for (let ripple of this.ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = this.rippleColor;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Restaurer le contexte
    ctx.restore();
  }

  /**
   * Dessine une icône
   * @private
   */
  drawIcon(ctx, icon, x, y, color, isSelected) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch(icon) {
      case 'home':
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x - 10, y + 10);
        ctx.lineTo(x - 10, y + 18);
        ctx.lineTo(x + 10, y + 18);
        ctx.lineTo(x + 10, y + 10);
        ctx.closePath();
        if (isSelected) ctx.fill();
        else ctx.stroke();
        break;
      
      case 'search':
        ctx.beginPath();
        ctx.arc(x - 2, y + 6, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 11);
        ctx.lineTo(x + 9, y + 16);
        ctx.stroke();
        break;
      
      case 'favorite':
        ctx.beginPath();
        ctx.moveTo(x, y + 3);
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
          const radius = i % 2 === 0 ? 9 : 4;
          ctx.lineTo(x + Math.cos(angle) * radius, y + 10 + Math.sin(angle) * radius);
        }
        ctx.closePath();
        if (isSelected) ctx.fill();
        else ctx.stroke();
        break;
      
      case 'person':
        ctx.beginPath();
        ctx.arc(x, y + 6, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y + 20, 9, Math.PI, 0, true);
        ctx.stroke();
        break;
      
      case 'settings':
        ctx.beginPath();
        ctx.arc(x, y + 10, 5, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI / 2) - Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * 7, y + 10 + Math.sin(angle) * 7);
          ctx.lineTo(x + Math.cos(angle) * 11, y + 10 + Math.sin(angle) * 11);
          ctx.stroke();
        }
        break;
    }
  }

  /**
   * Dessine un rectangle arrondi
   * @private
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  /**
   * Vérifie si un point est dans les limites
   */
  isPointInside(x, y) {
    return y >= this.y && y <= this.y + this.height;
  }

  /**
   * Gère la pression (clic)
   * @private
   */
  handlePress(x, y) {
    // Convertir les coordonnées absolues en coordonnées relatives à la barre
    const relativeX = x - this.x;
    const relativeY = y - this.y;
    
    // Vérifier si on est dans la barre
    if (relativeY >= 0 && relativeY <= this.height) {
      const itemWidth = this.width / this.items.length;
      const index = Math.floor(relativeX / itemWidth);
      
      if (index >= 0 && index < this.items.length && index !== this.selectedIndex) {
        // Ripple effect (Material)
        if (this.platform === 'material') {
          // Calculer la taille maximale du ripple (ne pas dépasser la hauteur de la barre)
          const maxRippleRadius = Math.min(itemWidth * 0.6, this.height * 0.8);
          
          this.ripples.push({
            x: this.x + (index + 0.5) * itemWidth, // Coordonnée absolue
            y: this.y + this.height / 2, // Coordonnée absolue
            radius: 0,
            maxRadius: maxRippleRadius,
            opacity: 1,
            createdAt: performance.now()
          });
          
          // Démarrer l'animation si elle n'est pas en cours
          if (!this.animationFrame) {
            this.startRippleAnimation();
          }
          
          // Forcer un redessin
          this.requestRender();
        }
        
        this.selectedIndex = index;
        this.updateIndicatorPosition();
        
        // Animer l'indicateur (iOS)
        if (this.platform === 'cupertino') {
          this.animateIndicator();
        }
        
        if (this.onChange) {
          this.onChange(index, this.items[index]);
        }
        
        this.requestRender();
      }
    }
  }
}

export default BottomNavigationBar;