import Component from '../core/Component.js';

/**
 * FileUpload Material 3 & Cupertino avec ripple
 * @class
 * @extends Component
 */
class FileUpload extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.label = options.label || 'Select files';
    this.accept = options.accept || '*';
    this.multiple = options.multiple !== false;
    this.files = [];
    this.isPressed = false;

    this.platform = framework.platform;
    this.width = options.width || 300;
    this.height = options.height || (this.platform === 'material' ? 80 : 90);

    // Couleurs selon plateforme
    if (this.platform === 'material') {
      this.bgColor = options.bgColor || '#F3E8FF'; // M3 surface variant
      this.borderColor = options.borderColor || '#BB86FC';
      this.iconColor = options.iconColor || '#6200EE';
      this.borderRadius = 12;
      this.ripples = [];
      this.animationFrame = null;
    } else {
      this.bgColor = options.bgColor || 'rgba(248,248,248,0.95)';
      this.borderColor = options.borderColor || '#007AFF';
      this.iconColor = options.iconColor || '#007AFF';
      this.borderRadius = 16;
    }

    this.onFilesSelected = options.onFilesSelected || null;
    this.onError = options.onError || null;

    // Input HTML caché
    this.createFileInput();
  }

  createFileInput() {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = this.accept;
    this.fileInput.multiple = this.multiple;
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
    });
  }

  handleFiles(fileList) {
    const validFiles = [];

    for (let file of fileList) {
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      this.files = validFiles;
      if (this.onFilesSelected) this.onFilesSelected(validFiles);
    }

    this.fileInput.value = '';
    this.requestRender();
  }

  // Ripple effect similaire au BottomNavigationBar
  startRipple(x, y) {
    if (this.platform !== 'material') return;

    const maxRadius = Math.max(this.width, this.height) * 0.8;
    this.ripples.push({ x, y, radius: 0, maxRadius, opacity: 0.3 });

    const animate = (timestamp) => {
      let needsUpdate = false;
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        ripple.radius += maxRadius / 15;
        ripple.opacity -= 0.02;
        if (ripple.opacity <= 0) this.ripples.splice(i, 1);
        else needsUpdate = true;
      }

      this.requestRender();

      if (needsUpdate) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  onClick(globalX, globalY) {
    const localX = globalX - this.x;
    const localY = globalY - this.y;

    if (this.isPointInside(globalX, globalY)) {
      if (this.platform === 'material') this.startRipple(localX, localY);
      this.fileInput.click();
    }
  }

  draw(ctx) {
    ctx.save();

    // Background
    ctx.fillStyle = this.bgColor;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // Border
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.stroke();

    // Ripple (Material)
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width, this.height);
      ctx.clip();
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Icon simple
    const iconSize = 32;
    const iconX = this.x + this.width / 2 - iconSize / 2;
    const iconY = this.y + 10;

    ctx.strokeStyle = this.iconColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(iconX + iconSize / 2, iconY);
    ctx.lineTo(iconX + iconSize / 2, iconY + iconSize);
    ctx.moveTo(iconX, iconY + iconSize / 3);
    ctx.lineTo(iconX + iconSize, iconY + iconSize / 3);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#000';
    ctx.font = '16px -apple-system, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.label, this.x + this.width / 2, iconY + iconSize + 10);

    // Fichiers sélectionnés
    if (this.files.length > 0) {
      ctx.fillStyle = this.borderColor;
      ctx.font = '12px -apple-system, Roboto, sans-serif';
      const fileText = this.files.length === 1 ? this.files[0].name : `${this.files.length} files selected`;
      ctx.fillText(fileText, this.x + this.width / 2, this.y + this.height - 20);
    }

    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  destroy() {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput);
    }
  }

  requestRender() {
    if (this.framework && this.framework.requestRender) this.framework.requestRender();
  }
}

export default FileUpload;
