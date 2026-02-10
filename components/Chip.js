import Component from '../core/Component.js';

class Chip extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.text = options.text || '';
    this.icon = options.icon || null;
    this.closable = options.closable !== false;
    this.platform = framework.platform; // 'material' ou 'cupertino'
    this.onClose = options.onClose;

    // Couleurs par défaut selon platform
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#E0E0E0';
      this.textColor = options.textColor || '#1F1F1F';
      this.rippleColor = options.rippleColor || 'rgba(0,0,0,0.12)';
    } else { // Cupertino
      this.bgColor = options.bgColor || 'rgba(242,242,247,0.95)';
      this.textColor = options.textColor || '#000';
    }

    // Dimensions
    const ctx = framework.ctx;
    ctx.font = '14px -apple-system, sans-serif';
    const textWidth = ctx.measureText(this.text).width;
    const iconWidth = this.icon ? 20 : 0;
    const closeWidth = this.closable ? 24 : 0;
    this.width = iconWidth + textWidth + closeWidth + 24;
    this.height = options.height || 32;
    this.borderRadius = this.height / 2;

    // Ripple pour Material
    this.ripples = [];
    this.pressed = false;

    this.closeButtonRect = null;
    this.onPress = this.handlePress.bind(this);
  }

  addRipple(x, y) {
    const ripple = {
      x, y,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 1.5,
      opacity: 0.3
    };
    this.ripples.push(ripple);

    const animate = () => {
      let active = false;
      for (let r of this.ripples) {
        if (r.radius < r.maxRadius) {
          r.radius += r.maxRadius / 15;
          r.opacity -= 0.03;
          active = true;
        }
      }
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      if (active) requestAnimationFrame(animate);
    };
    animate();
  }

  draw(ctx) {
    ctx.save();

    // Background
    ctx.fillStyle = this.pressed && this.platform === 'cupertino'
      ? this.darkenColor(this.bgColor, 0.1)
      : this.bgColor;

    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    let offsetX = this.x + 12;

    // Icon
    if (this.icon) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = this.textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.icon, offsetX, this.y + this.height / 2);
      offsetX += 20;
    }

    // Text
    ctx.font = this.platform === 'material'
      ? '500 14px Roboto, sans-serif'
      : '400 14px -apple-system';
    ctx.fillStyle = this.textColor;
    ctx.fillText(this.text, offsetX, this.y + this.height / 2);

    // Ripple (Material)
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();

      this.ripples.forEach(r => {
        ctx.globalAlpha = r.opacity;
        ctx.fillStyle = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x + r.x, this.y + r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Close button
    if (this.closable) {
      const cx = this.x + this.width - 20;
      const cy = this.y + this.height / 2;
      this.closeButtonRect = { x: cx - 8, y: cy - 8, width: 16, height: 16 };

      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.textColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.moveTo(cx + 4, cy - 4);
      ctx.lineTo(cx - 4, cy + 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  handlePress(x, y) {
    // Vérifie bouton close
    if (this.closable && this.closeButtonRect) {
      if (x >= this.closeButtonRect.x && x <= this.closeButtonRect.x + this.closeButtonRect.width &&
          y >= this.closeButtonRect.y && y <= this.closeButtonRect.y + this.closeButtonRect.height) {
        this.onClose?.();
        return;
      }
    }

    // Ripple Material
    if (this.platform === 'material') {
      this.addRipple(x - this.x, y - this.y);
    } else {
      // Feedback press Cupertino
      this.pressed = true;
      setTimeout(() => { this.pressed = false; this.markDirty(); }, 100);
    }

    this.onClick?.();
  }

  roundRect(ctx, x, y, w, h, r) {
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

  darkenColor(color, factor = 0.2) {
    if (color.startsWith('#')) {
      const { r, g, b } = this.hexToRgb(color);
      return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
    }
    return color;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}

export default Chip;
