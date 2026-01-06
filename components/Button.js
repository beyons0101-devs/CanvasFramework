import Component from '../core/Component.js';

/**
 * Bouton cliquable
 * @class
 * @extends Component
 * @property {string} text - Texte du bouton
 * @property {number} fontSize - Taille de la police
 * @property {string} platform - Plateforme
 * @property {string} bgColor - Couleur de fond
 * @property {string} textColor - Couleur du texte
 * @property {string} rippleColor - Couleur du ripple
 * @property {number} elevation - Élévation (ombre)
 * @property {Array} ripples - Effets ripple
 */
class Button extends Component {
  /**
   * Crée une instance de Button
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.text='Button'] - Texte
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {string} [options.bgColor] - Couleur de fond (auto selon platform)
   * @param {string} [options.textColor] - Couleur du texte (auto selon platform)
   * @param {number} [options.elevation=2] - Élévation (Material)
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.text = options.text || 'Button';
    this.fontSize = options.fontSize || 16;
    this.platform = framework.platform;
    
    // Couleurs selon la plateforme
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#6200EE';
      this.textColor = options.textColor || '#FFFFFF';
      this.rippleColor = 'rgba(255, 255, 255, 0.3)';
      this.elevation = options.elevation || 2;
    } else {
      this.bgColor = options.bgColor || '#007AFF';
      this.textColor = options.textColor || '#FFFFFF';
      this.borderRadius = 10;
    }
    
    // Effet Ripple
    this.ripples = [];
    
    // Bind des méthodes
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Gère la pression sur le bouton
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    // Créer un ripple au point de clic
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
      
      // Nettoyer les ripples terminés
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
    
    if (this.platform === 'material') {
      // Material Design
      // Ombre (elevation)
      if (this.elevation > 0 && !this.pressed) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = this.elevation * 2;
        ctx.shadowOffsetY = this.elevation;
      }
      
      ctx.fillStyle = this.pressed ? this.darkenColor(this.bgColor) : this.bgColor;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 4);
      ctx.fill();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Clipping pour les ripples
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 4);
      ctx.clip();
      
      // Dessiner les ripples
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      
    } else {
      // Cupertino (iOS)
      ctx.fillStyle = this.pressed ? this.darkenColor(this.bgColor) : this.bgColor;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.fill();
    }
    
    // Texte
    ctx.fillStyle = this.textColor;
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    
    ctx.restore();
  }

  /**
   * Dessine un rectangle avec coins arrondis
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} width - Largeur
   * @param {number} height - Hauteur
   * @param {number} radius - Rayon des coins
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
   * Assombrit une couleur
   * @param {string} color - Couleur hexadécimale
   * @returns {string} Couleur assombrie
   * @private
   */
  darkenColor(color) {
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  }

  /**
   * Convertit une couleur hex en RGB
   * @param {string} hex - Couleur hexadécimale
   * @returns {{r: number, g: number, b: number}} Objet RGB
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
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le bouton
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Button;