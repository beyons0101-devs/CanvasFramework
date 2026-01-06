import Component from '../core/Component.js';
import SelectDialog from '../components/SelectDialog.js';

/**
 * Composant de sélection déroulante (dropdown)
 * @class
 * @extends Component
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {string[]} [options.options=[]] - Liste des options
 * @param {number} [options.selectedIndex=0] - Index de l'option sélectionnée
 * @param {string} [options.placeholder='Select...'] - Texte par défaut
 * @param {number} [options.fontSize=16] - Taille de police
 * @param {Function} [options.onChange] - Callback lors du changement de sélection
 * @example
 * const select = new Select(framework, {
 *   options: ['Option 1', 'Option 2', 'Option 3'],
 *   placeholder: 'Choisissez une option',
 *   onChange: (value, index) => console.log('Selected:', value)
 * });
 */
class Select extends Component {
  /**
   * @constructs Select
   */
  constructor(framework, options = {}) {
    super(framework, options);
    /** @type {string[]} */
    this.options = options.options || [];
    /** @type {number} */
    this.selectedIndex = options.selectedIndex || 0;
    /** @type {string} */
    this.placeholder = options.placeholder || 'Select...';
    /** @type {string} */
    this.platform = framework.platform;
    /** @type {number} */
    this.fontSize = options.fontSize || 16;
    /** @type {Function|undefined} */
    this.onChange = options.onChange;
    /** @type {boolean} */
    this.isOpen = false;
    /** @type {SelectDialog|null} */
    this.dialog = null;
    
    // Définir onClick pour le Select
    this.onClick = this.toggleMenu.bind(this);
  }
  
  /**
   * Ouvre ou ferme le menu de sélection
   */
  toggleMenu() {
    if (this.isOpen && this.dialog) {
      this.closeMenu();
      return;
    }
    
    this.openMenu();
  }
  
  /**
   * Ouvre le menu de sélection (affiche le modal)
   */
  openMenu() {
    if (this.isOpen) return;
    
    this.dialog = new SelectDialog(this.framework, {
      title: this.placeholder,
      options: this.options,
      selectedIndex: this.selectedIndex,
      onSelect: (index, value) => {
        this.selectedIndex = index;
        if (this.onChange) {
          this.onChange(value, index);
        }
        this.closeMenu();
      }
    });
    
    this.framework.add(this.dialog);
    this.isOpen = true;
  }
  
  /**
   * Ferme le menu de sélection
   */
  closeMenu() {
    if (this.dialog) {
      this.dialog.hide();
      this.dialog = null;
    }
    this.isOpen = false;
  }
  
  /**
   * Dessine le composant Select
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const selectedValue = this.options[this.selectedIndex] || this.placeholder;
    
    if (this.platform === 'material') {
      // Material Design Select
      ctx.fillStyle = this.pressed ? '#F5F5F5' : '#FFFFFF';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      ctx.strokeStyle = this.isOpen ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = this.isOpen ? 2 : 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      
      // Texte
      ctx.fillStyle = selectedValue === this.placeholder ? '#999999' : '#000000';
      ctx.font = `${this.fontSize}px Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedValue, this.x + 15, this.y + this.height / 2);
      
      // Flèche
      ctx.fillStyle = '#666666';
      const arrowX = this.x + this.width - 20;
      const arrowY = this.y + this.height / 2;
      ctx.beginPath();
      ctx.moveTo(arrowX - 5, arrowY - 3);
      ctx.lineTo(arrowX + 5, arrowY - 3);
      ctx.lineTo(arrowX, arrowY + 3);
      ctx.closePath();
      ctx.fill();
    } else {
      // Cupertino Select
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 8);
      ctx.fill();
      
      ctx.strokeStyle = this.isOpen ? '#007AFF' : '#C7C7CC';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Texte
      ctx.fillStyle = selectedValue === this.placeholder ? '#999999' : '#000000';
      ctx.font = `${this.fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedValue, this.x + 15, this.y + this.height / 2);
      
      // Chevron
      ctx.strokeStyle = '#007AFF';
      ctx.lineWidth = 2;
      const chevronX = this.x + this.width - 20;
      const chevronY = this.y + this.height / 2;
      ctx.beginPath();
      ctx.moveTo(chevronX - 5, chevronY - 3);
      ctx.lineTo(chevronX, chevronY + 2);
      ctx.lineTo(chevronX + 5, chevronY - 3);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Dessine un rectangle avec des coins arrondis
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
   * Vérifie si un point est à l'intérieur du composant
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @returns {boolean} True si le point est à l'intérieur
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Select;
