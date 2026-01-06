import Component from '../core/Component.js';
/**
 * Chip (étiquette cliquable)
 * @class
 * @extends Component
 * @property {string} text - Texte
 * @property {string|null} icon - Icône
 * @property {boolean} closable - Peut être fermé
 * @property {string} platform - Plateforme
 * @property {string} bgColor - Couleur de fond
 * @property {string} textColor - Couleur du texte
 * @property {Function} onClose - Callback à la fermeture
 * @property {number} borderRadius - Rayon des coins
 * @property {Object|null} closeButtonRect - Rectangle du bouton fermer
 */
class Chip extends Component {
  /**
   * Crée une instance de Chip
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.text=''] - Texte
   * @param {string} [options.icon] - Icône
   * @param {boolean} [options.closable=true] - Peut être fermé
   * @param {string} [options.bgColor] - Couleur de fond (auto selon platform)
   * @param {string} [options.textColor='#000000'] - Couleur du texte
   * @param {Function} [options.onClose] - Callback à la fermeture
   * @param {number} [options.height=32] - Hauteur
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.text = options.text || '';
    this.icon = options.icon || null;
    this.closable = options.closable !== false;
    this.platform = framework.platform;
    this.bgColor = options.bgColor || (framework.platform === 'material' ? '#E0E0E0' : '#F0F0F0');
    this.textColor = options.textColor || '#000000';
    this.onClose = options.onClose;
    
    // Calculer la largeur en fonction du contenu
    const ctx = framework.ctx;
    ctx.font = '14px -apple-system, sans-serif';
    const textWidth = ctx.measureText(this.text).width;
    const iconWidth = this.icon ? 24 : 0;
    const closeWidth = this.closable ? 24 : 0;
    this.width = iconWidth + textWidth + closeWidth + 24; // padding
    this.height = options.height || 32;
    this.borderRadius = this.height / 2;
    
    this.closeButtonRect = null;
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Dessine le chip
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = this.pressed ? this.darkenColor(this.bgColor) : this.bgColor;
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    
    let currentX = this.x + 12;
    
    // Icône
    if (this.icon) {
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.textColor;
      ctx.fillText(this.icon, currentX, this.y + this.height / 2);
      currentX += 20;
    }
    
    // Texte
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillStyle = this.textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, currentX, this.y + this.height / 2);
    
    // Bouton de fermeture
    if (this.closable) {
      const closeX = this.x + this.width - 20;
      const closeY = this.y + this.height / 2;
      
      this.closeButtonRect = {
        x: closeX - 8,
        y: closeY - 8,
        width: 16,
        height: 16
      };
      
      // Cercle du bouton (optionnel)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      ctx.arc(closeX, closeY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Croix (X)
      ctx.strokeStyle = this.textColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(closeX - 4, closeY - 4);
      ctx.lineTo(closeX + 4, closeY + 4);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(closeX + 4, closeY - 4);
      ctx.lineTo(closeX - 4, closeY + 4);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    
    // Vérifier si on clique sur le bouton de fermeture
    if (this.closable && this.closeButtonRect) {
      if (x >= this.closeButtonRect.x && 
          x <= this.closeButtonRect.x + this.closeButtonRect.width &&
          adjustedY >= this.closeButtonRect.y && 
          adjustedY <= this.closeButtonRect.y + this.closeButtonRect.height) {
        if (this.onClose) this.onClose();
        return;
      }
    }
    
    // Sinon, déclencher onClick normal
    if (this.onClick) this.onClick();
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
   * @param {string} color - Couleur
   * @returns {string} Couleur assombrie
   * @private
   */
  darkenColor(color) {
    // Utiliser la même méthode que Button
    if (color.startsWith('#')) {
      const rgb = this.hexToRgb(color);
      return `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`;
    }
    return color;
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
   * @returns {boolean} True si le point est dans le chip
   */
  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    return x >= this.x && x <= this.x + this.width && 
           adjustedY >= this.y && adjustedY <= this.y + this.height;
  }
}

export default Chip;