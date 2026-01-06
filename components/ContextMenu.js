import Component from '../core/Component.js';
/**
 * Menu contextuel
 * @class
 * @extends Component
 * @property {string[]} options - Options du menu
 * @property {Function} onSelect - Callback à la sélection
 * @property {number} itemHeight - Hauteur d'un item
 * @property {boolean} isOpen - État ouvert
 * @property {number} hoveredIndex - Index survolé
 */
class ContextMenu extends Component {
  /**
   * Crée une instance de ContextMenu
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string[]} [options.options=[]] - Options du menu
   * @param {Function} [options.onSelect] - Callback à la sélection
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.options = options.options || [];
    this.onSelect = options.onSelect;
    this.itemHeight = 48;
    this.height = this.options.length * this.itemHeight;
    this.hoveredIndex = -1;
    this.isOpen = true;
    
    // Définir onClick pour le menu
    this.onClick = this.handleClick.bind(this);
  }

  /**
   * Dessine le menu contextuel
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.isOpen) return;
    
    ctx.save();
    
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.shadowColor = 'transparent';
    
    // Options
    for (let i = 0; i < this.options.length; i++) {
      const itemY = this.y + i * this.itemHeight;
      
      if (this.hoveredIndex === i) {
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(this.x, itemY, this.width, this.itemHeight);
      }
      
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.options[i], this.x + 16, itemY + this.itemHeight / 2);
      
      // Divider
      if (i < this.options.length - 1) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, itemY + this.itemHeight);
        ctx.lineTo(this.x + this.width, itemY + this.itemHeight);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le menu
   */
  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    const inBounds = super.isPointInside(x, adjustedY);
    if (inBounds) {
      this.hoveredIndex = Math.floor((adjustedY - this.y) / this.itemHeight);
    } else {
      this.hoveredIndex = -1;
    }
    return inBounds;
  }

  /**
   * Gère le clic sur le menu
   * @private
   */
  handleClick() {
    if (this.hoveredIndex >= 0 && this.onSelect) {
      this.onSelect(this.hoveredIndex);
      this.close();
    }
  }
  
  /**
   * Ferme le menu contextuel
   */
  close() {
    this.isOpen = false;
    this.framework.remove(this);
  }
}

export default ContextMenu;