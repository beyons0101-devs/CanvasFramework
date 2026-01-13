import Input from './Input.js';

class TextField extends Input {
  constructor(framework, options = {}) {
    super(framework, options);

    this.label = options.label || '';
    this.helperText = options.helperText || '';
    this.errorText = options.errorText || '';
    this.error = options.error || false;

    // Label position (PLUS HAUT que placeholder)
    this.labelRestY = 14;   // label quand vide / pas focus, légèrement au-dessus du placeholder
	this.labelFloatY = 4;   // label flottant quand focus / value
	this.labelY = this.value ? this.labelFloatY : this.labelRestY;
	this.labelFontSize = this.value ? 12 : 16;

   
    this.labelRestSize = 15;
    this.labelFontSize = this.value
      ? this.labelFloatSize
      : this.labelRestSize;
  }

  animateLabel() {
    const float = this.focused || this.value;

    this.labelY = float ? this.labelFloatY : this.labelRestY;
    this.labelFontSize = float
      ? this.labelFloatSize
      : this.labelRestSize;
  }

  onFocus() {
    super.onFocus();
    this.animateLabel();
  }

  onBlur() {
    super.onBlur();
    this.animateLabel();
  }

  draw(ctx) {
    ctx.save();

    const inputY = this.y + 28;
    const inputHeight = 42;

    /* ================= MATERIAL ================= */
    if (this.platform === 'material') {
      // Label
      ctx.fillStyle = this.error
        ? '#B00020'
        : this.focused
        ? '#6200EE'
        : '#757575';

      ctx.font = `${this.labelFontSize}px Roboto, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(this.label, this.x, this.y + this.labelY);

      // Ligne
      ctx.strokeStyle = this.error
        ? '#B00020'
        : this.focused
        ? '#6200EE'
        : '#CCCCCC';

      ctx.lineWidth = this.focused ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, inputY + inputHeight);
      ctx.lineTo(this.x + this.width, inputY + inputHeight);
      ctx.stroke();

      // Texte / placeholder
      const showPlaceholder = !this.value && !this.focused;
      ctx.fillStyle = showPlaceholder ? '#9E9E9E' : '#000';
      ctx.font = `${this.fontSize}px Roboto, sans-serif`;
      ctx.textBaseline = 'middle';

      ctx.fillText(
        showPlaceholder ? this.placeholder : this.value,
        this.x,
        inputY + inputHeight / 2
      );

      // Curseur
      if (this.focused && this.cursorVisible) {
        const w = ctx.measureText(this.value).width;
        ctx.fillStyle = '#6200EE';
        ctx.fillRect(this.x + w + 2, inputY + 10, 2, inputHeight - 20);
      }
    }

    /* ================= CUPERTINO ================= */
    else {
      // Label (toujours visible)
      ctx.fillStyle = '#6D6D72';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(this.label, this.x, this.y);

      // Box
      ctx.strokeStyle = this.error
        ? '#FF3B30'
        : this.focused
        ? '#007AFF'
        : '#C7C7CC';

      ctx.lineWidth = 1;
      ctx.beginPath();
      this.roundRect(
        ctx,
        this.x,
        inputY,
        this.width,
        inputHeight,
        10
      );
      ctx.stroke();

      // Texte / placeholder
      ctx.fillStyle = this.value ? '#000' : '#8E8E93';
      ctx.font = `${this.fontSize}px -apple-system, sans-serif`;
      ctx.textBaseline = 'middle';

      ctx.fillText(
        this.value || this.placeholder,
        this.x + 12,
        inputY + inputHeight / 2
      );

      // Curseur
      if (this.focused && this.cursorVisible) {
        const w = ctx.measureText(this.value).width;
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(
          this.x + 12 + w + 2,
          inputY + 10,
          2,
          inputHeight - 20
        );
      }
    }

    ctx.restore();
  }
}

export default TextField;
