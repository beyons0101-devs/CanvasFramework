import Component from '../core/Component.js';
/**
 * Champ de texte avancé avec label flottant, validation et messages d'erreur
 * @class
 * @extends Component
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {string} [options.label=''] - Label du champ
 * @param {string} [options.value=''] - Valeur initiale
 * @param {string} [options.placeholder=''] - Placeholder
 * @param {string} [options.helperText=''] - Texte d'aide
 * @param {string} [options.errorText=''] - Texte d'erreur
 * @param {boolean} [options.error=false] - État d'erreur
 * @param {number} [options.fontSize=16] - Taille de police
 * @param {Function} [options.onChange] - Callback lors du changement
 * @param {number} [options.height=80] - Hauteur totale (inclut label + input + helper)
 * @example
 * const textField = new TextField(framework, {
 *   label: 'Email',
 *   placeholder: 'Entrez votre email',
 *   helperText: 'Nous ne partagerons jamais votre email',
 *   onChange: (value) => validateEmail(value)
 * });
 */
class TextField extends Component {
  /**
   * @constructs TextField
   */
  constructor(framework, options = {}) {
    super(framework, options);
    /** @type {string} */
    this.label = options.label || '';
    /** @type {string} */
    this.value = options.value || '';
    /** @type {string} */
    this.placeholder = options.placeholder || '';
    /** @type {string} */
    this.helperText = options.helperText || '';
    /** @type {string} */
    this.errorText = options.errorText || '';
    /** @type {boolean} */
    this.error = options.error || false;
    /** @type {string} */
    this.platform = framework.platform;
    /** @type {boolean} */
    this.focused = false;
    /** @type {number} */
    this.fontSize = options.fontSize || 16;
    /** @type {Function|undefined} */
    this.onChange = options.onChange;
    /** @type {number} */
    this.labelY = this.value ? -10 : 20; // Position du label
    /** @type {number} */
    this.labelFontSize = this.value ? 12 : 16;
    /** @type {boolean} */
    this.cursorVisible = true;
    
    // Hauteur pour inclure label + input + helper
    this.height = options.height || 80;
    
    this.onFocus = this.handleFocus.bind(this);
    this.onBlur = this.handleBlur.bind(this);
    
    this.setupHiddenInput();
    
    // Animation du curseur
    /** @type {number} */
    this.cursorInterval = setInterval(() => {
      if (this.focused) this.cursorVisible = !this.cursorVisible;
    }, 500);
  }
  
  /**
   * Configure l'input caché dans le DOM
   * @private
   */
  setupHiddenInput() {
    let hiddenInput = document.getElementById('hidden-textfield-input');
    if (!hiddenInput) {
      hiddenInput = document.createElement('input');
      hiddenInput.id = 'hidden-textfield-input';
      hiddenInput.type = 'text';
      hiddenInput.style.position = 'fixed';
      hiddenInput.style.opacity = '0';
      hiddenInput.style.pointerEvents = 'none';
      hiddenInput.style.top = '-100px';
      document.body.appendChild(hiddenInput);
      
      hiddenInput.addEventListener('input', (e) => {
        if (this.focused) {
          this.value = e.target.value;
          if (this.onChange) this.onChange(this.value);
          this.animateLabel();
        }
      });
      
      hiddenInput.addEventListener('blur', () => {
        this.handleBlur();
      });
    }
    /** @type {HTMLInputElement} */
    this.hiddenInput = hiddenInput;
  }
  
