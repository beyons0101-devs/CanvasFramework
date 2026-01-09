import Component from '../core/Component.js';

/**
 * Élément de liste avec support swipe et actions
 * @class
 * @extends Component
 * @property {string} title - Titre
 * @property {string} subtitle - Sous-titre
 * @property {Array<{icon?: string, text: string, color: string, onClick: Function}>} leftActions - Actions swipe gauche
 * @property {Array<{icon?: string, text: string, color: string, onClick: Function}>} rightActions - Actions swipe droite
 * @property {string} bgColor - Couleur de fond
 * @property {string} platform - Plateforme ('material' ou 'cupertino')
 * @property {number} height - Hauteur de l'item
 */
class SwipeableListItem extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.title = options.title || '';
    this.subtitle = options.subtitle || '';
    this.height = options.height || (this.subtitle ? 72 : 56);
    this.width = options.width || framework.width;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.platform = framework.platform;

    this.leftActions = options.leftActions || [];
    this.rightActions = options.rightActions || [];

    this.dragOffset = 0;
    this.dragging = false;
    this.startX = 0;

    this.ripples = [];
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Début du swipe
   * @param {number} x
   * @param {number} y
   */
  onDragStart(x, y) {
    if (this.isPointInside(x, y)) {
      this.dragging = true;
      this.startX = x;
    }
  }

  /**
   * Déplacement pendant swipe
   * @param {number} x
   */
  onDragMove(x) {
    if (this.dragging) {
      this.dragOffset = x - this.startX;
      const maxOffset = Math.max(this.leftActions.length, this.rightActions.length) * 80;
      this.dragOffset = Math.min(Math.max(this.dragOffset, -maxOffset), maxOffset);
    }
  }

  /**
   * Fin du swipe
   */
  onDragEnd() {
    if (this.dragging) {
      if (this.dragOffset > 80 && this.leftActions[0]) {
        this.leftActions[0].onClick?.();
      } else if (this.dragOffset < -80 && this.rightActions[0]) {
        this.rightActions[0].onClick?.();
      }
      this.dragOffset = 0;
      this.dragging = false;
    }
  }

  /**
   * Gestion du press pour ripple Material
   * @param {number} x
   * @param {number} y
   */
  handlePress(x, y) {
    if (this.platform === 'material') {
      const adjustedY = y - this.framework.scrollOffset;
      this.ripples.push({
        x: x - this.x,
        y: adjustedY - this.y,
        radius: 0,
        maxRadius: Math.max(this.width, this.height) * 1.5,
        opacity: 1
      });
      this.animateRipple();
    }
  }

  animateRipple() {
    const animate = () => {
      let hasActive = false;
      for (let ripple of this.ripples) {
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += ripple.maxRadius / 15;
          hasActive = true;
        }
        if (ripple.radius >= ripple.maxRadius * 0.5) ripple.opacity -= 0.05;
      }
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      if (hasActive) requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Dessine l'item
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();

    // Actions swipe
    if (this.dragOffset > 0 && this.leftActions[0]) {
      ctx.fillStyle = this.leftActions[0].color || '#388E3C';
      ctx.fillRect(this.x, this.y, this.dragOffset, this.height);
      ctx.fillStyle = '#FFF';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.leftActions[0].text, this.x + this.dragOffset / 2, this.y + this.height / 2);
    } else if (this.dragOffset < 0 && this.rightActions[0]) {
      const offset = -this.dragOffset;
      ctx.fillStyle = this.rightActions[0].color || '#D32F2F';
      ctx.fillRect(this.x + this.width - offset, this.y, offset, this.height);
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText(this.rightActions[0].text, this.x + this.width - offset / 2, this.y + this.height / 2);
    }

    ctx.translate(this.dragOffset, 0);

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Ripple
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width, this.height);
      ctx.clip();
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Texte
    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, this.x + 16, this.y + this.height / 2);
    if (this.subtitle) {
      ctx.fillStyle = '#757575';
      ctx.font = '14px sans-serif';
      ctx.fillText(this.subtitle, this.x + 16, this.y + this.height / 2 + 12);
    }

    ctx.restore();
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
}

export default SwipeableListItem;
