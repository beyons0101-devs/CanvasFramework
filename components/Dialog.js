import Component from '../core/Component.js';

/**
 * Dialog Material (Android) & Cupertino (iOS)
 */
class Dialog extends Component {
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: framework.height,
      visible: false
    });

    this.platform = framework.platform;

    this.title = options.title || '';
    this.message = options.message || '';
    this.buttons = options.buttons || ['OK'];
    this.onButtonClick = options.onButtonClick;

    this.dialogWidth = Math.min(320, framework.width - 40);
    this.dialogHeight = 160;
    this.opacity = 0;

    this.isVisible = false;
    this.buttonRects = [];

    /* Ripple Android uniquement */
    this.ripples = [];
    this._animating = false;

    this.onPress = this.handlePress.bind(this);

    this.messageLines = this.wrapText(
      this.message,
      this.dialogWidth - 48,
      '16px -apple-system, Roboto, sans-serif'
    );

    if (this.messageLines.length > 2) {
      this.dialogHeight += (this.messageLines.length - 2) * 22;
    }
  }

  /* ---------------- DRAW ---------------- */

  draw(ctx) {
    if (!this.isVisible || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);

    if (this.platform === 'material') {
      this.drawMaterial(ctx);
    } else {
      this.drawCupertino(ctx); // 👈 TON DESIGN INITIAL
    }

    ctx.restore();
  }

  /* ---------------- MATERIAL (ANDROID) ---------------- */

  drawMaterial(ctx) {
    const x = (this.framework.width - this.dialogWidth) / 2;
    const y = (this.framework.height - this.dialogHeight) / 2;

    // Card
    ctx.fillStyle = '#FFF';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 12;
    this.roundRect(ctx, x, y, this.dialogWidth, this.dialogHeight, 6);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Title
    ctx.fillStyle = '#000';
    ctx.font = '500 20px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.title, x + 24, y + 36);

    // Message
    ctx.fillStyle = '#444';
    ctx.font = '16px Roboto, sans-serif';
    for (let i = 0; i < this.messageLines.length; i++) {
      ctx.fillText(this.messageLines[i], x + 24, y + 70 + i * 22);
    }

    // Buttons
    this.buttonRects = [];
    let btnX = x + this.dialogWidth - 16;
    const btnY = y + this.dialogHeight - 28;

    ctx.font = '500 14px Roboto, sans-serif';

    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const text = this.buttons[i];
      const w = ctx.measureText(text).width + 24;

      btnX -= w;

      const rect = {
        x: btnX,
        y: btnY - 18,
        width: w,
        height: 36,
        index: i
      };
      this.buttonRects[i] = rect;

      // Ripple
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();

      for (const r of this.ripples) {
        if (r.index === i) {
          ctx.globalAlpha = r.alpha;
          ctx.fillStyle = 'rgba(98,0,238,0.25)';
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.fillStyle = '#6200EE';
      ctx.textAlign = 'center';
      ctx.fillText(text, btnX + w / 2, btnY);

      btnX -= 8;
    }
  }

  /* ---------------- CUPERTINO (iOS) — DESIGN ORIGINAL ---------------- */

  drawCupertino(ctx) {
    const x = (this.framework.width - this.dialogWidth) / 2;
    const y = (this.framework.height - this.dialogHeight) / 2;

    // Dialog
    ctx.fillStyle = '#FFF';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    this.roundRect(ctx, x, y, this.dialogWidth, this.dialogHeight, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Title
    ctx.fillStyle = '#000';
    ctx.font = '600 18px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, x + this.dialogWidth / 2, y + 38);

    // Message
    ctx.fillStyle = '#666';
    ctx.font = '16px -apple-system, sans-serif';
    for (let i = 0; i < this.messageLines.length; i++) {
      ctx.fillText(
        this.messageLines[i],
        x + this.dialogWidth / 2,
        y + 72 + i * 22
      );
    }

    // Divider
    const dividerY = y + this.dialogHeight - 54;
    ctx.strokeStyle = '#E5E5EA';
    ctx.beginPath();
    ctx.moveTo(x, dividerY);
    ctx.lineTo(x + this.dialogWidth, dividerY);
    ctx.stroke();

    // Buttons
    this.buttonRects = [];
    const btnW = this.dialogWidth / this.buttons.length;
    const btnH = 54;

    for (let i = 0; i < this.buttons.length; i++) {
      const bx = x + i * btnW;
      const by = dividerY;

      this.buttonRects.push({
        x: bx,
        y: by,
        width: btnW,
        height: btnH
      });

      ctx.fillStyle =
        i === this.buttons.length - 1 ? '#007AFF' : '#8E8E93';

      ctx.font = '600 17px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.buttons[i], bx + btnW / 2, by + btnH / 2);

      if (i < this.buttons.length - 1) {
        ctx.strokeStyle = '#E5E5EA';
        ctx.beginPath();
        ctx.moveTo(bx + btnW, by);
        ctx.lineTo(bx + btnW, by + btnH);
        ctx.stroke();
      }
    }
  }

  /* ---------------- INTERACTION ---------------- */

  handlePress(x, y) {
    for (let i = 0; i < this.buttonRects.length; i++) {
      const r = this.buttonRects[i];
      if (
        x >= r.x && x <= r.x + r.width &&
        y >= r.y && y <= r.y + r.height
      ) {
        if (this.platform === 'material') {
          const max = Math.max(r.width, r.height) * 1.4;
          this.ripples.push({
            index: i,
            x,
            y,
            radius: 0,
            alpha: 0.35,
            max
          });
          this.animateRipples();
        }

        setTimeout(() => {
          this.onButtonClick?.(i, this.buttons[i]);
          this.hide();
        }, 120);
        return;
      }
    }

    this.hide();
  }

  animateRipples() {
    if (this._animating) return;
    this._animating = true;

    const step = () => {
      let active = false;

      for (const r of this.ripples) {
        r.radius += r.max * 0.12;
        r.alpha -= 0.04;
        if (r.alpha > 0) active = true;
      }

      this.ripples = this.ripples.filter(r => r.alpha > 0);

      if (active) requestAnimationFrame(step);
      else this._animating = false;
    };

    requestAnimationFrame(step);
  }

  /* ---------------- SHOW / HIDE ---------------- */

  show() {
    this.isVisible = true;
    this.visible = true;
    this.opacity = 0;

    const fade = () => {
      this.opacity += 0.1;
      if (this.opacity < 1) requestAnimationFrame(fade);
    };
    fade();
  }

  hide() {
    const fade = () => {
      this.opacity -= 0.1;
      if (this.opacity > 0) requestAnimationFrame(fade);
      else {
        this.isVisible = false;
        this.visible = false;
        this.framework.remove(this);
      }
    };
    fade();
  }

  /* ---------------- UTILS ---------------- */

  wrapText(text, maxWidth, font) {
    const ctx = this.framework.ctx;
    ctx.font = font;

    const words = text.split(' ');
    const lines = [];
    let line = words[0];

    for (let i = 1; i < words.length; i++) {
      const test = line + ' ' + words[i];
      if (ctx.measureText(test).width < maxWidth) line = test;
      else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
    return lines;
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

  isPointInside() {
    return this.isVisible;
  }
}

export default Dialog;
