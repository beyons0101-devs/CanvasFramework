// components/Tabs.js
import Component from '../core/Component.js';

/**
 * Onglets avec contenu inline + animation de transition
 * Material & Cupertino
 */
class Tabs extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.tabs = options.tabs || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    this.height = options.height || 48;
    this.indicatorColor = options.indicatorColor || (this.platform === 'material' ? '#6200EE' : '#007AFF');
    this.textColor = options.textColor || '#000000';
    this.selectedTextColor = options.selectedTextColor || this.indicatorColor;

    // Ripple Material
    this.ripples = [];
    this.animationFrame = null;
    this.lastAnimationTime = 0;

    // Éviter double événement
    this.lastEventTime = 0;
    this.lastEventCoords = { x: -1, y: -1 };

    this.onPress = this.handlePress.bind(this);

    // Enfants actifs
    this.activeChildren = this.tabs[this.selectedIndex]?.children || [];
    this.nextChildren = null; // Pour animation
    this.animProgress = 1; // 0 → transition start, 1 → transition end

    this.mountActiveChildren();
  }

  // ===================== Montage enfants =====================
  mountActiveChildren() {
    if (this.framework?.remove) {
      for (let child of this.activeChildren) {
        this.framework.remove(child);
      }
    }

    this.activeChildren = this.tabs[this.selectedIndex]?.children || [];
    if (this.framework?.add) {
      for (let child of this.activeChildren) {
        this.framework.add(child);
        child.x = child.x ?? this.x;
        child.y = child.y ?? this.getContentY();
        child.width = child.width ?? this.width;
        child.height = child.height ?? this.getContentHeight();
      }
    }
  }

  getContentY() {
    return this.platform === 'cupertino' ? this.y : this.y + this.height;
  }

  getContentHeight() {
    return (this.framework?.height ?? 400) - this.height;
  }

  // ===================== Animation =====================
  startAnimation() {
    if (this.animationFrame) return;
    const animate = (timestamp) => {
      if (!this.lastAnimationTime) this.lastAnimationTime = timestamp;
      const delta = timestamp - this.lastAnimationTime;
      this.lastAnimationTime = timestamp;

      if (this.animProgress < 1) {
        this.animProgress += delta / 200; // 200ms pour transition
        if (this.animProgress >= 1) {
          this.animProgress = 1;
          // Fin transition
          if (this.nextChildren) {
            this.activeChildren = this.nextChildren;
            this.nextChildren = null;
          }
        }
        this.requestRender();
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  requestRender() {
    this.framework?.requestRender?.();
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    super.destroy?.();
  }

  // ===================== Gestion tab =====================
  handlePress(x, y) {
    // Vérifier enfants actifs
    for (let child of this.activeChildren) {
      if (child.isPointInside?.(x, y)) {
        if (child.onPress?.(x, y)) return true;
      }
    }

    const now = performance.now();
    const deltaTime = now - this.lastEventTime;
    const deltaX = Math.abs(x - this.lastEventCoords.x);
    const deltaY = Math.abs(y - this.lastEventCoords.y);
    if (deltaX < 2 && deltaY < 2 && deltaTime < 50) return;

    this.lastEventTime = now;
    this.lastEventCoords = { x, y };

    const tabWidth = this.width / this.tabs.length;
    const tabsY = this.platform === 'cupertino' ? this.y + (this.framework?.height ?? 400) - this.height : this.y;
    const index = Math.floor((x - this.x) / tabWidth);

    if (index >= 0 && index < this.tabs.length && y >= tabsY && y <= tabsY + this.height) {
      // Ripple Material
      if (this.platform === 'material') {
        const rippleCenterX = this.x + index * tabWidth + tabWidth / 2;
        const maxRippleRadius = Math.min(tabWidth * 0.6, this.height * 0.8);
        this.ripples.push({
          x: rippleCenterX,
          y: tabsY + this.height / 2,
          radius: 0,
          maxRadius: maxRippleRadius,
          opacity: 1,
          createdAt: now,
          tabIndex: index
        });
        if (!this.animationFrame) this.startRippleAnimation();
        this.requestRender();
      }

      // Changement d'onglet avec animation
      if (index !== this.selectedIndex) {
        this.selectedIndex = index;
        this.nextChildren = this.tabs[index]?.children || [];
        // Position + dimensions
        if (this.framework?.add) {
          for (let child of this.nextChildren) {
            this.framework.add(child);
            child.x = child.x ?? this.x;
            child.y = child.y ?? this.getContentY();
            child.width = child.width ?? this.width;
            child.height = child.height ?? this.getContentHeight();
          }
        }
        this.animProgress = 0;
        this.startAnimation();
        this.onChange?.(index, this.tabs[index]);
      }
      return true;
    }
    return false;
  }

  isPointInside(x, y) {
    const tabsY = this.platform === 'cupertino' ? this.y + (this.framework?.height ?? 400) - this.height : this.y;
    return x >= this.x && x <= this.x + this.width &&
           y >= tabsY && y <= tabsY + this.height;
  }

  // ===================== Draw =====================
  draw(ctx) {
    ctx.save();
    const drawTabsTop = this.platform !== 'cupertino';
    const tabsY = drawTabsTop ? this.y : (this.framework?.height ?? 400) - this.height;

    const contentY = drawTabsTop ? this.y + this.height : this.y;
    const contentHeight = this.getContentHeight();

    // Dessiner enfants actifs avec animation slide/fade
    if (this.animProgress < 1 && this.nextChildren) {
      const offset = (1 - this.animProgress) * this.width * (this.selectedIndex > 0 ? -1 : 1);
      const alpha = this.animProgress;

      // Enfants sortants
      for (let child of this.activeChildren) {
        if (child.draw) {
          child.x = child.x ?? this.x + offset;
          child.y = child.y ?? contentY;
          child.width = child.width ?? this.width;
          child.height = child.height ?? contentHeight;
          ctx.globalAlpha = 1 - alpha;
          child.draw(ctx);
        }
      }

      // Enfants entrants
      for (let child of this.nextChildren) {
        if (child.draw) {
          child.x = child.x ?? this.x + offset + (this.selectedIndex > 0 ? this.width : -this.width);
          child.y = child.y ?? contentY;
          child.width = child.width ?? this.width;
          child.height = child.height ?? contentHeight;
          ctx.globalAlpha = alpha;
          child.draw(ctx);
        }
      }

      ctx.globalAlpha = 1;
    } else {
      // Enfants stables
      for (let child of this.activeChildren) {
        if (child.draw) {
          child.x = child.x ?? this.x;
          child.y = child.y ?? contentY;
          child.width = child.width ?? this.width;
          child.height = child.height ?? contentHeight;
          child.draw(ctx);
        }
      }
    }

    // Background tabs
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, tabsY, this.width, this.height);

    // Bordure
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, tabsY + this.height);
    ctx.lineTo(this.x + this.width, tabsY + this.height);
    ctx.stroke();

    const tabWidth = this.width / this.tabs.length;
    if (this.platform === 'material') this.drawRipples(ctx, tabWidth, tabsY);

    // Dessiner tabs
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const tabX = this.x + i * tabWidth;
      const isSelected = i === this.selectedIndex;
      const color = isSelected ? this.selectedTextColor : this.textColor;

      if (tab.icon) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(tab.icon, tabX + tabWidth / 2, tabsY + 16);
      }

      ctx.font = `${isSelected ? 'bold ' : ''}14px -apple-system, Roboto, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelY = tab.icon ? tabsY + 36 : tabsY + this.height / 2;
      ctx.fillText(tab.label, tabX + tabWidth / 2, labelY);

      if (isSelected && this.platform === 'material') {
        ctx.fillStyle = this.indicatorColor;
        ctx.fillRect(tabX, tabsY + this.height - 2, tabWidth, 2);
      }
    }

    ctx.restore();
  }

  drawRipples(ctx, tabWidth, tabsY) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, tabsY, this.width, this.height);
    ctx.clip();
    for (let ripple of this.ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = this.indicatorColor || '#6200EE';
      ctx.beginPath();
      ctx.arc(ripple.x, tabsY + this.height / 2, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _resize(width) {
    this.width = width;
    this.requestRender();
  }
}

export default Tabs;
