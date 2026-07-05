import Component from '../core/Component.js';
import { roundRect, hexToRgb, hexToRgba, darkenColor } from '../core/CanvasUtils.js';

/**
 * Bouton cliquable avec variantes Material et Cupertino.
 *
 * Types Material : 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal'
 * Types Cupertino : 'filled' | 'gray' | 'tinted' | 'bordered' | 'plain'
 * Shapes          : 'rounded' | 'square' | 'pill'
 */
class Button extends Component {
  /**
   * @param {CanvasFramework} framework
   * @param {Object} [options={}]
   * @param {string}  [options.text='Button']
   * @param {number}  [options.fontSize=16]
   * @param {string}  [options.type]          - Variante selon la plateforme
   * @param {string}  [options.shape='rounded'] - 'rounded' | 'square' | 'pill'
   * @param {string}  [options.bgColor]
   * @param {string}  [options.textColor]
   * @param {number}  [options.elevation=2]
   * @param {boolean} [options.disabled=false]
   */
  constructor(framework, options = {}) {
    super(framework, options);

    this.text      = options.text  || '';
    this.fontSize  = options.fontSize || 16;
    this.platform  = framework.platform;
    this.shape     = options.shape || 'rounded';
    this.disabled  = options.disabled || false;

    if (this.platform === 'material') {
      this.type = options.type || 'filled';
      this._setupMaterialStyle(options);
    } else {
      this.type = options.type || 'filled';
      this._setupCupertinoStyle(options);
    }

    // Effet ripple (Material uniquement)
    this.ripples = [];
    this._rafId  = null;

    this.onPress = this._handlePress.bind(this);
  }

  // ─────────────────────────────────────────
  // SETUP STYLES
  // ─────────────────────────────────────────

  /** @private */
  _setupMaterialStyle(options) {
    const base = options.bgColor || '#6200EE';
    this.elevation = options.elevation || 2;

    switch (this.type) {
      case 'filled':
        this.bgColor      = base;
        this.textColor    = options.textColor || '#FFFFFF';
        this.borderWidth  = 0;
        this.rippleColor  = 'rgba(255,255,255,0.3)';
        break;

      case 'outlined':
        this.bgColor      = 'transparent';
        this.textColor    = options.textColor || base;
        this.borderColor  = base;
        this.borderWidth  = 1;
        this.rippleColor  = hexToRgba(base, 0.2);
        this.elevation    = 0;
        break;

      case 'text':
        this.bgColor      = 'transparent';
        this.textColor    = options.textColor || base;
        this.borderWidth  = 0;
        this.rippleColor  = hexToRgba(base, 0.2);
        this.elevation    = 0;
        break;

      case 'elevated':
        this.bgColor      = options.bgColor || '#FFFFFF';
        this.textColor    = options.textColor || base;
        this.borderWidth  = 0;
        this.rippleColor  = hexToRgba(base, 0.2);
        this.elevation    = options.elevation || 4;
        break;

      case 'tonal':
        this.bgColor      = hexToRgba(base, 0.3);
        this.textColor    = options.textColor || base;
        this.borderWidth  = 0;
        this.rippleColor  = hexToRgba(base, 0.3);
        this.elevation    = 0;
        break;

      default:
        this.bgColor      = options.bgColor || '#FFFFFF';
        this.textColor    = options.textColor || base;
        this.borderWidth  = 0;
        this.rippleColor  = hexToRgba(base, 0.2);
        this.elevation    = options.elevation || 4;
    }
  }

