import Component from '../core/Component.js';

/**
 * Barre d'application supérieure (Material & Cupertino)
 * @class
 * @extends Component
 */
class AppBar extends Component {
  constructor(framework, options = {}) {
    // Détection automatique Material ou Cupertino
    const platform = options.platform || (() => {
      if (framework.platform) return framework.platform;
      return /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'cupertino' : 'material';
    })();

    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: options.height || (platform === 'material' ? 56 : 44),
      ...options
    });

    this.title = options.title || '';
    this.leftIcon = options.leftIcon || null;
    this.rightIcon = options.rightIcon || null;
    this.onLeftClick = options.onLeftClick;
    this.onRightClick = options.onRightClick;
    this.platform = platform;

    // Couleurs et styles par plateforme
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#6200EE';
      this.textColor = options.textColor || '#FFFFFF';
      this.elevation = options.elevation !== undefined ? options.elevation : 4;
    } else {
      // Cupertino (iOS)
      this.bgColor = options.bgColor || 'rgba(248, 248, 248, 0.95)';
      this.textColor = options.textColor || '#000000';
      this.elevation = 0;
    }

    // Ripples (Material)
    this.ripples = [];
    this.animationFrame = null;
    this.lastAnimationTime = 0;

    // États press (iOS)
    this.leftPressed = false;
    this.rightPressed = false;

    this.onPress = this.handlePress.bind(this);
  }

  draw(ctx) {
    ctx.save();

    // Ombre Material
    if (this.platform === 'material' && this.elevation > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = this.elevation * 2;
      ctx.shadowOffsetY = this.elevation / 2;
    }

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Bordure iOS
    if (this.platform === 'cupertino') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height - 0.5);
      ctx.lineTo(this.x + this.width, this.y + this.height - 0.5);
      ctx.stroke();
    }

    // Ripples pour Material
    if (this.platform === 'material') this.drawRipples(ctx);

    // Overlay pressed iOS
    if (this.platform === 'cupertino') {
      if (this.leftPressed && this.leftIcon) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.arc(this.x + 28, this.y + this.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.rightPressed && this.rightIcon) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 28, this.y + this.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Titre
    ctx.fillStyle = this.textColor;
    const titleAlign = this.platform === 'material' && this.leftIcon ? 'left' : 'center';
    const titleX = titleAlign === 'left' ? this.x + 72 : this.x + this.width / 2;
    ctx.font = `${this.platform === 'material' ? 'bold ' : ''}20px -apple-system, Roboto, sans-serif`;
    ctx.textAlign = titleAlign;
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, titleX, this.y + this.height / 2);

    // Icônes
    if (this.leftIcon) this.drawLeftIcon(ctx);
    if (this.rightIcon) this.drawRightIcon(ctx);

    ctx.restore();
  }

  drawRipples(ctx) {
    for (let ripple of this.ripples) {
      ctx.save();
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawLeftIcon(ctx) {
    const color = this.platform === 'cupertino' ? this.textColor : this.textColor;
    if (this.leftIcon === 'menu') this.drawMenuIcon(ctx, this.x + 16, this.y + this.height / 2, color);
    if (this.leftIcon === 'back') this.drawBackIcon(ctx, this.x + 16, this.y + this.height / 2, color);
  }

  drawRightIcon(ctx) {
    const color = this.platform === 'cupertino' ? '#007AFF' : this.textColor;
    if (this.rightIcon === 'search') this.drawSearchIcon(ctx, this.x + this.width - 36, this.y + this.height / 2, color);
    if (this.rightIcon === 'more') this.drawMoreIcon(ctx, this.x + this.width - 36, this.y + this.height / 2, color);
  }

  drawMenuIcon(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 8 + i * 8);
      ctx.lineTo(x + 24, y - 8 + i * 8);
      ctx.stroke();
    }
  }

  drawBackIcon(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 10);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x + 16, y + 10);
    ctx.stroke();
  }

  drawSearchIcon(ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x + 8, y - 2, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 4);
    ctx.lineTo(x + 20, y + 10);
    ctx.stroke();
  }

  drawMoreIcon(ctx, x, y, color) {
    ctx.fillStyle = color;
    const spacing = this.platform === 'material' ? 10 : 8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + 12, y - spacing + i * spacing, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  handlePress(x, y) {
    const inY = y >= this.y && y <= this.y + this.height;

    if (!inY) return false;

    // Bouton gauche
    if (this.leftIcon && x >= this.x && x <= this.x + 56) {
      if (this.platform === 'material') this.addRipple(this.x + 28, this.y + this.height / 2);
      else this.leftPressed = true, setTimeout(() => this.leftPressed = false, 150);
      if (this.onLeftClick) this.onLeftClick();
      return true;
    }

    // Bouton droit
    if (this.rightIcon && x >= this.x + this.width - 56 && x <= this.x + this.width) {
      if (this.platform === 'material') this.addRipple(this.x + this.width - 28, this.y + this.height / 2);
      else this.rightPressed = true, setTimeout(() => this.rightPressed = false, 150);
      if (this.onRightClick) this.onRightClick();
      return true;
    }

    return false;
  }

  addRipple(x, y) {
    this.ripples.push({
      x, y,
      radius: 0,
      maxRadius: 28,
      opacity: 1,
      createdAt: performance.now()
    });
    if (!this.animationFrame) this.startRippleAnimation();
  }

  startRippleAnimation() {
    const animate = (timestamp) => {
      if (!this.lastAnimationTime) this.lastAnimationTime = timestamp;
      const deltaTime = timestamp - this.lastAnimationTime;
      this.lastAnimationTime = timestamp;
      let needsUpdate = false;

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        if (ripple.radius < ripple.maxRadius) ripple.radius += (ripple.maxRadius / 250) * deltaTime, needsUpdate = true;
        if (ripple.radius >= ripple.maxRadius * 0.4) ripple.opacity -= (0.003 * deltaTime), ripple.opacity < 0 && (ripple.opacity = 0), needsUpdate = true;
        if (ripple.opacity <= 0 && ripple.radius >= ripple.maxRadius * 0.95) this.ripples.splice(i, 1), needsUpdate = true;
      }

      if (needsUpdate) this.requestRender();
      if (this.ripples.length > 0) this.animationFrame = requestAnimationFrame(animate);
      else this.animationFrame = null, this.lastAnimationTime = 0;
    };

    if (this.ripples.length > 0 && !this.animationFrame) this.animationFrame = requestAnimationFrame(animate);
  }

  requestRender() {
    if (this.framework && this.framework.requestRender) this.framework.requestRender();
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame), this.animationFrame = null;
    super.destroy();
  }
}

export default AppBar;
