import Component from '../core/Component.js';
/**
 * Composant texte
 * @class
 * @extends Component
 * @property {string} text - Texte à afficher
 * @property {number} fontSize - Taille de police
 * @property {string} color - Couleur
 * @property {string} align - Alignement ('left', 'center', 'right')
 * @property {boolean} bold - Gras
 * @property {number|null} maxWidth - Largeur maximale
 * @property {boolean} wrap - Retour à la ligne
 * @property {number} lineHeight - Hauteur de ligne
 * @property {string[]|null} wrappedLines - Lignes après wrap
 */
class Text extends Component {
  /**
   * Crée une instance de Text
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.text=''] - Texte
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {string} [options.color='#000000'] - Couleur
   * @param {string} [options.align='left'] - Alignement
   * @param {boolean} [options.bold=false] - Gras
   * @param {number} [options.maxWidth] - Largeur maximale
   * @param {boolean} [options.wrap=false] - Retour à la ligne
   * @param {number} [options.lineHeight] - Hauteur de ligne
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.text = options.text || '';
    this.fontSize = options.fontSize || 16;
    this.color = options.color || '#000000';
    this.align = options.align || 'left';
    this.bold = options.bold || false;
    this.maxWidth = options.maxWidth || null; // Nouvelle option: largeur maximale
    this.wrap = options.wrap || false; // Nouvelle option: retour à la ligne
    this.lineHeight = options.lineHeight || this.fontSize * 1.2;
    
    // Calculer la hauteur en fonction du texte
    if (this.wrap && this.maxWidth && this.text) {
      this.calculateWrappedHeight();
    }
  }
  
  /**
   * Calcule la hauteur avec wrap
   * @private
   */
  calculateWrappedHeight() {
    // Cette méthode sera appelée dans draw quand on a le contexte
    // Pour l'instant, on initialise juste
    this.wrappedLines = null;
  }

  /**
   * Dessine le texte
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = `${this.bold ? 'bold ' : ''}${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = this.align;
    ctx.textBaseline = 'top';
    
    let lines = [this.text];
    
    // Si wrap est activé et on a une largeur max, on divise le texte
    if (this.wrap && this.maxWidth && this.text) {
      lines = this.wrapText(ctx, this.text, this.maxWidth);
    } else if (this.maxWidth && this.text) {
      // Sinon, on tronque le texte avec des points de suspension
      const ellipsis = '...';
      let text = this.text;
      while (ctx.measureText(text).width > this.maxWidth && text.length > 3) {
        text = text.substring(0, text.length - 1);
      }
      if (text !== this.text && text.length > 3) {
        text = text.substring(0, text.length - 3) + ellipsis;
      }
      lines = [text];
    }
    
    // Calculer la position x en fonction de l'alignement
    const x = this.align === 'center' ? this.x + (this.maxWidth || this.width) / 2 :
               this.align === 'right' ? this.x + (this.maxWidth || this.width) : this.x;
    
    // Dessiner chaque ligne
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const y = this.y + (i * this.lineHeight);
      ctx.fillText(line, x, y);
    }
    
    // Ajuster la hauteur si on a plusieurs lignes
    if (lines.length > 1) {
      this.height = lines.length * this.lineHeight;
    }
    
    ctx.restore();
  }

  /**
   * Divise le texte en plusieurs lignes
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {string} text - Texte à diviser
   * @param {number} maxWidth - Largeur maximale
   * @returns {string[]} Tableau de lignes
   * @private
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  /**
   * Vérifie si un point est dans les limites
   * @returns {boolean} False (non cliquable)
   */
  isPointInside() {
    return false;
  }
}

export default Text;
