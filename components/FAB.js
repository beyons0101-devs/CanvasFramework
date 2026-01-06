import Component from '../core/Component.js';
/**
 * Bouton d'action flottant
 * @class
 * @extends Component
 * @property {string} icon - Icône du bouton
 * @property {boolean} extended - Mode étendu (avec texte)
 * @property {string} text - Texte (en mode étendu)
 * @property {string} platform - Plateforme
 * @property {number} size - Taille du bouton
 * @property {string} bgColor - Couleur de fond
 * @property {string} iconColor - Couleur de l'icône
 * @property {Array} ripples - Effets ripple
 */
class FAB extends Component {
  /**
   * Crée une instance de FAB
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.icon='+'] - Icône
   * @param {boolean} [options.extended=false] - Mode étendu
   * @param {string} [options.text=''] - Texte (mode étendu)
   * @param {number} [options.size=56] - Taille
   * @param {string} [options.bgColor] - Couleur (auto selon platform)
   * @param {string} [options.iconColor='#FFFFFF'] - Couleur de l'icône
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.icon = options.icon || '+';
    this.extended = options.extended || false;
    this.text = options.text || '';
    this.platform = framework.platform;
    this.size = options.size || 56;
    this.bgColor = options.bgColor || (framework.platform === 'material' ? '#6200EE' : '#007AFF');
    this.iconColor = options.iconColor || '#FFFFFF';
    
    // Position par défaut en bas à droite
    this.x = options.x !== undefined ? options.x : framework.width - this.size - 16;
    this.y = options.y !== undefined ? options.y : framework.height - this.size - 80;
    
    // Si extended, ajuster la largeur
    if (this.extended && this.text) {
      const ctx = framework.ctx;
      ctx.font = 'bold 14px -apple-system, sans-serif';
      const textWidth = ctx.measureText(this.text).width;
      this.width = this.size + textWidth + 24;
    } else {
      this.width = this.size;
    }
    this.height = this.size;
    
    // Effet ripple
    this.ripples = [];
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Gère la pression sur le FAB
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
        maxRadius: this.width * 1.2,
        opacity: 1
      });
      this.animateRipple();
    }
  }
  
  /**
   * Anime l'effet ripple
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
   * Dessine le FAB
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    
    // Background
    ctx.fillStyle = this.pressed ? this.darkenColor(this.bgColor) : this.bgColor;
    ctx.beginPath();
    
    if (this.extended) {
      // Forme étendue (pilule)
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.height / 2);
    } else {
      // Cercle
      ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
    }
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Clipping pour les ripples
    ctx.save();
    ctx.beginPath();
    if (this.extended) {
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.height / 2);
    } else {
      ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
    }
    ctx.clip();
    
    // Dessiner les ripples
    for (let ripple of this.ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Icône
    ctx.fillStyle = this.iconColor;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (this.extended && this.text) {
      // Icône à gauche
      ctx.fillText(this.icon, this.x + this.size / 2, this.y + this.size / 2);
      
      // Texte à droite
      ctx.font = 'bold 14px -apple-system, sans-serif';
      ctx.fillText(this.text, this.x + this.size + 12, this.y + this.size / 2);
    } else {
      // Icône centrée
      ctx.fillText(this.icon, this.x + this.size / 2, this.y + this.size / 2);
    }
    
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
   * @returns {boolean} True si le point est dans le FAB
   */
  isPointInside(x, y) {
    if (this.extended) {
      return x >= this.x && x <= this.x + this.width && 
             y >= this.y && y <= this.y + this.height;
    } else {
      const dx = x - (this.x + this.size / 2);
      const dy = y - (this.y + this.size / 2);
      return Math.sqrt(dx * dx + dy * dy) <= this.size / 2;
    }
  }
}

export default FAB;