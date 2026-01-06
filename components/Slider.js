import Component from '../core/Component.js';

class Slider extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.value = options.value || 50;
    this.platform = framework.platform;
    this.onChange = options.onChange;
    this.dragging = false;
    
    // Animation state
    this.thumbScale = 1.0;
    this.targetScale = 1.0;
    
    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onClick = this.handleClick.bind(this);
  }

  handlePress(x, y) {
    this.dragging = true;
    this.targetScale = 1.5; // Agrandissement de 50%
    this.updateValue(x);
    return true;
  }

  handleMove(x, y) {
    if (this.dragging) {
      this.updateValue(x);
    }
  }

  handleClick() {
    this.dragging = false;
    this.targetScale = 1.0; // Retour à la taille normale
  }

  updateValue(x) {
    const relativeX = Math.max(0, Math.min(this.width, x - this.x));
    const newValue = this.min + (relativeX / this.width) * (this.max - this.min);
    
    if (newValue !== this.value) {
      this.value = newValue;
      if (this.onChange) this.onChange(this.value);
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Animation du scale
    this.thumbScale += (this.targetScale - this.thumbScale) * 0.2;
    
    const progress = (this.value - this.min) / (this.max - this.min);
    const thumbX = this.x + progress * this.width;

    // Track
    ctx.strokeStyle = this.platform === 'material' ? '#E0E0E0' : '#C7C7CC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height / 2);
    ctx.lineTo(this.x + this.width, this.y + this.height / 2);
    ctx.stroke();

    // Track rempli
    const trackColor = this.platform === 'material' ? '#6200EE' : '#007AFF';
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height / 2);
    ctx.lineTo(thumbX, this.y + this.height / 2);
    ctx.stroke();

    // Curseur avec animation
    const baseRadius = 8;
    const currentRadius = baseRadius * this.thumbScale;
    
    // Effet d'ombre pendant le drag
    if (this.dragging) {
      ctx.shadowColor = trackColor;
      ctx.shadowBlur = 10;
    }
    
    ctx.fillStyle = trackColor;
    ctx.beginPath();
    ctx.arc(thumbX, this.y + this.height / 2, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.dragging) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  isPointInside(x, y) {
    const progress = (this.value - this.min) / (this.max - this.min);
    const thumbX = this.x + progress * this.width;
    const thumbY = this.y + this.height / 2;
    const maxRadius = 8 * 1.5 + 5; // Rayon max + marge
    
    // Zone de clic plus large pour faciliter l'utilisation
    const distance = Math.sqrt((x - thumbX) ** 2 + (y - thumbY) ** 2);
    return distance <= maxRadius || 
           (x >= this.x && x <= this.x + this.width && 
            y >= this.y && y <= this.y + this.height);
  }
}

export default Slider;