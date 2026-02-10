import Component from '../core/Component.js';

/**
 * RadioButton Material You & Cupertino
 * @class
 * @extends Component
 */
class RadioButton extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.group = options.group || 'default';
    this.checked = options.checked || false;
    this.label = options.label || '';
    this.labelColor = options.labelColor || (framework.platform === 'material' ? '#1F1F1F' : '#000000');
    this.platform = framework.platform;

    // Cercle
    this.circleSize = 24;           // Taille du bouton
    this.circleRadius = 12;         // Rayon du cercle extérieur
    this.innerRadius = this.circleRadius * 0.5; // Cercle intérieur proportionnel

    // Animation feedback
    this.tapAlpha = 0;              // Pour iOS
    this.ripple = null;             // Pour Material
    this.rippleSpeed = 0.15;

    this.onChange = options.onChange;

    // Calcul largeur totale avec label
    this.width = this.label ? this.circleSize + 8 + this.getTextWidth(this.label) : this.circleSize;
    this.height = this.circleSize;

    this.onClick = this.handleClick.bind(this);
	this.selectionProgress = this.checked ? 1 : 0; // 0 = non sélectionné, 1 = sélectionné
	this.animSpeed = 0.2; // vitesse animation
  }

  getTextWidth(text) {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = this.platform === 'material' ? '16px Roboto' : '16px -apple-system';
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  }

  handleClick(x, y) {
    // Décocher les autres du groupe
    for (let comp of this.framework.components) {
      if (comp instanceof RadioButton && comp.group === this.group && comp !== this) {
        comp.checked = false;
      }
    }
    this.checked = true;

    // Feedback
    if (this.platform === 'material') {
      this.ripple = { x: x - this.x, y: y - this.y, radius: 0, opacity: 0.3 };
      this.animateRipple();
    } else {
      this.tapAlpha = 0.3;
      this.animateTap();
    }

    if (this.onChange) this.onChange(this.checked);
  }

  animateRipple() {
    if (!this.ripple) return;
    const step = () => {
      if (!this.ripple) return;
      this.ripple.radius += this.circleSize * this.rippleSpeed;
      this.ripple.opacity -= 0.02;

      if (this.ripple.opacity <= 0) this.ripple = null;
      else requestAnimationFrame(step);
      this.markDirty();
    };
    step();
  }

  animateTap() {
    const step = () => {
      this.tapAlpha -= 0.03;
      if (this.tapAlpha <= 0) this.tapAlpha = 0;
      else requestAnimationFrame(step);
      this.markDirty();
    };
    step();
  }

  update() {
    const target = this.checked ? 1 : 0;
    this.selectionProgress += (target - this.selectionProgress) * this.animSpeed;
    this.selectionProgress = Math.max(0, Math.min(1, this.selectionProgress));
    
    
  }

  draw(ctx) {
    ctx.save();

    const centerX = this.x + this.circleSize / 2;
    const centerY = this.y + this.circleSize / 2;

    if (this.platform === 'material') {
      // Cercle extérieur
      ctx.strokeStyle = this.checked ? '#6750A4' : '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Cercle intérieur
      if (this.checked) {
        ctx.fillStyle = '#6750A4';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.innerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ripple
      if (this.ripple) {
        ctx.globalAlpha = this.ripple.opacity;
        ctx.fillStyle = '#6750A4';
        ctx.beginPath();
        ctx.arc(this.x + this.ripple.x, this.y + this.ripple.y, this.ripple.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      // Cupertino
      if (this.checked) {
        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Point central blanc
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.innerRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#D1D1D6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tap overlay
      if (this.tapAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${this.tapAlpha})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.circleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
	
	this.update();

	// Cercle intérieur avec animation Material
	if (this.platform === 'material') {
		if (this.selectionProgress > 0) {
			ctx.fillStyle = '#6200EE';
			ctx.beginPath();
			ctx.arc(centerX, centerY, 5 * this.selectionProgress, 0, Math.PI*2);
			ctx.fill();
		}
	}

	// Cercle bleu pour Cupertino
	if (this.platform === 'cupertino' && this.selectionProgress > 0) {
		ctx.fillStyle = '#007AFF';
		ctx.beginPath();
		ctx.arc(centerX, centerY, this.circleRadius * this.selectionProgress, 0, Math.PI*2);
		ctx.fill();

		// Point blanc au centre
		ctx.fillStyle = '#FFFFFF';
		ctx.beginPath();
		ctx.arc(centerX, centerY, 4 * this.selectionProgress, 0, Math.PI*2);
		ctx.fill();
	}

    // Label
    if (this.label) {
      ctx.fillStyle = this.labelColor;
      ctx.font = this.platform === 'material' ? '16px Roboto' : '16px -apple-system';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + this.circleSize + 8, centerY);
    }

    ctx.restore();
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
}

export default RadioButton;
