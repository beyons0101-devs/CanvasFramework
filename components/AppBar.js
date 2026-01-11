import Component from '../core/Component.js';

/**
 * Barre d'application supérieure (Material & Cupertino)
 * @class
 * @extends Component
 */
class AppBar extends Component {
  /**
   * Crée une instance de AppBar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title=''] - Titre
   * @param {string} [options.leftIcon] - Icône gauche ('menu' ou 'back')
   * @param {string} [options.rightIcon] - Icône droite ('search' ou 'more')
   * @param {Function} [options.onLeftClick] - Callback gauche
   * @param {Function} [options.onRightClick] - Callback droit
   * @param {number} [options.height] - Hauteur (auto selon platform)
   * @param {string} [options.bgColor] - Couleur de fond
   * @param {string} [options.textColor] - Couleur du texte
   * @param {number} [options.elevation=4] - Élévation (Material)
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: options.height || (framework.platform === 'material' ? 56 : 44),
      ...options
    });
    
    this.title = options.title || '';
    this.leftIcon = options.leftIcon || null;
    this.rightIcon = options.rightIcon || null;
    this.onLeftClick = options.onLeftClick;
    this.onRightClick = options.onRightClick;
    this.platform = framework.platform;
    
    // Couleurs selon la plateforme
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#6200EE';
      this.textColor = options.textColor || '#FFFFFF';
      this.elevation = options.elevation !== undefined ? options.elevation : 4;
    } else {
      // iOS : Transparent ou blanc avec blur effect (simulé)
      this.bgColor = options.bgColor || 'rgba(248, 248, 248, 0.95)';
      this.textColor = options.textColor || '#000000';
      this.elevation = 0;
    }
    
    // Ripple effect (Material uniquement)
    this.ripples = [];
    this.leftPressed = false;
    this.rightPressed = false;
    
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Dessine l'AppBar
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre (Material uniquement)
    if (this.platform === 'material' && this.elevation > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = this.elevation * 2;
      ctx.shadowOffsetY = this.elevation / 2;
    }
    
    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Bordure inférieure (iOS uniquement)
    if (this.platform === 'cupertino') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height - 0.5);
      ctx.lineTo(this.x + this.width, this.y + this.height - 0.5);
      ctx.stroke();
    }
    
    // Ripples pour les boutons (Material)
    if (this.platform === 'material') {
      this.drawRipples(ctx);
    }
    
    // Overlay pressed pour iOS
    if (this.platform === 'cupertino') {
      if (this.leftPressed && this.leftIcon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(28, this.y + this.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.rightPressed && this.rightIcon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(this.width - 28, this.y + this.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Titre
    ctx.fillStyle = this.textColor;
    const titleAlign = this.platform === 'material' && this.leftIcon ? 'left' : 'center';
    const titleX = titleAlign === 'left' ? 72 : this.width / 2;
    ctx.font = `${this.platform === 'material' ? 'bold ' : ''}20px -apple-system, Roboto, sans-serif`;
    ctx.textAlign = titleAlign;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, titleX, this.y + this.height / 2);
    
    // Icône gauche
    if (this.leftIcon) {
      const iconColor = this.platform === 'cupertino' ? '#007AFF' : this.textColor;
      if (this.leftIcon === 'menu') {
        this.drawMenuIcon(ctx, 16, this.y + this.height / 2, iconColor);
      } else if (this.leftIcon === 'back') {
        this.drawBackIcon(ctx, 16, this.y + this.height / 2, iconColor);
      }
    }
    
    // Icône droite
    if (this.rightIcon) {
      const iconColor = this.platform === 'cupertino' ? '#007AFF' : this.textColor;
      if (this.rightIcon === 'search') {
        this.drawSearchIcon(ctx, this.width - 36, this.y + this.height / 2, iconColor);
      } else if (this.rightIcon === 'more') {
        this.drawMoreIcon(ctx, this.width - 36, this.y + this.height / 2, iconColor);
      }
    }
    
    ctx.restore();
  }

  /**
   * Dessine les ripples
   * @private
   */
  drawRipples(ctx) {
    for (let ripple of this.ripples) {
      ctx.save();
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Anime les effets ripple
   * @private
   */
  animateRipple() {
    const animate = () => {
      let hasActiveRipples = false;
      
      for (let ripple of this.ripples) {
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += ripple.maxRadius / 15;
          hasActiveRipples = true;
        }
        
        if (ripple.radius >= ripple.maxRadius * 0.5) {
          ripple.opacity -= 0.05;
        }
      }
      
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      
      if (hasActiveRipples) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * Dessine l'icône menu (hamburger)
   * @private
   */
  drawMenuIcon(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 8 + i * 8);
      ctx.lineTo(x + 24, y - 8 + i * 8);
      ctx.stroke();
    }
  }

  /**
   * Dessine l'icône retour
   * @private
   */
  drawBackIcon(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 10);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x + 16, y + 10);
    ctx.stroke();
  }

  /**
   * Dessine l'icône recherche
   * @private
   */
  drawSearchIcon(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x + 8, y - 2, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 4);
    ctx.lineTo(x + 20, y + 10);
    ctx.stroke();
  }

  /**
   * Dessine l'icône plus (3 dots)
   * @private
   */
  drawMoreIcon(ctx, x, y, color) {
    ctx.fillStyle = color;
    const spacing = this.platform === 'material' ? 10 : 8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + 12, y - spacing + i * spacing, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Vérifie si un point est dans les zones cliquables
   */
  isPointInside(x, y) {
    if (y >= this.y && y <= this.y + this.height) {
      if (this.leftIcon && x >= 0 && x <= 56) return true;
      if (this.rightIcon && x >= this.width - 56 && x <= this.width) return true;
    }
    return false;
  }

  /**
   * Gère la pression (clic)
   * @private
   */
  handlePress(x, y) {
    const adjustedY = y;
    
    if (adjustedY >= this.y && adjustedY <= this.y + this.height) {
      // Bouton gauche
      if (this.leftIcon && x >= 0 && x <= 56) {
        // Ripple effect (Material)
        if (this.platform === 'material') {
          this.ripples.push({
            x: 28,
            y: this.y + this.height / 2,
            radius: 0,
            maxRadius: 28,
            opacity: 1
          });
          this.animateRipple();
        } else {
          // iOS pressed state
          this.leftPressed = true;
          setTimeout(() => { this.leftPressed = false; }, 150);
        }
        
        if (this.onLeftClick) this.onLeftClick();
        return true;
      }
      
      // Bouton droit
      if (this.rightIcon && x >= this.width - 56 && x <= this.width) {
        // Ripple effect (Material)
        if (this.platform === 'material') {
          this.ripples.push({
            x: this.width - 28,
            y: this.y + this.height / 2,
            radius: 0,
            maxRadius: 28,
            opacity: 1
          });
          this.animateRipple();
        } else {
          // iOS pressed state
          this.rightPressed = true;
          setTimeout(() => { this.rightPressed = false; }, 150);
        }
        
        if (this.onRightClick) this.onRightClick();
        return true;
      }
    }
    return false;
  }
}

export default AppBar;