  /**
   * Anime le label (flottant)
   * @private
   */
  animateLabel() {
    const shouldFloat = this.focused || this.value;
    const targetY = shouldFloat ? -10 : 20;
    const targetSize = shouldFloat ? 12 : 16;
    
    const animate = () => {
      const diffY = targetY - this.labelY;
      const diffSize = targetSize - this.labelFontSize;
      
      if (Math.abs(diffY) < 0.5 && Math.abs(diffSize) < 0.5) {
        this.labelY = targetY;
        this.labelFontSize = targetSize;
        return;
      }
      
      this.labelY += diffY * 0.2;
      this.labelFontSize += diffSize * 0.2;
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * Gère le focus sur le champ
   */
  handleFocus() {
    this.focused = true;
    this.cursorVisible = true;
    if (this.hiddenInput) {
      this.hiddenInput.value = this.value;
      const adjustedY = this.y + this.framework.scrollOffset;
      this.hiddenInput.style.top = `${adjustedY}px`;
      this.hiddenInput.focus();
    }
    this.animateLabel();
  }
  
  /**
   * Gère la perte de focus
   */
  handleBlur() {
    this.focused = false;
    this.cursorVisible = false;
    this.animateLabel();
  }
  
  /**
   * Gère le clic sur le champ
   */
  onClick() {
    this.handleFocus();
  }
  
  /**
   * Dessine le champ de texte
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const inputY = this.y + 30;
    const inputHeight = 40;
    
    if (this.platform === 'material') {
      // Material Design TextField
      
      // Label flottant
      const labelColor = this.error ? '#B00020' : 
                        (this.focused ? '#6200EE' : '#757575');
      ctx.fillStyle = labelColor;
      ctx.font = `${this.labelFontSize}px Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x, this.y + 20 + this.labelY);
      
      // Ligne de soulignement
      const lineColor = this.error ? '#B00020' : 
                       (this.focused ? '#6200EE' : '#CCCCCC');
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = this.focused ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, inputY + inputHeight);
      ctx.lineTo(this.x + this.width, inputY + inputHeight);
      ctx.stroke();
      
      // Valeur ou placeholder
      const displayText = this.value || (this.focused ? '' : this.placeholder);
      ctx.fillStyle = this.value ? '#000000' : '#999999';
      ctx.font = `${this.fontSize}px Roboto, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, this.x, inputY + inputHeight / 2);
      
      // Curseur
      if (this.focused && this.cursorVisible) {
        const textWidth = ctx.measureText(this.value).width;
        ctx.fillStyle = '#6200EE';
        ctx.fillRect(this.x + textWidth + 2, inputY + 10, 2, inputHeight - 20);
      }
      
      // Helper text ou error text
      const helperColor = this.error ? '#B00020' : '#757575';
      const helperMessage = this.error ? this.errorText : this.helperText;
      
      if (helperMessage) {
        ctx.fillStyle = helperColor;
        ctx.font = '12px Roboto, sans-serif';
        ctx.fillText(helperMessage, this.x, inputY + inputHeight + 20);
      }
      
    } else {
      // Cupertino style (label au-dessus)
      
      if (this.label) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.label, this.x, this.y);
      }
      
      // Input box
      ctx.strokeStyle = this.error ? '#FF3B30' : 
                       (this.focused ? '#007AFF' : '#C7C7CC');
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.roundRect(ctx, this.x, inputY, this.width, inputHeight, 8);
      ctx.stroke();
      
      // Valeur ou placeholder
      const displayText = this.value || this.placeholder;
      ctx.fillStyle = this.value ? '#000000' : '#999999';
      ctx.font = `${this.fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, this.x + 10, inputY + inputHeight / 2);
      
      // Curseur
      if (this.focused && this.cursorVisible) {
        const textWidth = ctx.measureText(this.value).width;
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(this.x + 10 + textWidth + 2, inputY + 10, 2, inputHeight - 20);
      }
      
      // Helper/Error text
      if (this.error && this.errorText) {
        ctx.fillStyle = '#FF3B30';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.fillText(this.errorText, this.x, inputY + inputHeight + 8);
      } else if (this.helperText) {
        ctx.fillStyle = '#8E8E93';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.fillText(this.helperText, this.x, inputY + inputHeight + 8);
      }
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
   * Définit une erreur sur le champ
   * @param {string} errorText - Texte d'erreur à afficher
   */
  setError(errorText) {
    this.error = true;
    this.errorText = errorText;
  }
  
  /**
   * Efface l'erreur du champ
   */
  clearError() {
    this.error = false;
    this.errorText = '';
  }
  
  /**
   * Nettoie les ressources (arrête l'animation du curseur)
   */
  destroy() {
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
    }
  }
}

export default TextField;