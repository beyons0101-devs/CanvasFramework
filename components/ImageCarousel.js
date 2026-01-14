import Component from '../core/Component.js';

/**
 * Carousel / Slider d'images avec swipe horizontal et lazy load
 * Compatible Material et Cupertino
 * Tout le scroll est géré par le composant
 */
class ImageCarousel extends Component {
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

    this.isDragging = false;
    this.lastX = 0;
    this.velocity = 0;

    this.onSwipeEnd = options.onSwipeEnd || null;
    this.onImageClick = options.onImageClick || null;

    this.loadedImages = Array(this.images.length).fill(null);

    this._setupEventHandlers();
    this.animateScroll();
  }

  // --------------------------
  // Event handlers
  // --------------------------
  _setupEventHandlers() {
    const canvas = this.framework.canvas;

    // TOUCH
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && this.isPointInsideTouch(e.touches[0])) {
        this.isDragging = true;
        this.lastX = e.touches[0].clientX;
        this.velocity = 0;
        e.preventDefault();
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const delta = e.touches[0].clientX - this.lastX;
        this.scrollX += delta;
        this.velocity = delta;
        this.lastX = e.touches[0].clientX;

        this._clampScroll();
        this._requestRedraw();
        e.preventDefault();
      }
    });

    canvas.addEventListener('touchend', () => this._endDrag());

    // MOUSE
    canvas.addEventListener('mousedown', (e) => {
      if (this.isPointInside(e)) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.velocity = 0;
        e.preventDefault();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const delta = e.clientX - this.lastX;
        this.scrollX += delta;
        this.velocity = delta;
        this.lastX = e.clientX;

        this._clampScroll();
        this._requestRedraw();
      }
    });

    canvas.addEventListener('mouseup', () => this._endDrag());
    canvas.addEventListener('mouseleave', () => this._endDrag());
  }

  _endDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      // Snap à la page la plus proche
      const targetIndex = Math.round(-this.scrollX / (this.width + this.spacing));
      this.currentIndex = Math.min(Math.max(targetIndex, 0), this.images.length - 1);
      this.scrollX = -this.currentIndex * (this.width + this.spacing);

      if (this.onSwipeEnd) this.onSwipeEnd(this.currentIndex);
    }
  }

  _clampScroll() {
    const maxScroll = 0;
    const minScroll = -(this.images.length - 1) * (this.width + this.spacing);
    if (this.scrollX > maxScroll) this.scrollX = maxScroll;
    if (this.scrollX < minScroll) this.scrollX = minScroll;
  }

  isPointInsideTouch(touch) {
    const rect = this.framework.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    return this.isPointInside(x, y);
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  _requestRedraw() {
    if (this.framework.markComponentDirty) this.framework.markComponentDirty(this);
  }

  // --------------------------
  // Animation / Inertie
  // --------------------------
  animateScroll() {
    const animate = () => {
      if (!this.isDragging) {
        // inertia
        if (Math.abs(this.velocity) > 0.1) {
          this.scrollX += this.velocity;
          this.velocity *= 0.95;

          this._clampScroll();
        } else {
          // snap doux vers la page
          const target = -this.currentIndex * (this.width + this.spacing);
          this.scrollX += (target - this.scrollX) * 0.2;
        }
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  // --------------------------
  // Draw
  // --------------------------
  draw(ctx) {
    ctx.save();
    const startX = this.x + this.scrollX + this.spacing / 2;

    for (let i = 0; i < this.images.length; i++) {
      const imgX = startX + i * (this.width + this.spacing);

      // lazy load
      if (!this.loadedImages[i]) {
        const img = new Image();
        img.src = this.images[i];
        img.onload = () => { this.loadedImages[i] = img; this._requestRedraw(); };
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

    // pagination Material
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
}

export default ImageCarousel;