  /** @private */
  _setupCupertinoStyle(options) {
    const base = options.bgColor || '#007AFF';

    switch (this.type) {
      case 'filled':
        this.bgColor     = base;
        this.textColor   = options.textColor || '#FFFFFF';
        this.borderWidth = 0;
        break;

      case 'gray':
        this.bgColor     = 'rgba(120,120,128,0.16)';
        this.textColor   = options.textColor || base;
        this.borderWidth = 0;
        break;

      case 'tinted':
        this.bgColor     = hexToRgba(base, 0.2);
        this.textColor   = options.textColor || base;
        this.borderWidth = 0;
        break;

      case 'bordered':
        this.bgColor     = 'transparent';
        this.textColor   = options.textColor || base;
        this.borderColor = base;
        this.borderWidth = 1;
        break;

      case 'plain':
      default:
        this.bgColor     = 'transparent';
        this.textColor   = options.textColor || base;
        this.borderWidth = 0;
    }
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  /** @private */
  _getBorderRadius() {
    if (this.shape === 'square') return 0;
    if (this.shape === 'pill')   return this.height / 2;
    // 'rounded' (défaut)
    return this.platform === 'material' ? 4 : 10;
  }

  // ─────────────────────────────────────────
  // INTERACTIONS
  // ─────────────────────────────────────────

  /** @private */
  _handlePress(x, y) {
    if (this.disabled) return;

    if (this.platform === 'material') {
      const adjY = y - (this.framework.scrollOffset || 0);
      this.ripples.push({
        x: x - this.x,
        y: adjY - this.y,
        radius: 0,
        maxRadius: Math.max(this.width, this.height) * 1.5,
        opacity: 1,
      });
      this._animateRipple();
    }
  }

  /** @private */
  _animateRipple() {
    if (this._rafId) return; // déjà en cours

    const animate = () => {
      if (this._destroyed) { this._rafId = null; return; }

      for (const r of this.ripples) {
        r.radius += r.maxRadius / 15;
        r.opacity -= 0.05;
      }
      this.ripples = this.ripples.filter((r) => r.opacity > 0);

      // Utilise markDirty plutôt que de redessiner tout le canvas
      this.markDirty();

      if (this.ripples.length > 0) {
        this._rafId = requestAnimationFrame(animate);
      } else {
        this._rafId = null;
      }
    };

    this._rafId = requestAnimationFrame(animate);
  }

  // ─────────────────────────────────────────
  // DESSIN
  // ─────────────────────────────────────────

  draw(ctx) {
    ctx.save();

    const radius    = this._getBorderRadius();
    const alpha     = this.disabled ? 0.38 : 1;
    ctx.globalAlpha = alpha;

    // Ombre Material (elevated / filled non pressé)
    if (this.platform === 'material' && (this.elevation || 0) > 0 && !this.pressed) {
      ctx.shadowColor   = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur    = this.elevation * 2;
      ctx.shadowOffsetY = this.elevation;
    }

    // Fond
    if (this.bgColor !== 'transparent') {
      ctx.fillStyle = this.pressed ? darkenColor(this.bgColor) : this.bgColor;
      ctx.beginPath();
      roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.fill();
    }

    // Réinitialiser l'ombre
    ctx.shadowColor   = 'transparent';
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    // Bordure
    if ((this.borderWidth || 0) > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth   = this.borderWidth;
      ctx.beginPath();
      roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.stroke();
    }

    // Ripple (Material)
    if (this.platform === 'material' && this.ripples.length > 0) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.clip();

      for (const r of this.ripples) {
        ctx.globalAlpha = r.opacity * alpha;
        ctx.fillStyle   = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x + r.x, this.y + r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Overlay pressé (iOS)
    if (this.platform === 'cupertino' && this.pressed && this.bgColor !== 'transparent') {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.fill();
    }

    // Texte
    ctx.globalAlpha = alpha;
    ctx.fillStyle =
      this.pressed && this.platform === 'cupertino'
        ? darkenColor(this.textColor)
        : this.textColor;
    ctx.font         = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);

    ctx.restore();
  }

  // ─────────────────────────────────────────
  // HIT TEST
  // ─────────────────────────────────────────

  isPointInside(x, y) {
    if (this.disabled) return false;
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  // ─────────────────────────────────────────
  // DESTROY
  // ─────────────────────────────────────────

  destroy() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.ripples = [];
    super.destroy();
  }
}

export default Button;
