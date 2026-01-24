import Component from '../core/Component.js';

/**
 * Bouton radio pour les sélections uniques
 * @class
 * @extends Component
 * @property {string} group - Groupe de boutons radio
 * @property {boolean} checked - État sélectionné
 * @property {string} label - Texte du label
 * @property {string} platform - Plateforme
 * @property {number} circleSize - Taille du cercle
 * @property {number} circleRadius - Rayon du cercle
 * @property {Function} onChange - Callback au changement
 */
class RadioButton extends Component {
  /**
   * Crée une instance de RadioButton
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.group='default'] - Groupe de boutons
   * @param {boolean} [options.checked=false] - État initial
   * @param {string} [options.label=''] - Texte du label
   * @param {Function} [options.onChange] - Callback au changement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.group = options.group || 'default';
    this.checked = options.checked || false;
    this.label = options.label || '';
	this.labelColor = options.labelColor || '#000000'; // Nouvelle propriété
    this.platform = framework.platform;
    this.circleSize = 24; // Taille du cercle
    this.circleRadius = 10; // Rayon du cercle
    this.onChange = options.onChange;
    
    // Calculer la largeur totale incluant le label
    this.totalWidth = this.label ? this.circleSize + 8 + this.getTextWidth(this.label) : this.circleSize;
    this.width = this.totalWidth; // Mettre à jour la largeur totale
    this.height = this.circleSize; // Garder la même hauteur
    
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
   * Gère le clic sur le bouton radio
   * @private
   */
  handleClick() {
    // Décocher les autres du même groupe
    for (let comp of this.framework.components) {
      if (comp instanceof RadioButton && comp.group === this.group && comp !== this) {
        comp.checked = false;
      }
    }
    this.checked = true;
    if (this.onChange) this.onChange(this.checked);
  }

  /**
   * Dessine le bouton radio
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const centerX = this.x + this.circleSize / 2;
    const centerY = this.y + this.circleSize / 2;
    
    if (this.platform === 'material') {
      // Outer circle
      ctx.strokeStyle = this.checked ? '#6200EE' : '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      if (this.checked) {
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
     } else {
      // Cupertino (iOS style)
      if (this.checked) {
        // Cercle bleu rempli
        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Point blanc au centre
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cercle gris clair
        ctx.strokeStyle = '#D1D1D6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Label
    if (this.label) {
      ctx.fillStyle = this.labelColor; // Au lieu de '#000000'
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + this.circleSize + 8, centerY);
    }
    
    ctx.restore();
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

export default RadioButton;
