import Component from '../core/Component.js';
/**
 * Stepper (incrémenteur/décrémenteur)
 * @class
 * @extends Component
 * @property {number} value - Valeur
 * @property {number} min - Minimum
 * @property {number} max - Maximum
 * @property {number} step - Pas d'incrémentation
 * @property {string} platform - Plateforme
 * @property {Function} onChange - Callback au changement
 * @property {number} buttonWidth - Largeur des boutons
 * @property {boolean} decrementPressed - Bouton décrémenter pressé
 * @property {boolean} incrementPressed - Bouton incrémenter pressé
 */
class Stepper extends Component {
  /**
   * Crée une instance de Stepper
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.value=0] - Valeur initiale
   * @param {number} [options.min=0] - Minimum
   * @param {number} [options.max=100] - Maximum
   * @param {number} [options.step=1] - Pas
   * @param {Function} [options.onChange] - Callback au changement
   * @param {number} [options.width=120] - Largeur
   * @param {number} [options.height=40] - Hauteur
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.value = options.value || 0;
    this.min = options.min !== undefined ? options.min : 0;
    this.max = options.max !== undefined ? options.max : 100;
    this.step = options.step || 1;
    this.platform = framework.platform;
    this.onChange = options.onChange;
    this.width = options.width || 120;
    this.height = options.height || 40;
    this.buttonWidth = this.height;
    
    this.decrementPressed = false;
    this.incrementPressed = false;
    
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Incrémente la valeur
   */
  increment() {
    if (this.value + this.step <= this.max) {
      this.value += this.step;
      if (this.onChange) this.onChange(this.value);
    }
  }
  
  /**
   * Décrémente la valeur
   */
  decrement() {
    if (this.value - this.step >= this.min) {
      this.value -= this.step;
      if (this.onChange) this.onChange(this.value);
    }
  }
  
  /**
   * Définit la valeur
   * @param {number} value - Nouvelle valeur
   */
  setValue(value) {
    this.value = Math.max(this.min, Math.min(this.max, value));
    if (this.onChange) this.onChange(this.value);
  }
  
  /**
   * Dessine le stepper
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.platform === 'material') {
      // Material Design Stepper
      
      // Bouton décrement (-)
      const canDecrement = this.value > this.min;
      ctx.fillStyle = this.decrementPressed ? '#E0E0E0' : '#F5F5F5';
      ctx.strokeStyle = canDecrement ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.buttonWidth, this.height, 4);
      ctx.fill();
      ctx.stroke();
      
      // Icône -
      ctx.strokeStyle = canDecrement ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x + this.buttonWidth / 2 - 8, this.y + this.height / 2);
      ctx.lineTo(this.x + this.buttonWidth / 2 + 8, this.y + this.height / 2);
      ctx.stroke();
      
      // Zone centrale (valeur)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(this.x + this.buttonWidth, this.y, 
                   this.width - (this.buttonWidth * 2), this.height);
      
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + this.buttonWidth, this.y, 
                     this.width - (this.buttonWidth * 2), this.height);
      
      // Valeur
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.value.toString(), this.x + this.width / 2, this.y + this.height / 2);
      
      // Bouton increment (+)
      const canIncrement = this.value < this.max;
      ctx.fillStyle = this.incrementPressed ? '#E0E0E0' : '#F5F5F5';
      ctx.strokeStyle = canIncrement ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      this.roundRect(ctx, this.x + this.width - this.buttonWidth, this.y, 
                     this.buttonWidth, this.height, 4);
      ctx.fill();
      ctx.stroke();
      
      // Icône +
      ctx.strokeStyle = canIncrement ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const plusX = this.x + this.width - this.buttonWidth / 2;
      const plusY = this.y + this.height / 2;
      
      ctx.beginPath();
      ctx.moveTo(plusX - 8, plusY);
      ctx.lineTo(plusX + 8, plusY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(plusX, plusY - 8);
      ctx.lineTo(plusX, plusY + 8);
      ctx.stroke();
      
    } else {
      // Cupertino (iOS) Stepper
      
      // Container
      ctx.strokeStyle = '#C7C7CC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.height / 2);
      ctx.stroke();
      
      // Divider central
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 2, this.y);
      ctx.lineTo(this.x + this.width / 2, this.y + this.height);
      ctx.stroke();
      
      // Bouton décrement (-)
      const canDecrement = this.value > this.min;
      if (this.decrementPressed) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 4, this.y + this.height / 2, 
                this.height / 2 - 2, Math.PI / 2, Math.PI * 1.5);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.strokeStyle = canDecrement ? '#007AFF' : '#C7C7CC';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x + this.width / 4 - 10, this.y + this.height / 2);
      ctx.lineTo(this.x + this.width / 4 + 10, this.y + this.height / 2);
      ctx.stroke();
      
      // Bouton increment (+)
      const canIncrement = this.value < this.max;
      if (this.incrementPressed) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(this.x + (this.width * 3 / 4), this.y + this.height / 2, 
                this.height / 2 - 2, Math.PI * 1.5, Math.PI / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.strokeStyle = canIncrement ? '#007AFF' : '#C7C7CC';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const plusX = this.x + (this.width * 3 / 4);
      const plusY = this.y + this.height / 2;
      
      ctx.beginPath();
      ctx.moveTo(plusX - 10, plusY);
      ctx.lineTo(plusX + 10, plusY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(plusX, plusY - 10);
      ctx.lineTo(plusX, plusY + 10);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    
    // Bouton décrement (gauche)
    if (x >= this.x && x <= this.x + this.buttonWidth) {
      this.decrementPressed = true;
      this.decrement();
      setTimeout(() => { this.decrementPressed = false; }, 150);
    }
    // Bouton increment (droite)
    else if (x >= this.x + this.width - this.buttonWidth && x <= this.x + this.width) {
      this.incrementPressed = true;
      this.increment();
      setTimeout(() => { this.incrementPressed = false; }, 150);
    }
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
   * @returns {boolean} True si le point est dans le stepper
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }
}

export default Stepper;