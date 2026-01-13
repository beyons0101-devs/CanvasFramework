import Component from '../core/Component.js';

/**
 * BottomSheet avec styles Material et Cupertino
 * @class
 * @extends Component
 */
class BottomSheet extends Component {
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: framework.height,
      width: framework.width,
      height: options.height || framework.height * 0.6,
      visible: false
    });

    this.platform = framework.platform; // material / cupertino

    this.children = [];
    this.dragHandle = options.dragHandle !== false;
    this.closeOnOverlayClick = options.closeOnOverlayClick !== false;

    // Styles plateforme
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#FFFFFF';
      this.overlayColor = 'rgba(0,0,0,0.5)';
      this.shadowBlur = 20;
      this.shadowOffsetY = -5;
      this.borderRadius = 11;
    } else { // cupertino
      this.bgColor = options.bgColor || 'rgba(255,255,255,0.95)';
      this.overlayColor = 'rgba(0,0,0,0.2)';
      this.shadowBlur = 0;
      this.shadowOffsetY = 0;
      this.borderRadius = options.borderRadius || 20;
    }

    this.targetY = framework.height;
    this.isOpen = false;
    this.animating = false;
    this.dragging = false;
    this.dragStartY = 0;
    this.dragOffset = 0;
    this.lastClickTime = 0;

    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onRelease = this.handleRelease.bind(this);
  }

  add(child) {
    this.children.push(child);
    return child;
  }

  open() {
    this.visible = true;
    this.isOpen = true;
    this.targetY = this.framework.height - this.height;
    this.animate();
  }

  close() {
    this.isOpen = false;
    this.targetY = this.framework.height;
    this.animate(() => {
      this.visible = false;
    });
  }

  animate(callback) {
    if (this.animating) return;
    this.animating = true;

    const step = () => {
      let diff = this.targetY - this.y;

      if (Math.abs(diff) < 1) {
        this.y = this.targetY;
        this.animating = false;
        if (callback) callback();
        return;
      }

      // Animation type spring pour iOS, easing pour Material
      if (this.platform === 'cupertino') {
        diff *= 0.15; // spring
      } else {
        diff *= 0.2; // easing
      }

      this.y += diff;

      requestAnimationFrame(step);
    };

    step();
  }

  handlePress(x, y) {
    const now = Date.now();
    if (now - this.lastClickTime < 300) return;
    this.lastClickTime = now;

    if (y < this.y && this.closeOnOverlayClick) {
      this.close();
      return;
    }

    // Clic sur la poignée
	if (this.dragHandle && y >= this.y && y <= this.y + 40) {
	  // ✅ Fermer le bottom sheet immédiatement
	  this.close();
	  return;
	}

    // Gestion clic enfants
    const contentY = this.y + (this.dragHandle ? 40 : 16);
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (!child.visible) continue;

      const childAbsX = this.x + 16 + child.x;
      const childAbsY = contentY + child.y;

      if (x >= childAbsX && x <= childAbsX + child.width &&
          y >= childAbsY && y <= childAbsY + child.height) {
        if (child.onClick) child.onClick();
        return;
      }
    }
  }

  handleMove(x, y) {
    if (!this.dragging) return;
    this.dragOffset = y - this.dragStartY;
    let newY = (this.framework.height - this.height) + this.dragOffset;
    if (newY >= this.framework.height - this.height) this.y = newY;
  }

  handleRelease() {
    if (!this.dragging) return;
    this.dragging = false;
    this.framework.activeComponent = null;

    if (this.dragOffset > this.height * 0.3) this.close();
    else {
      this.targetY = this.framework.height - this.height;
      this.animate();
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    ctx.save();

    // Overlay
    ctx.fillStyle = this.overlayColor;
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);

    // Sheet
    ctx.fillStyle = this.bgColor;
    ctx.shadowColor = this.platform === 'material' ? 'rgba(0,0,0,0.3)' : 'transparent';
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetY = this.shadowOffsetY;

    ctx.beginPath();
    this.roundRectTop(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Drag handle
    if (this.dragHandle) {
      ctx.fillStyle = this.platform === 'material' ? '#CCCCCC' : '#E0E0E0';
      ctx.beginPath();
      this.roundRect(ctx, this.width / 2 - 20, this.y + 12, 40, 4, 2);
      ctx.fill();
    }

    // Enfants
    const contentY = this.y + (this.dragHandle ? 40 : 16);
    const contentHeight = this.height - (this.dragHandle ? 40 : 16);

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, contentY, this.width, contentHeight);
    ctx.clip();

    for (let child of this.children) {
      if (!child.visible) continue;
      const origX = child.x;
      const origY = child.y;
      child.x = this.x + 16 + origX;
      child.y = contentY + origY;
      child.draw(ctx);
      child.x = origX;
      child.y = origY;
    }

    ctx.restore();
    ctx.restore();
  }

  roundRectTop(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  roundRect(ctx, x, y, width, height, radius) {
    if (radius === 0) return ctx.rect(x, y, width, height);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  isPointInside(x, y) {
    return this.visible;
  }
}

export default BottomSheet;
