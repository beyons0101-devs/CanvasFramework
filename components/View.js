import Component from '../core/Component.js';
/**
 * Container avec système de layout
 * @class
 * @extends Component
 * @property {Component[]} children - Enfants
 * @property {number} padding - Padding interne
 * @property {number} gap - Espacement entre enfants
 * @property {string} direction - Direction ('column' ou 'row')
 * @property {string} align - Alignement ('start', 'center', 'end')
 * @property {string} bgColor - Couleur de fond
 * @property {number} borderRadius - Rayon des coins
 */
class View extends Component {
  /**
   * Crée une instance de View
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.padding=0] - Padding interne
   * @param {number} [options.gap=0] - Espacement entre enfants
   * @param {string} [options.direction='column'] - Direction
   * @param {string} [options.align='start'] - Alignement
   * @param {string} [options.bgColor='transparent'] - Couleur de fond
   * @param {number} [options.borderRadius=0] - Rayon des coins
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.children = [];
    this.padding = options.padding || 0;
    this.gap = options.gap || 0;
    this.direction = options.direction || 'column'; // 'column' ou 'row'
    this.align = options.align || 'start'; // 'start', 'center', 'end'
    this.bgColor = options.bgColor || 'transparent';
    this.borderRadius = options.borderRadius || 0;
  }

  /**
   * Ajoute un enfant
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    this.children.push(child);
    this.layout();
    return child;
  }

  /**
   * Organise les enfants selon le layout
   * @private
   */
  layout() {
    let currentX = this.x + this.padding;
    let currentY = this.y + this.padding;
    
    for (let child of this.children) {
      if (this.direction === 'column') {
        child.x = currentX;
        child.y = currentY;
        if (this.align === 'center') {
          child.x = this.x + (this.width - child.width) / 2;
        } else if (this.align === 'end') {
          child.x = this.x + this.width - child.width - this.padding;
        }
        currentY += child.height + this.gap;
      } else {
        child.x = currentX;
        child.y = currentY;
        if (this.align === 'center') {
          child.y = this.y + (this.height - child.height) / 2;
        } else if (this.align === 'end') {
          child.y = this.y + this.height - child.height - this.padding;
        }
        currentX += child.width + this.gap;
      }
    }
  }

  /**
   * Dessine la vue et ses enfants
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.bgColor !== 'transparent') {
      ctx.fillStyle = this.bgColor;
      if (this.borderRadius > 0) {
        ctx.beginPath();
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
    
    for (let child of this.children) {
      if (child.visible) child.draw(ctx);
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
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans la vue
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default View;