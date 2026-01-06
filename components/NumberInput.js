import Component from '../core/Component.js';
/**
 * Champ de saisie numérique avec support multi-plateforme et validation
 * @class
 * @extends Component
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {number} [options.value=0] - Valeur initiale
 * @param {number} [options.min] - Valeur minimale
 * @param {number} [options.max] - Valeur maximale
 * @param {number} [options.step=1] - Incrément/décrément
 * @param {string} [options.placeholder='0'] - Texte par défaut
 * @param {number} [options.fontSize=16] - Taille de police
 * @param {Function} [options.onChange] - Callback lors du changement de valeur
 * @param {number} [options.height] - Hauteur personnalisée (44 par défaut sur iOS)
 * @example
 * const numberInput = new NumberInput(framework, {
 *   value: 10,
 *   min: 0,
 *   max: 100,
 *   step: 5,
 *   onChange: (value) => console.log('New value:', value)
 * });
 */
class NumberInput extends Component {
  /**
   * @constructs NumberInput
   */
  constructor(framework, options = {}) {
    super(framework, options);
    /** @type {number|string} */
    this.value = options.value || 0;
    /** @type {number|undefined} */
    this.min = options.min;
    /** @type {number|undefined} */
    this.max = options.max;
    /** @type {number} */
    this.step = options.step || 1;
    /** @type {string} */
    this.placeholder = options.placeholder || '0';
    /** @type {string} */
    this.platform = framework.platform;
    /** @type {boolean} */
    this.focused = false;
    /** @type {number} */
    this.fontSize = options.fontSize || 16;
    /** @type {Function|undefined} */
    this.onChange = options.onChange;
    
    // Ajuster la hauteur pour iOS
    if (this.platform === 'cupertino') {
      this.height = options.height || 44;
    }
    
    this.onFocus = this.handleFocus.bind(this);
    this.onBlur = this.handleBlur.bind(this);
    
    // CRÉER UN INPUT CACHÉ UNIQUE POUR CETTE INSTANCE
    /** @type {string} */
    this.hiddenInputId = `hidden-number-input-${Math.random().toString(36).substr(2, 9)}`;
    this.setupHiddenInput();
  }
  
  /**
   * Configure l'input caché dans le DOM pour la saisie clavier
   * @private
   */
  setupHiddenInput() {
    // Créer un input caché unique pour cette instance
    const hiddenInput = document.createElement('input');
    hiddenInput.id = this.hiddenInputId;
    hiddenInput.type = 'number';
    hiddenInput.style.position = 'absolute';
    hiddenInput.style.opacity = '0';
    hiddenInput.style.width = '1px';
    hiddenInput.style.height = '1px';
    hiddenInput.style.left = '-9999px';
    hiddenInput.style.top = '0px';
    hiddenInput.style.fontSize = '16px'; // Forcer la taille de police
    
    // Appliquer les contraintes
    if (this.min !== undefined) hiddenInput.min = this.min;
    if (this.max !== undefined) hiddenInput.max = this.max;
    if (this.step) hiddenInput.step = this.step;
    
    document.body.appendChild(hiddenInput);
    
    hiddenInput.addEventListener('input', (e) => {
      if (this.focused) {
        let newValue = parseFloat(e.target.value);
        
        // Gérer les valeurs vides
        if (isNaN(newValue)) {
          newValue = '';
        } else {
          // Appliquer min/max
          if (this.min !== undefined) newValue = Math.max(this.min, newValue);
          if (this.max !== undefined) newValue = Math.min(this.max, newValue);
        }
        
        this.value = newValue;
        
        if (this.onChange) this.onChange(this.value);
      }
    });
    
    hiddenInput.addEventListener('blur', () => {
      this.handleBlur();
    });
    
    hiddenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleBlur();
      }
    });
    
    /** @type {HTMLInputElement} */
    this.hiddenInput = hiddenInput;
  }
  
  /**
   * Gère le focus sur le champ
   */
  handleFocus() {
    if (!this.hiddenInput) return;
    
    this.focused = true;
    this.cursorVisible = true;
    
    // Positionner et configurer l'input
    const adjustedY = this.y + this.framework.scrollOffset;
    
    // Sur mobile, on veut forcer le clavier numérique
    this.hiddenInput.type = 'number';
    this.hiddenInput.inputMode = 'decimal';
    this.hiddenInput.pattern = '[0-9]*';
    
    // Définir la valeur actuelle
    this.hiddenInput.value = this.value !== null && this.value !== undefined ? this.value : '';
    
    // Forcer le focus avec un délai pour éviter les problèmes de rendu
    setTimeout(() => {
      this.hiddenInput.focus();
    }, 50);
  }
  
  /**
   * Gère la perte de focus
   */
  handleBlur() {
    this.focused = false;
    this.cursorVisible = false;
    
    // S'assurer que la valeur est valide
    if (this.hiddenInput && this.hiddenInput.value !== '') {
      let val = parseFloat(this.hiddenInput.value);
      if (!isNaN(val)) {
        if (this.min !== undefined) val = Math.max(this.min, val);
        if (this.max !== undefined) val = Math.min(this.max, val);
        this.value = val;
      }
    }
  }
  
  /**
   * Gère le clic sur le champ
   */
  onClick() {
    this.handleFocus();
  }
  
  /**
   * Dessine le champ de saisie
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const displayValue = this.value !== null && this.value !== undefined ? 
                         this.value.toString() : this.placeholder;
    const isPlaceholder = this.value === null || this.value === undefined || this.value === '';
    
    if (this.platform === 'material') {
      // Material Design NumberInput
      ctx.strokeStyle = this.focused ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = this.focused ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
      
      // Valeur
      ctx.fillStyle = isPlaceholder ? '#999999' : '#000000';
      ctx.font = `${this.fontSize}px Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayValue, this.x + 2, this.y + this.height / 2);
      
    } else {
      // Cupertino NumberInput
      ctx.strokeStyle = this.focused ? '#007AFF' : '#C7C7CC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 8);
      ctx.stroke();
      
      // Valeur
      ctx.fillStyle = isPlaceholder ? '#999999' : '#000000';
      ctx.font = `${this.fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayValue, this.x + 10, this.y + this.height / 2);
    }
    
    // Curseur
    if (this.focused && this.cursorVisible) {
      const textWidth = ctx.measureText(displayValue).width;
      ctx.fillStyle = this.platform === 'material' ? '#6200EE' : '#007AFF';
      ctx.fillRect(this.x + (this.platform === 'material' ? 2 : 10) + textWidth + 2, 
                   this.y + 10, 2, this.height - 20);
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
   * Vérifie si un point est à l'intérieur du composant
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @returns {boolean} True si le point est à l'intérieur
   */
  isPointInside(x, y) {
      return x >= this.x && x <= this.x + this.width && 
             y >= this.y && y <= this.y + this.height;
  }
  
  /**
   * Nettoie les ressources (supprime l'input caché du DOM)
   */
  destroy() {
    if (this.hiddenInput && this.hiddenInput.parentNode) {
      this.hiddenInput.parentNode.removeChild(this.hiddenInput);
    }
  }
}

export default NumberInput;