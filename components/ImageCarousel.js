import Component from '../core/Component.js';

/**
 * Carousel / Slider d'images avec swipe horizontal et lazy load
 * Compatible Material et Cupertino
 * @class
 * @extends Component
 */
class ImageCarousel extends Component {
  /**
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}]
   * @param {Array<string>} [options.images=[]] - URLs des images
   * @param {number} [options.height=200] - Hauteur du carousel
   * @param {number} [options.spacing=16] - Espacement entre images
   * @param {number} [options.borderRadius=8] - Coins arrondis
   * @param {number} [options.pageIndicatorSize=8] - Taille des dots
   * @param {string} [options.pageIndicatorColor='#6200EE'] - Couleur dot actif
   * @param {Function} [options.onSwipeEnd] - Callback quand la page change
   * @param {Function} [options.onImageClick] - Callback clic sur image
   */
  constructor(framework, options = {}) {
    super(framework, options);

    this.images = options.images || [];
    this.currentIndex = 0;
    this.scrollX = 0;
    this.height = options.height || 200;
    this.spacing = options.spacing || 16;
    this.borderRadius = options.borderRadius || 8;

    this.pageIndicatorSize = options.pageIndicatorSize || 8;
    this.pageIndicatorColor = options.pageIndicatorColor || '#6200EE';

    this.platform = framework.platform;
    this.startX = 0;
    this.isDragging = false;
    this.velocity = 0;

    this.onSwipeEnd = options.onSwipeEnd || null;
    this.onImageClick = options.onImageClick || null;

    this.loadedImages = Array(this.images.length).fill(null);

    // Bind swipe
    this.framework.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.framework.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.framework.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.animateScroll();
  }

  onTouchStart(e) {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.isDragging = true;
    this.velocity = 0;
    this.lastTime = performance.now();
    this.lastX = touch.clientX;
  }

  onTouchMove(e) {
    if (!this.isDragging) return;
    const touch = e.touches[0];
    const delta = touch.clientX - this.startX;
    this.scrollX = -this.currentIndex * (this.width + this.spacing) + delta;

    // calculer velocity
    const now = performance.now();
    const dt = now - this.lastTime;
    this.velocity = (touch.clientX - this.lastX) / dt * 16; // approximation
    this.lastTime = now;
    this.lastX = touch.clientX;
  }

  onTouchEnd() {
    if (!this.isDragging) return;

    // momentum scroll
    const momentumThreshold = this.width / 3;
    let targetIndex = this.currentIndex;

    if (this.velocity < -0.5) targetIndex = Math.min(this.currentIndex + 1, this.images.length - 1);
    else if (this.velocity > 0.5) targetIndex = Math.max(this.currentIndex - 1, 0);
    else {
      const deltaIndex = Math.round(-this.scrollX / (this.width + this.spacing)) - this.currentIndex;
      if (deltaIndex > 0) targetIndex = Math.min(this.currentIndex + 1, this.images.length - 1);
      else if (deltaIndex < 0) targetIndex = Math.max(this.currentIndex - 1, 0);
    }

    this.currentIndex = targetIndex;
    this.scrollX = -this.currentIndex * (this.width + this.spacing);

    this.isDragging = false;
    this.velocity = 0;

    if (this.onSwipeEnd) this.onSwipeEnd(this.currentIndex);
  }

  animateScroll() {
    const animate = () => {
      if (!this.isDragging) {
        // inertia effect
        if (Math.abs(this.velocity) > 0.1) {
          this.scrollX += this.velocity;
          this.velocity *= 0.95; // friction

          // clamp
          if (this.scrollX > 0) this.scrollX = 0;
          const maxScroll = -(this.images.length - 1) * (this.width + this.spacing);
          if (this.scrollX < maxScroll) this.scrollX = maxScroll;
        } else {
          // snap to nearest
          const target = -this.currentIndex * (this.width + this.spacing);
          this.scrollX += (target - this.scrollX) * 0.2;
        }
      }

      requestAnimationFrame(animate);
    };
    animate();
  }

  draw(ctx) {
    ctx.save();

    const startX = this.x + this.scrollX + this.spacing / 2;

    for (let i = 0; i < this.images.length; i++) {
      const imgX = startX + i * (this.width + this.spacing);

      // charger lazy image
      if (!this.loadedImages[i]) {
        const img = new Image();
        img.src = this.images[i];
        img.onload = () => { this.loadedImages[i] = img; };
      }

      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, imgX, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();

      if (this.loadedImages[i]) {
        ctx.drawImage(this.loadedImages[i], imgX, this.y, this.width, this.height);
      } else {
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(imgX, this.y, this.width, this.height);
        ctx.fillStyle = '#BDBDBD';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🖼', imgX + this.width / 2, this.y + this.height / 2);
      }
      ctx.restore();
    }

    // Pagination Material
    if (this.platform === 'material') {
      const dotY = this.y + this.height + 12;
      const totalWidth = this.images.length * this.pageIndicatorSize * 2;
      const startDotX = this.x + (this.width - totalWidth) / 2;

      for (let i = 0; i < this.images.length; i++) {
        ctx.beginPath();
        ctx.arc(startDotX + i * this.pageIndicatorSize * 2, dotY, this.pageIndicatorSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = i === this.currentIndex ? this.pageIndicatorColor : '#E0E0E0';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
}

export default ImageCarousel;
