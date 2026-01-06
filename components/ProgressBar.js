import Component from '../core/Component.js';
/**
 * Barre de progression
 * @class
 * @extends Component
 * @property {number} progress - Progression (0-100)
 * @property {string} platform - Plateforme ('material' ou 'cupertino')
 * @property {number} height - Hauteur de la barre
 */
class ProgressBar extends Component {
  /**
   * Crée une instance de ProgressBar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.progress=0] - Progression (0-100)
   * @param {number} [options.height=4] - Hauteur de la barre
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.progress = options.progress || 0; // 0-100
    this.platform = framework.platform;
    this.height = options.height || 4;
  }

  /**
   * Dessine la barre de progression
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.platform === 'material') {
      // Track
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Progress
      ctx.fillStyle = '#6200EE';
      ctx.fillRect(this.x, this.y, (this.width * this.progress) / 100, this.height);
    } else {
      // Cupertino
      ctx.fillStyle = '#E5E5EA';
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.height / 2);
      ctx.fill();
      
      ctx.fillStyle = '#007AFF';
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, (this.width * this.progress) / 100, this.height, this.height / 2);
      ctx.fill();
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
    if (width < radius * 2) width = radius * 2;
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
   * Vérifie si un point est dans les limites (toujours false pour ProgressBar)
   * @returns {boolean} False (non cliquable)
   */
  isPointInside() {
    return false;
  }
}

export default ProgressBar;