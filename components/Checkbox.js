import Component from '../core/Component.js';

/**
 * Checkbox Material & Cupertino (iOS-like)
 */
class Checkbox extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.checked = !!options.checked;
    this.label = options.label || '';
    this.platform = framework.platform;
    this.onChange = options.onChange;

    this.boxSize = 22;
    this.padding = 10;

    this.textWidth = this.label
      ? this.getTextWidth(this.label)
      : 0;

    // Largeur totale
    this.width =
      this.platform === 'material'
        ? this.boxSize + this.padding + this.textWidth
        : this.textWidth + 28; // place pour checkmark iOS

    this.height = 28;

    this.onClick = () => {
      this.checked = !this.checked;
      this.onChange?.(this.checked);
    };
  }

  getTextWidth(text) {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    const w = ctx.measureText(text).width;
    ctx.restore();
    return w;
  }

  draw(ctx) {
    ctx.save();
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    const centerY = this.y + this.height / 2;

    if (this.platform === 'material') {
      this.drawMaterial(ctx, centerY);
    } else {
      this.drawCupertino(ctx, centerY);
    }

    ctx.restore();
  }

  /* ---------------- MATERIAL ---------------- */

  drawMaterial(ctx, centerY) {
    const x = this.x;
    const y = centerY - this.boxSize / 2;

    // Box
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.checked ? '#6200EE' : '#757575';
    ctx.fillStyle = this.checked ? '#6200EE' : 'transparent';

    this.roundRect(ctx, x, y, this.boxSize, this.boxSize, 3);
    if (this.checked) ctx.fill();
    ctx.stroke();

    // Check
    if (this.checked) {
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 12);
      ctx.lineTo(x + 9, y + 16);
      ctx.lineTo(x + 17, y + 7);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#000';
    ctx.fillText(
      this.label,
      x + this.boxSize + this.padding,
      centerY
    );
  }

  /* ---------------- CUPERTINO ---------------- */

  /* ---------------- CUPERTINO ---------------- */

drawCupertino(ctx, centerY) {
  const radius = 10;
  const circleX = this.x + radius;
  const circleY = centerY;

  // Cercle
  if (this.checked) {
    ctx.fillStyle = '#007AFF'; // Apple blue
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#C7C7CC'; // iOS gray
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Checkmark
  if (this.checked) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(circleX - 4, circleY);
    ctx.lineTo(circleX - 1, circleY + 3);
    ctx.lineTo(circleX + 5, circleY - 4);
    ctx.stroke();
  }

  // Label
  ctx.fillStyle = '#000';
  ctx.fillText(
    this.label,
    this.x + radius * 2 + this.padding,
    centerY
  );
}

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  isPointInside(x, y) {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }
}

export default Checkbox;
