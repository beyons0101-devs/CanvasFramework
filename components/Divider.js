import Component from '../core/Component.js';

/**
 * Séparateur visuel horizontal ou vertical
 * @class
 * @extends Component
 * @property {string} orientation - 'horizontal' ou 'vertical'
 * @property {number} thickness - Épaisseur du divider
 * @property {string} color - Couleur du divider
 * @property {number} margin - Marge autour du divider
 * @property {string} style - 'solid', 'dashed', ou 'dotted'
 * @property {boolean} hasInset - Si true, ajoute un inset pour les listes
 * @property {number} insetStart - Début de l'inset (px)
 * @property {string} variant - 'full', 'inset', 'middle'
 */
class Divider extends Component {
  /**
   * Crée une instance de Divider
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.orientation='horizontal'] - Orientation
   * @param {number} [options.thickness] - Épaisseur (auto selon platform)
   * @param {string} [options.color] - Couleur (auto selon platform)
   * @param {number} [options.margin=0] - Marge
   * @param {string} [options.style='solid'] - Style de ligne
   * @param {string} [options.variant='full'] - Variante
   * @param {number} [options.insetStart=16] - Début de l'inset
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.orientation = options.orientation || 'horizontal';
    this.margin = options.margin || 0;
    this.style = options.style || 'solid';
    this.variant = options.variant || 'full';
    this.insetStart = options.insetStart || 16;
    
    const platform = framework.platform;
    
    // Styles selon la plateforme
    if (platform === 'material') {
      this.thickness = options.thickness || 1;
      this.color = options.color || 'rgba(0, 0, 0, 0.12)';
    } else {
      this.thickness = options.thickness || 0.5;
      this.color = options.color || 'rgba(60, 60, 67, 0.29)';
    }
    
    // Ajuster les dimensions selon l'orientation
    if (this.orientation === 'horizontal') {
      this.height = this.thickness + (this.margin * 2);
    } else {
      this.width = this.thickness + (this.margin * 2);
    }
  }

  /**
   * Dessine le divider
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    let startX = this.x;
    let startY = this.y;
    let endX = this.x;
    let endY = this.y;
    
    if (this.orientation === 'horizontal') {
      startX = this.x;
      endX = this.x + this.width;
      startY = endY = this.y + this.margin + this.thickness / 2;
      
      // Variantes
      if (this.variant === 'inset') {
        startX += this.insetStart;
      } else if (this.variant === 'middle') {
        const inset = this.width * 0.1;
        startX += inset;
        endX -= inset;
      }
    } else {
      startY = this.y;
      endY = this.y + this.height;
      startX = endX = this.x + this.margin + this.thickness / 2;
      
      // Variantes
      if (this.variant === 'inset') {
        startY += this.insetStart;
      } else if (this.variant === 'middle') {
        const inset = this.height * 0.1;
        startY += inset;
        endY -= inset;
      }
    }
    
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;
    
    // Styles de ligne
    if (this.style === 'dashed') {
      ctx.setLineDash([8, 4]);
    } else if (this.style === 'dotted') {
      ctx.setLineDash([2, 4]);
    }
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans les limites (non cliquable)
   * @returns {boolean} Toujours false
   */
  isPointInside() {
    return false;
  }
}

export default Divider;