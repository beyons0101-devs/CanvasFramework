import Component from '../core/Component.js';

/**
 * Carte avec système de layout, ombre et bordures arrondies
 * @class
 * @extends Component
 * @property {Component[]} children - Enfants
 * @property {number} padding - Padding interne
 * @property {number} gap - Espacement entre enfants
 * @property {string} direction - Direction ('column' ou 'row')
 * @property {string} align - Alignement ('start', 'center', 'end')
 * @property {string} bgColor - Couleur de fond
 * @property {number} borderRadius - Rayon des coins
 * @property {number} elevation - Élévation (ombre)
 * @property {boolean} clipContent - Clip le contenu aux bordures
 */
class Card extends Component {
  /**
   * Crée une instance de Card
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.padding=16] - Padding interne
   * @param {number} [options.gap=0] - Espacement entre enfants
   * @param {string} [options.direction='column'] - Direction
   * @param {string} [options.align='start'] - Alignement
   * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
   * @param {number} [options.borderRadius] - Rayon des coins (auto selon platform)
   * @param {number} [options.elevation=2] - Élévation (ombre)
   * @param {boolean} [options.clipContent=true] - Clip le contenu
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.children = [];
    this.padding = options.padding !== undefined ? options.padding : 16;
    this.gap = options.gap || 0;
    this.direction = options.direction || 'column'; // 'column' ou 'row'
    this.align = options.align || 'start'; // 'start', 'center', 'end'
    this.bgColor = options.bgColor || '#FFFFFF';
    this.borderRadius = options.borderRadius !== undefined 
      ? options.borderRadius 
      : (framework.platform === 'material' ? 4 : 12);
    this.elevation = options.elevation !== undefined ? options.elevation : 2;
    this.clipContent = options.clipContent !== false;
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
    let currentX = this.padding;
    let currentY = this.padding;
    
    for (let child of this.children) {
      if (this.direction === 'column') {
        child.x = currentX;
        child.y = currentY;
        if (this.align === 'center') {
          child.x = (this.width - child.width) / 2;
        } else if (this.align === 'end') {
          child.x = this.width - child.width - this.padding;
        }
        currentY += child.height + this.gap;
      } else {
        child.x = currentX;
        child.y = currentY;
        if (this.align === 'center') {
          child.y = (this.height - child.height) / 2;
        } else if (this.align === 'end') {
          child.y = this.height - child.height - this.padding;
        }
        currentX += child.width + this.gap;
      }
    }
  }

  /**
   * Dessine la carte et ses enfants
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre (elevation)
    if (this.elevation > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = this.elevation * 3;
      ctx.shadowOffsetY = this.elevation;
    }
    
    // Background
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
    
    // Réinitialiser l'ombre
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Clipping (optionnel)
    if (this.clipContent && this.borderRadius > 0) {
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();
    }
    
    // Children - coordonnées relatives à la Card
    ctx.save();
    ctx.translate(this.x, this.y);
    
    for (let child of this.children) {
      if (child.visible) {
        child.draw(ctx);
      }
    }
    
    ctx.restore();
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
   * @returns {boolean} True si le point est dans la carte
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Card;
