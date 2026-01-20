import AppBar from './AppBar.js';
/**
 * SliverAppBar - CanvasFramework
 * Collapse / Stretch / Parallax
 * Compatible Material & Cupertino
 * ⚠️ Ne modifie PAS AppBar
 */
class SliverAppBar extends AppBar {
  constructor(framework, options = {}) {
    super(framework, {
      ...options,
      y: 0
    });
    // Heights
    this.expandedHeight = options.expandedHeight || 240;
    this.collapsedHeight = options.collapsedHeight ?? 56;
    // Effects
    this.stretch = options.stretch ?? true;
    this.parallax = options.parallax ?? true;
    this.parallaxFactor = options.parallaxFactor ?? 0.4;
    // Background
    this.backgroundImage = options.backgroundImage || null;
    this.backgroundColor = options.backgroundColor || this.bgColor || '#FFFFFF';
    this.backgroundOpacity = this._extractOpacity(this.backgroundColor);
    // Overlay (au-dessus de l'image)
    this.overlayColor = options.overlayColor || '#000000';
    this.overlayOpacity = options.overlayOpacity ?? 0;
    // Foreground (titre + icônes)
    this.foregroundColor = options.foregroundColor || options.textColor || this.textColor || '#FFFFFF';
    // SliverAppBar participe au scroll
    this.fixed = false;
  }
  
  /**
   * Extrait l'opacité d'une couleur rgba() ou retourne 1
   */
  _extractOpacity(color) {
    if (typeof color === 'string' && color.startsWith('rgba')) {
      const match = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
      return match ? parseFloat(match[1]) : 1;
    }
    return 1;
  }
  
  /**
   * Mise à jour dynamique selon le scroll
   */
  updateWithScroll(scrollOffset) {
    const scrollY = -scrollOffset;
    const collapseRange = this.expandedHeight - this.collapsedHeight;
    const collapse = Math.min(scrollY, collapseRange);
    let newHeight = this.expandedHeight - collapse;
    // Stretch (overscroll)
    if (scrollY < 0 && this.stretch) {
      newHeight = this.expandedHeight - scrollY;
    }
    this.height = Math.max(newHeight, this.collapsedHeight);
  }
  
  draw(ctx) {
    const scrollOffset = this.framework.scrollOffset || 0;
    this.updateWithScroll(scrollOffset);
    ctx.save();
    // ===== Collapse progress (0 → 1)
    const collapseProgress = Math.min(
      1,
      Math.max(
        0,
        (this.expandedHeight - this.height) /
        (this.expandedHeight - this.collapsedHeight)
      )
    );
    // ===== BACKGROUND IMAGE (en premier) =====
    if (this.backgroundImage && this.backgroundImage.complete) {
      let bgOffset = 0;
      if (this.parallax) {
        bgOffset = Math.max(0, -scrollOffset * this.parallaxFactor);
      }
      ctx.drawImage(
        this.backgroundImage,
        this.x,
        this.y - bgOffset,
        this.width,
        this.height + bgOffset
      );
    }
    
    // ===== BACKGROUND COLOR (overlay coloré au-dessus de l'image) =====
    ctx.globalAlpha = this.backgroundOpacity;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = 1;
    
    // ===== OVERLAY SUPPLÉMENTAIRE (si besoin) =====
    if (this.overlayOpacity > 0) {
      ctx.globalAlpha = this.overlayOpacity;
      ctx.fillStyle = this.overlayColor;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.globalAlpha = 1;
    }
    // ===== TITLE (fade with collapse) =====
    ctx.globalAlpha = 1 - collapseProgress;
    ctx.fillStyle = this.foregroundColor;
    ctx.font = `bold 20px -apple-system, Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      this.title,
      this.x + 16,
      this.y + this.height - 16
    );
    ctx.globalAlpha = 1;
    
    // ===== PREVENT APPBAR BACKGROUND OVERWRITE =====
    const originalBg = this.bgColor;
    const originalTextColor = this.textColor;
    const originalIconColor = this.iconColor;
    const originalPlatform = this.platform;
    
    // Force transparent pour éviter que super.draw() dessine un fond
    this.bgColor = 'rgba(0,0,0,0)';
    // Force la couleur du texte et des icônes
    this.textColor = this.foregroundColor;
    this.iconColor = this.foregroundColor;
    // Force Material pour uniformiser le comportement des couleurs
    this.platform = 'material';
    
    // Icons, ripple, elevation, etc.
    super.draw(ctx);
    
    // Restore
    this.bgColor = originalBg;
    this.textColor = originalTextColor;
    this.iconColor = originalIconColor;
    this.platform = originalPlatform;
    ctx.restore();
  }
}
export default SliverAppBar;