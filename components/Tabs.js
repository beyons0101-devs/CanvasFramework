// components/Tabs.js
import Component from '../core/Component.js';

/**
 * Onglets avec contenu inline pour Material & Cupertino
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

    // Pour éviter les doubles événements
    this.lastEventTime = 0;
    this.lastEventCoords = { x: -1, y: -1 };

    this.onPress = this.handlePress.bind(this);

    // Enfants actifs (children du tab sélectionné)
    this.activeChildren = this.tabs[this.selectedIndex]?.children || [];

    // Monter les enfants initiaux dans le framework
    this.mountActiveChildren();
  }

  // ===================== Montage des enfants =====================
  mountActiveChildren() {
    // Démonter anciens enfants
    if (this.framework && this.framework.remove) {
      for (let child of this.activeChildren) {
        this.framework.remove(child);
      }
    }

    // Monter les nouveaux enfants
    this.activeChildren = this.tabs[this.selectedIndex]?.children || [];
    if (this.framework && this.framework.add) {
      for (let child of this.activeChildren) {
        this.framework.add(child);
        // Position et dimensions par défaut
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

  // ===================== Ripple =====================
  startRippleAnimation() {
    const animate = (timestamp) => {
      if (!this.lastAnimationTime) this.lastAnimationTime = timestamp;
      const deltaTime = timestamp - this.lastAnimationTime;
      this.lastAnimationTime = timestamp;

      let needsUpdate = false;

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += (ripple.maxRadius / 300) * deltaTime;
          needsUpdate = true;
        }
        if (ripple.radius >= ripple.maxRadius * 0.4) {
          ripple.opacity -= 0.003 * deltaTime;
          if (ripple.opacity < 0) ripple.opacity = 0;
          needsUpdate = true;
        }
        if (ripple.opacity <= 0 && ripple.radius >= ripple.maxRadius * 0.95) {
          this.ripples.splice(i, 1);
          needsUpdate = true;
        }
      }

      if (needsUpdate) this.requestRender();

      if (this.ripples.length > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        this.lastAnimationTime = 0;
      }
    };

    if (this.ripples.length > 0 && !this.animationFrame) {
      this.animationFrame = requestAnimationFrame(animate);
    }
  }

  requestRender() {
    if (this.framework && this.framework.requestRender) this.framework.requestRender();
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (super.destroy) super.destroy();
  }

  // ===================== Gestion tab =====================
  handlePress(x, y) {
    // Vérifier d'abord les enfants actifs
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
    const tabsY = this.platform === 'cupertino' ? this.y + this.height : this.y;
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

      // Changement d'onglet
      if (index !== this.selectedIndex) {
        this.selectedIndex = index;
        this.mountActiveChildren();
        if (this.onChange) this.onChange(index, this.tabs[index]);
        this.requestRender();
      }
      return true;
    }

    return false;
  }

  isPointInside(x, y) {
    const tabsY = this.platform === 'cupertino' ? this.y + this.height : this.y;
    return x >= this.x && x <= this.x + this.width &&
           y >= tabsY && y <= tabsY + this.height;
  }

  // ===================== Draw =====================
  draw(ctx) {
    ctx.save();

    const drawTabsTop = this.platform !== 'cupertino';
    const tabsY = drawTabsTop ? this.y : this.y + (this.framework?.height ?? 400) - this.height;

    // Dessiner contenu actif
    for (let child of this.activeChildren) {
      if (typeof child.draw === 'function') {
        child.x = child.x ?? this.x;
        child.y = child.y ?? (drawTabsTop ? this.y + this.height : this.y);
        child.width = child.width ?? this.width;
        child.height = child.height ?? this.getContentHeight();
        child.draw(ctx);
      }
    }

    // Background
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

    // Dessiner les tabs
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const tabX = this.x + i * tabWidth;
      const isSelected = i === this.selectedIndex;
      const color = isSelected ? this.selectedTextColor : this.textColor;

      // Icône
      if (tab.icon) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(tab.icon, tabX + tabWidth / 2, tabsY + 16);
      }

      // Label
      ctx.font = `${isSelected ? 'bold ' : ''}14px -apple-system, Roboto, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelY = tab.icon ? tabsY + 36 : tabsY + this.height / 2;
      ctx.fillText(tab.label, tabX + tabWidth / 2, labelY);

      // Indicateur Material
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
