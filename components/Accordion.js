import Component from '../core/Component.js';

/**
 * Accordion (section extensible) avec styles Material & Cupertino + Ripple centré Android
 * @class
 * @extends Component
 */
class Accordion extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.title = options.title || '';
    this.content = options.content || '';
    this.icon = options.icon || null;
    this.expanded = options.expanded || false;
    this.platform = framework.platform;
    this.headerHeight = 56;
    this.contentPadding = 16;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.borderColor = options.borderColor || '#E0E0E0';
    this.onToggle = options.onToggle;
    this.animating = false;
    this.animProgress = this.expanded ? 1 : 0;

    this.calculateContentHeight();
    this.height = this.headerHeight + (this.expanded ? this.contentHeight : 0);

    // Pour les ripples Material
    this.ripples = [];
    this.rippleColor = 'rgba(1,0,0,0.2)';

    // Clic
    this.onClick = () => {
      if (this.animating) return;

      // Ripple centré Material
      if (this.platform === 'material') {
        this.addRipple();
      }

      this.toggle();
    };
  }

  calculateContentHeight() {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = '14px -apple-system, sans-serif';
    const maxWidth = this.width - this.contentPadding * 2;
    const lines = this.wrapText(ctx, this.content, maxWidth);
    ctx.restore();
    const lineHeight = 20;
    this.contentHeight = lines.length * lineHeight + this.contentPadding * 2;
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) currentLine += ' ' + word;
      else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  toggle() {
    if (this.animating) return;
    this.expanded = !this.expanded;
    if (this.onToggle) this.onToggle(this.expanded);
    this.animate();
  }

  animate() {
    if (this.animating) return;
    this.animating = true;
    const target = this.expanded ? 1 : 0;
    const step = 0.1;

    const doAnimate = () => {
      if (Math.abs(this.animProgress - target) < 0.01) {
        this.animProgress = target;
        this.height = this.headerHeight + this.contentHeight * this.animProgress;
        this.animating = false;
        return;
      }
      this.animProgress += this.animProgress < target ? step : -step;
      this.height = this.headerHeight + this.contentHeight * this.animProgress;
      requestAnimationFrame(doAnimate);
    };
    doAnimate();
  }

  addRipple() {
    const ripple = {
      x: this.width / 2,
      y: this.headerHeight / 2,
      radius: 0,
      maxRadius: Math.max(this.width, this.headerHeight) * 1.5,
      opacity: 0.3
    };
    this.ripples.push(ripple);
    this.animateRipples();
  }

  animateRipples() {
    const animate = () => {
      let active = false;
      for (let ripple of this.ripples) {
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += ripple.maxRadius / 15;
          ripple.opacity -= 0.03;
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

    let headerBg = '#FFFFFF';
    let headerTextColor = '#000000';
    let borderColor = this.borderColor;
    let shadowBlur = 0;
    let chevronWidth = 2;

    if (this.platform === 'material') {
      headerBg = '#F5F5F5';
      headerTextColor = '#212121';
      shadowBlur = 4;
      chevronWidth = 3;
    } else if (this.platform === 'cupertino') {
      headerBg = '#FFFFFF';
      headerTextColor = '#000000';
      borderColor = '#C7C7CC';
      chevronWidth = 1.5;
    }

    // Ombre Material
    if (shadowBlur > 0) {
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Bordure Cupertino
    if (this.platform === 'cupertino') {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    // Header
    ctx.fillStyle = headerBg;
    ctx.fillRect(this.x, this.y, this.width, this.headerHeight);

    // Ripple centré Material
    if (this.platform === 'material' && this.ripples.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width, this.headerHeight);
      ctx.clip();
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Icône
    if (this.icon) {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.icon, this.x + 16, this.y + this.headerHeight / 2);
    }

    // Titre
    ctx.fillStyle = headerTextColor;
    ctx.font =
      this.platform === 'material'
        ? 'bold 16px Roboto, sans-serif'
        : 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleX = this.icon ? this.x + 56 : this.x + 16;
    ctx.fillText(this.title, titleX, this.y + this.headerHeight / 2);

    // Chevron
    const chevronX = this.x + this.width - 30;
    const chevronY = this.y + this.headerHeight / 2;
    const chevronRotation = this.animProgress * Math.PI;
    ctx.save();
    ctx.translate(chevronX, chevronY);
    ctx.rotate(chevronRotation);
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = chevronWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(0, 3);
    ctx.lineTo(6, -3);
    ctx.stroke();
    ctx.restore();

    // Contenu
    if (this.animProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y + this.headerHeight, this.width, this.contentHeight * this.animProgress);
      ctx.clip();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.headerHeight);
      ctx.lineTo(this.x + this.width, this.y + this.headerHeight);
      ctx.stroke();

      ctx.fillStyle = '#666666';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const contentX = this.x + this.contentPadding;
      const contentY = this.y + this.headerHeight + this.contentPadding;
      const maxWidth = this.width - this.contentPadding * 2;
      const lines = this.wrapText(ctx, this.content, maxWidth);
      const lineHeight = 20;
      lines.forEach((line, index) => {
        ctx.fillText(line, contentX, contentY + index * lineHeight);
      });

      ctx.restore();
    }

    ctx.restore();
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.headerHeight;
  }
}

export default Accordion;
