// components/Banner.js
import Component from '../core/Component.js';

export default class Banner extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.text = options.text || '';
    this.type = options.type || 'info';
    this.actions = options.actions || [];
    this.dismissible = options.dismissible === true;

    this.platform = framework.platform || 'material';

    this.width = options.width || framework.width || window.innerWidth;
    this.x = options.x || 0;
    this.y = options.y || 0;

    this.visible = options.visible !== false;
    this.progress = this.visible ? 1 : 0;
    this.animSpeed = 0.18;

    this._lastUpdate = performance.now();
    this._colors = this._resolveColors();

    this._actionBounds = [];
    this._dismissBounds = null;

    this.selfManagedClicks = true;
    this.ripples = [];

    if (options.ref) options.ref.current = this;

    this._calculateHeight();
    this._setupEventListeners();
	
	this.bgColor = options.bgColor || null;
    this.textColor = options.textColor || null;
	this.buttonColor = options.buttonColor || null;
	this.rippleColor = options.rippleColor || 'rgba(26,115,232,0.2)';
  }

  _setupEventListeners() {
    this._boundHandleClick = this._handleClick.bind(this);
    if (this.framework && this.framework.canvas) {
      this.framework.canvas.addEventListener('click', this._boundHandleClick);
      this.framework.canvas.addEventListener('touchend', this._boundHandleClick);
    }
  }

  _removeEventListeners() {
    if (this.framework && this.framework.canvas && this._boundHandleClick) {
      this.framework.canvas.removeEventListener('click', this._boundHandleClick);
      this.framework.canvas.removeEventListener('touchend', this._boundHandleClick);
    }
  }

  onMount() { this._setupEventListeners(); }
  onUnmount() { this._removeEventListeners(); }

  _resolveColors() {
	  if (this.platform === 'cupertino') {
		return {
		  bg: this.bgColor || 'rgba(250,250,250,0.95)',
		  fg: this.textColor || '#000',
		  accent: this.buttonColor || '#007AFF',
		  divider: 'rgba(60,60,67,0.15)'
		};
	  }

	  const map = {
		info: '#E8F0FE',
		success: '#E6F4EA',
		warning: '#FEF7E0',
		error: '#FCE8E6'
	  };

	  return {
		bg: this.bgColor || map[this.type] || map.info,
		fg: this.textColor || '#1F1F1F',
		accent: this.buttonColor || '#1A73E8'
	  };
  }

  _calculateHeight() {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font =
      this.platform === 'cupertino'
        ? '600 15px -apple-system, SF Pro Display'
        : '400 14px Roboto, sans-serif';

    const maxWidth = this.width - 32; // padding 16px de chaque côté
    const words = this.text.split(' ');
    let lines = [];
    let line = '';

    words.forEach(word => {
      const test = line + word + ' ';
      if (ctx.measureText(test).width < maxWidth) {
        line = test;
      } else {
        lines.push(line);
        line = word + ' ';
      }
    });

    lines.push(line);
    this._lines = lines;

    ctx.restore();
    this.height = Math.max(64, lines.length * 20 + 16); // minimum 64px
  }

  show() { this.visible = true; this.markDirty(); }
  hide() { this.visible = false; this.markDirty(); }

  update() {
    const now = performance.now();
    const dt = Math.min((now - this._lastUpdate) / 16.6, 3);

    const target = this.visible ? 1 : 0;
    this.progress += (target - this.progress) * this.animSpeed * dt;
    this.progress = Math.max(0, Math.min(1, this.progress));

    if (Math.abs(target - this.progress) > 0.01) this.markDirty();
    this._lastUpdate = now;
  }

  addRipple(x, y) {
    if (this.platform !== 'material') return;

    this.ripples.push({
      x, y,
      radius: 0,
      maxRadius: Math.max(this.width, this.height),
      opacity: 0.3
    });

    this.animateRipples();
  }

  animateRipples() {
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
    this.update();
    if (this.progress <= 0.01) return;

    const visibleHeight = this.height * this.progress;
    ctx.save();

    // Shadow pour Material
    if (this.platform === 'material') {
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
    }

    // Background
    ctx.fillStyle = this._colors.bg;
    ctx.fillRect(this.x, this.y, this.width, visibleHeight);
    ctx.shadowColor = 'transparent';

    // Divider iOS
    if (this.platform === 'cupertino') {
      ctx.strokeStyle = this._colors.divider;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + visibleHeight);
      ctx.lineTo(this.x + this.width, this.y + visibleHeight);
      ctx.stroke();
    }

    // Ripple Material
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width, visibleHeight);
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

    // Text
    ctx.fillStyle = this._colors.fg;
    ctx.font =
      this.platform === 'cupertino'
        ? '600 15px -apple-system, SF Pro Display'
        : '400 14px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillText(this.text, this.x + 16, this.y + visibleHeight / 2);

    // Actions
    this._actionBounds = [];
    let x = this.width - 16;
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const action = this.actions[i];
      const textWidth = ctx.measureText(action.label).width + 20;
      x -= textWidth;

      ctx.fillStyle = this._colors.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(action.label, this.x + x + textWidth / 2, this.y + visibleHeight / 2);

      this._actionBounds.push({
        action: action,
        bounds: { x: this.x + x, y: this.y + (visibleHeight - 44)/2, w: textWidth, h: 44 }
      });

      x -= 12;
    }

    // Dismiss button
    if (this.dismissible) {
      const hitSize = 44;
      const cx = this.width - 28;
      const cy = this.y + visibleHeight / 2;

      ctx.fillStyle = this.platform === 'cupertino' ? 'rgba(60,60,67,0.6)' : this._colors.fg;
      ctx.font = this.platform === 'cupertino' ? '600 16px -apple-system' : '500 16px Roboto';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', cx, cy);

      this._dismissBounds = { x: cx - hitSize/2, y: cy - hitSize/2, w: hitSize, h: hitSize };
    } else {
      this._dismissBounds = null;
    }

    ctx.restore();
  }

  _handleClick(event) {
    if (this.progress < 0.95) return;

    let clientX = event.clientX, clientY = event.clientY;
    if (event.type === 'touchend') {
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    const canvasRect = this.framework.canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;

    // Ripple effect sur banner
    if (this.platform === 'material') this.addRipple(x - this.x, y - this.y);

    if (x < this.x || x > this.x + this.width || y < this.y || y > this.y + this.height) return;

    event.stopPropagation();

    // Dismiss
    if (this.dismissible && this._dismissBounds) {
      const b = this._dismissBounds;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.hide();
        return;
      }
    }

    // Actions
    if (this._actionBounds.length) {
      for (const item of this._actionBounds) {
        const b = item.bounds;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          item.action.onClick?.();
          return;
        }
      }
    }
  }
}
