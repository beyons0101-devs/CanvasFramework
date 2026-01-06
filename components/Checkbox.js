import Component from '../core/Component.js';
/**
 * Case à cocher
 * @class
 * @extends Component
 * @property {boolean} checked - État cochée
 * @property {string} label - Texte du label
 * @property {string} platform - Plateforme
 * @property {number} boxWidth - Largeur de la case
 * @property {number} boxHeight - Hauteur de la case
 * @property {Function} onChange - Callback au changement
 */
class Checkbox extends Component {
  /**
   * Crée une instance de Checkbox
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {boolean} [options.checked=false] - État initial
   * @param {string} [options.label=''] - Texte du label
   * @param {Function} [options.onChange] - Callback au changement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.checked = options.checked || false;
    this.label = options.label || '';
    this.platform = framework.platform;
    this.boxWidth = 24; // Taille de la case
    this.boxHeight = 24; // Taille de la case
    this.onChange = options.onChange;
    
    // Calculer la largeur totale incluant le label
    this.totalWidth = this.label ? this.boxWidth + 8 + this.getTextWidth(this.label) : this.boxWidth;
    this.width = this.totalWidth; // Mettre à jour la largeur totale
    this.height = this.boxHeight; // Garder la même hauteur
    
    // Définir onClick
    this.onClick = this.handleClick.bind(this);
  }
  
  /**
   * Calcule la largeur du texte
   * @param {string} text - Texte à mesurer
   * @returns {number} Largeur du texte
   * @private
   */
  getTextWidth(text) {
    // Utiliser le contexte temporaire pour mesurer le texte
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = '16px -apple-system, sans-serif';
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }

  /**
   * Gère le clic sur la checkbox
   * @private
   */
  handleClick() {
    this.checked = !this.checked;
    if (this.onChange) this.onChange(this.checked);
  }

  /**
   * Dessine la checkbox
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Position de la case
    const boxX = this.x;
    const boxY = this.y;
    const boxCenterX = boxX + this.boxWidth / 2;
    const boxCenterY = boxY + this.boxHeight / 2;
    
    if (this.platform === 'material') {
      // Material Design Checkbox
      if (this.checked) {
        // Case cochée
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        this.roundRect(ctx, boxX, boxY, this.boxWidth, this.boxHeight, 2);
        ctx.fill();
        
        // Coche
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX + 6, boxY + 12);
        ctx.lineTo(boxX + 10, boxY + 16);
        ctx.lineTo(boxX + 18, boxY + 8);
        ctx.stroke();
      } else {
        // Case non cochée
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.roundRect(ctx, boxX, boxY, this.boxWidth, this.boxHeight, 2);
        ctx.stroke();
      }
    } else {
      // Cupertino (iOS) Checkbox
      if (this.checked) {
        // Case cochée (iOS utilise plutôt un cercle)
        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        ctx.arc(boxCenterX, boxCenterY, this.boxWidth/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Coche
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX + 6, boxCenterY);
        ctx.lineTo(boxX + 10, boxCenterY + 4);
        ctx.lineTo(boxX + 18, boxCenterY - 4);
        ctx.stroke();
      } else {
        // Case non cochée
        ctx.strokeStyle = '#C7C7CC';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(boxCenterX, boxCenterY, this.boxWidth/2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Label
    if (this.label) {
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, boxX + this.boxWidth + 8, boxCenterY);
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
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans la checkbox
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Checkbox;