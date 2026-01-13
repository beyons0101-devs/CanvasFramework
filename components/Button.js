import Component from '../core/Component.js';

/**
 * Bouton cliquable avec variantes Material et Cupertino
 * @class
 * @extends Component
 * 
 * Types Material: 'filled', 'outlined', 'text', 'elevated', 'tonal'
 * Types Cupertino: 'filled', 'gray', 'tinted', 'bordered', 'plain'
 * Shapes: 'rounded', 'square', 'pill' (très arrondi)
 */
class Button extends Component {
  /**
   * Crée une instance de Button
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.text='Button'] - Texte
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {string} [options.type] - Type de bouton (auto selon platform)
   * @param {string} [options.shape='rounded'] - Forme: 'rounded', 'square', 'pill'
   * @param {string} [options.bgColor] - Couleur personnalisée
   * @param {string} [options.textColor] - Couleur du texte personnalisée
   * @param {number} [options.elevation=2] - Élévation (Material elevated)
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.text = options.text || 'Button';
    this.fontSize = options.fontSize || 16;
    this.platform = framework.platform;
    this.shape = options.shape || 'rounded';
    
    // Définir le type de bouton selon la plateforme
    if (this.platform === 'material') {
      this.type = options.type || 'filled';
      this.setupMaterialStyle(options);
    } else {
      this.type = options.type || 'filled';
      this.setupCupertinoStyle(options);
    }
    
    // Effets ripple (Material uniquement)
    this.ripples = [];
    
    // Bind
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Configure le style Material Design
   * @private
   */
  setupMaterialStyle(options) {
    const baseColor = options.bgColor || '#6200EE';
    this.elevation = options.elevation || 2;
    
    switch (this.type) {
      case 'filled':
        this.bgColor = baseColor;
        this.textColor = options.textColor || '#FFFFFF';
        this.borderWidth = 0;
        this.rippleColor = 'rgba(255, 255, 255, 0.3)';
        break;
        
      case 'outlined':
        this.bgColor = 'transparent';
        this.textColor = options.textColor || baseColor;
        this.borderColor = baseColor;
        this.borderWidth = 1;
        this.rippleColor = this.hexToRgba(baseColor, 0.2);
        this.elevation = 0;
        break;
        
      case 'text':
        this.bgColor = 'transparent';
        this.textColor = options.textColor || baseColor;
        this.borderWidth = 0;
        this.rippleColor = this.hexToRgba(baseColor, 0.2);
        this.elevation = 0;
        break;
        
      case 'elevated':
        this.bgColor = options.bgColor || '#FFFFFF';
        this.textColor = options.textColor || baseColor;
        this.borderWidth = 0;
        this.rippleColor = this.hexToRgba(baseColor, 0.2);
        this.elevation = options.elevation || 4;
        break;
        
      case 'tonal':
        this.bgColor = this.hexToRgba(baseColor, 0.3);
        this.textColor = options.textColor || baseColor;
        this.borderWidth = 0;
        this.rippleColor = this.hexToRgba(baseColor, 0.3);
        this.elevation = 0;
        break;
    }
  }
  
  /**
   * Configure le style Cupertino (iOS)
   * @private
   */
  setupCupertinoStyle(options) {
    const baseColor = options.bgColor || '#007AFF';
    
    switch (this.type) {
      case 'filled':
        this.bgColor = baseColor;
        this.textColor = options.textColor || '#FFFFFF';
        this.borderWidth = 0;
        break;
        
      case 'gray':
        this.bgColor = 'rgba(120, 120, 128, 0.16)';
        this.textColor = options.textColor || baseColor;
        this.borderWidth = 0;
        break;
        
      case 'tinted':
        this.bgColor = this.hexToRgba(baseColor, 0.2);
        this.textColor = options.textColor || baseColor;
        this.borderWidth = 0;
        break;
        
      case 'plain':
        this.bgColor = 'transparent';
        this.textColor = options.textColor || baseColor;
        this.borderWidth = 0;
        break;
    }
  }
  
  /**
   * Retourne le rayon des coins selon la forme
   * @returns {number} Rayon en pixels
   * @private
   */
  getBorderRadius() {
    switch (this.shape) {
      case 'square':
        return 0;
      case 'rounded':
      default:
        return this.platform === 'material' ? 4 : 10;
    }
  }
  
  /**
   * Gère la pression sur le bouton
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    if (this.platform === 'material') {
      const adjustedY = y - this.framework.scrollOffset;
      this.ripples.push({
        x: x - this.x,
        y: adjustedY - this.y,
        radius: 0,
        maxRadius: Math.max(this.width, this.height) * 1.5,
        opacity: 1
      });
      this.animateRipple();
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
   * Dessine le bouton
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const radius = this.getBorderRadius();
    
    // Ombre Material (elevated/filled)
    if (this.platform === 'material' && this.elevation > 0 && !this.pressed) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = this.elevation * 2;
      ctx.shadowOffsetY = this.elevation;
    }
    
    // Background
    if (this.bgColor !== 'transparent') {
      ctx.fillStyle = this.pressed ? this.darkenColor(this.bgColor) : this.bgColor;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.fill();
    }
    
    // Réinitialiser l'ombre
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Bordure
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.stroke();
    }
    
    // Ripple effect (Material)
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.clip();
      
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Effet pressed pour iOS (overlay sombre)
    if (this.platform === 'cupertino' && this.pressed && this.bgColor !== 'transparent') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.fill();
    }
    
    // Texte
    ctx.fillStyle = this.pressed && this.platform === 'cupertino' 
      ? this.darkenColor(this.textColor) 
      : this.textColor;
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    
    ctx.restore();
  }

  /**
   * Dessine un rectangle avec coins arrondis
   * @private
   */
  roundRect(ctx, x, y, width, height, radius) {
    if (radius === 0) {
      ctx.rect(x, y, width, height);
      return;
    }
    
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
   * Assombrit une couleur
   * @private
   */
  darkenColor(color) {
    if (color === 'transparent') return 'rgba(0, 0, 0, 0.1)';
    
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      return color.replace(/[\d.]+\)$/g, match => {
        const val = parseFloat(match);
        return `${Math.max(0, val - 0.1)})`;
      });
    }
    
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  }

  /**
   * Convertit hex en RGB
   * @private
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Convertit hex en RGBA avec alpha
   * @private
   */
  hexToRgba(hex, alpha) {
    const rgb = this.hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  /**
   * Vérifie si un point est dans les limites
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Button;