import Component from '../core/Component.js';

class Stepper extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.value = options.value || 0;
    this.min = options.min ?? 0;
    this.max = options.max ?? 100;
    this.step = options.step || 1;
    this.platform = framework.platform;
    this.onChange = options.onChange;
    this.width = options.width || 120;
    this.height = options.height || 40;
    this.buttonWidth = this.height;

    this.decrementPressed = false;
    this.incrementPressed = false;
    this.ripples = [];

    this.scale = 1;
    
    // SOLUTION: Distinguer entre press (début) et release (fin)
    this._pressStartTime = 0;
    this._pressButton = null; // 'decrement' ou 'increment'
    this._pressActive = false;
    this._clickThreshold = 200; // ms
    
    this.onPress = this.handlePress.bind(this);
  }

  increment() {
    if (this.value + this.step <= this.max) {
      this.value += this.step;
      this.animateScale();
      if (this.onChange) this.onChange(this.value);
    }
  }

  decrement() {
    if (this.value - this.step >= this.min) {
      this.value -= this.step;
      this.animateScale();
      if (this.onChange) this.onChange(this.value);
    }
  }

  animateScale() {
    this.scale = 1;
    const animate = () => {
      if (this.scale < 1) {
        this.scale += 0.05;
        if (this.scale > 1) this.scale = 1;
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  createRipple(x, y, buttonWidth) {
	  const radius = Math.min(this.height / 2, buttonWidth / 2);
	  const ripple = { x, y, radius: 0, maxRadius: radius, opacity: 0.3 };
	  this.ripples.push(ripple);

	  const animate = () => {
		ripple.radius += ripple.maxRadius / 10;
		ripple.opacity -= 0.03;
		if (ripple.opacity > 0) requestAnimationFrame(animate);
		else this.ripples = this.ripples.filter(r => r.opacity > 0);
	  };
	  animate();
  }

  // SOLUTION: handlePress est appelé DEUX FOIS par le framework
  handlePress(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    const now = Date.now();
    
    // DÉBUT DU PRESS (premier appel du framework)
    if (!this._pressActive) {
      console.log('🟢 DEBUT press - Premier appel');
      
      // Déterminer quel bouton est pressé
      if (x >= this.x && x <= this.x + this.buttonWidth) {
        this._pressButton = 'decrement';
        this.decrementPressed = true;
        this._pressStartTime = now;
        this._pressActive = true;
        
        // Feedback visuel immédiat
        if (this.platform === 'material') {
          this.createRipple(this.x + this.buttonWidth / 2, this.y + this.height / 2);
        }
      }
      else if (x >= this.x + this.width - this.buttonWidth && x <= this.x + this.width) {
        this._pressButton = 'increment';
        this.incrementPressed = true;
        this._pressStartTime = now;
        this._pressActive = true;
        
        // Feedback visuel immédiat
        if (this.platform === 'material') {
          this.createRipple(this.x + this.width - this.buttonWidth / 2, this.y + this.height / 2);
        }
      }
      
      // Marquer pour redessin
      this.markDirty();
    }
    // FIN DU PRESS (deuxième appel du framework) - C'EST LE VRAI CLIC
    else {
      console.log('🔴 FIN press - Deuxième appel (vrai clic)');
      
      // Vérifier que c'est toujours le même bouton
      let sameButton = false;
      
      if (this._pressButton === 'decrement' && 
          x >= this.x && x <= this.x + this.buttonWidth) {
        sameButton = true;
      }
      else if (this._pressButton === 'increment' && 
               x >= this.x + this.width - this.buttonWidth && x <= this.x + this.width) {
        sameButton = true;
      }
      
      // Exécuter l'action SEULEMENT sur le deuxième appel (le vrai clic)
      if (sameButton && (now - this._pressStartTime) < 500) {
        if (this._pressButton === 'decrement') {
          this.decrement();
        } else if (this._pressButton === 'increment') {
          this.increment();
        }
      }
      
      // Reset après un court délai
      setTimeout(() => {
        this.decrementPressed = false;
        this.incrementPressed = false;
        this._pressActive = false;
        this._pressButton = null;
        this.markDirty();
      }, 150);
    }
  }

  draw(ctx) {
	  ctx.save();

	  // 1️⃣ Draw ripples FIRST
	  for (let ripple of this.ripples) {
		ctx.fillStyle = `rgba(0,0,0,${ripple.opacity})`;
		ctx.beginPath();
		ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI*2);
		ctx.fill();
	  }

	  // 2️⃣ Scale only the pressed button (optional)
	  ctx.translate(this.x + this.width/2, this.y + this.height/2);
	  ctx.scale(this.scale, this.scale);
	  ctx.translate(-(this.x + this.width/2), -(this.y + this.height/2));

	  // Draw buttons + value
	  if (this.platform === 'material') {
		this.drawMaterial(ctx);
	  } else {
		this.drawCupertino(ctx);
	  }

	  ctx.restore();
  }

  drawMaterial(ctx) {
    const canDecrement = this.value > this.min;
    const canIncrement = this.value < this.max;

    // Décrement
    ctx.fillStyle = this.decrementPressed ? '#E0E0E0' : '#F5F5F5';
    ctx.strokeStyle = canDecrement ? '#6200EE' : '#CCCCCC';
    ctx.lineWidth = 2;
    this.roundRect(ctx, this.x, this.y, this.buttonWidth, this.height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = canDecrement ? '#6200EE' : '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x + this.buttonWidth/2 - 8, this.y + this.height/2);
    ctx.lineTo(this.x + this.buttonWidth/2 + 8, this.y + this.height/2);
    ctx.stroke();

    // Value box
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x + this.buttonWidth, this.y, this.width - 2*this.buttonWidth, this.height);
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + this.buttonWidth, this.y, this.width - 2*this.buttonWidth, this.height);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.value.toString(), this.x + this.width/2, this.y + this.height/2);

    // Increment
    ctx.fillStyle = this.incrementPressed ? '#E0E0E0' : '#F5F5F5';
    ctx.strokeStyle = canIncrement ? '#6200EE' : '#CCCCCC';
    ctx.lineWidth = 2;
    this.roundRect(ctx, this.x + this.width - this.buttonWidth, this.y, this.buttonWidth, this.height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = canIncrement ? '#6200EE' : '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const plusX = this.x + this.width - this.buttonWidth/2;
    const plusY = this.y + this.height/2;
    ctx.beginPath();
    ctx.moveTo(plusX - 8, plusY);
    ctx.lineTo(plusX + 8, plusY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plusX, plusY - 8);
    ctx.lineTo(plusX, plusY + 8);
    ctx.stroke();
  }

  drawCupertino(ctx) {
    const canDecrement = this.value > this.min;
    const canIncrement = this.value < this.max;

    // Container
    ctx.strokeStyle = '#C7C7CC';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.height/2);
    ctx.stroke();

    // Divider
    ctx.beginPath();
    ctx.moveTo(this.x + this.width/2, this.y);
    ctx.lineTo(this.x + this.width/2, this.y + this.height);
    ctx.stroke();

    // Décrement
	if (this.decrementPressed) {
	  ctx.fillStyle = 'rgba(0,0,0,0.1)';
	  this.roundRect(ctx, this.x, this.y, this.width/2, this.height, this.height/2);
	  ctx.fill();
	}

    ctx.strokeStyle = canDecrement ? '#007AFF' : '#C7C7CC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width/4 - 10, this.y + this.height/2);
    ctx.lineTo(this.x + this.width/4 + 10, this.y + this.height/2);
    ctx.stroke();

    if (this.incrementPressed) {
	  ctx.fillStyle = 'rgba(0,0,0,0.1)';
	  this.roundRect(ctx, this.x + this.width/2, this.y, this.width/2, this.height, this.height/2);
	  ctx.fill();
	}
    ctx.strokeStyle = canIncrement ? '#007AFF' : '#C7C7CC';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const plusX = this.x + (this.width*3/4);
    const plusY = this.y + this.height/2;
    ctx.beginPath();
    ctx.moveTo(plusX - 10, plusY);
    ctx.lineTo(plusX + 10, plusY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(plusX, plusY - 10);
    ctx.lineTo(plusX, plusY + 10);
    ctx.stroke();

    // Value
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.value.toString(), this.x + this.width/2, this.y + this.height/2);
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x+radius, y);
    ctx.lineTo(x+width-radius, y);
    ctx.quadraticCurveTo(x+width, y, x+width, y+radius);
    ctx.lineTo(x+width, y+height-radius);
    ctx.quadraticCurveTo(x+width, y+height, x+width-radius, y+height);
    ctx.lineTo(x+radius, y+height);
    ctx.quadraticCurveTo(x, y+height, x, y+height-radius);
    ctx.lineTo(x, y+radius);
    ctx.quadraticCurveTo(x, y, x+radius, y);
    ctx.closePath();
  }

  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    return x >= this.x && x <= this.x + this.width && 
           adjustedY >= this.y && adjustedY <= this.y + this.height;
  }
}

export default Stepper;