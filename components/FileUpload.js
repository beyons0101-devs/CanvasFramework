import Component from '../core/Component.js';

/**
 * Zone de téléchargement de fichiers (Material & Cupertino) - Bouton visuel seulement
 * @class
 * @extends Component
 */
class FileUpload extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.label = options.label || 'Cliquez pour choisir un fichier';
    this.accept = options.accept || '*';
    this.multiple = options.multiple !== false;
    this.files = options.files || [];
    this.platform = framework.platform;

    // Styles selon la plateforme
    if (this.platform === 'material') {
      // DESIGN MATERIAL AVEC RIPPLE PRONONCÉ
      this.bgColor = options.bgColor || 'rgba(98, 0, 238, 0.04)';
      this.borderColor = options.borderColor || '#6200EE';
      this.iconColor = options.iconColor || '#6200EE';
      this.borderRadius = options.borderRadius || 8;
      this.borderWidth = options.borderWidth || 1.5;
      this.borderStyle = 'dashed';
      this.height = options.height || 90;
      this.rippleColor = 'rgba(98, 0, 238, 0.3)'; // Ripple plus visible
      this.elevation = 1;
    } else {
      // DESIGN CUPERTINO
      this.bgColor = options.bgColor || '#F2F2F7';
      this.borderColor = options.borderColor || '#C6C6C8';
      this.iconColor = options.iconColor || '#007AFF';
      this.borderRadius = 14;
      this.borderWidth = 0;
      this.height = options.height || 80;
      this.borderStyle = 'solid';
    }
    
    this.width = options.width || 300;

    // Ripple effect Material - variables d'animation
    this.ripples = [];

    this.onClickCallback = options.onClick || null;
    this.onFilesSelected = options.onFilesSelected || null;

    if (options.onFilesSelected && !options.onClickCallback) {
      this.onClickCallback = options.onFilesSelected;
    }
    
    // Bind
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Gère la pression sur le bouton
   */
  handlePress(x, y) {
    if (this.platform === 'material') {
      const adjustedY = y - (this.framework.scrollOffset || 0);
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

  /**
   * Anime les effets ripple
   */
  animateRipple() {
    const animate = () => {
      for (let ripple of this.ripples) {
        ripple.radius += ripple.maxRadius / 15;
        ripple.opacity -= 0.05;
      }

      this.ripples = this.ripples.filter(r => r.opacity > 0);

      if (this.framework && this.framework.redraw) {
        this.framework.redraw();
      }

      if (this.ripples.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  handleRelease() {
    this.pressed = false;
    
    if (this.onClickCallback) {
      this.onClickCallback(this.files);
    }
    
    if (this.framework && this.framework.redraw) {
      this.framework.redraw();
    }
  }

  setFiles(files) {
    this.files = files;
    if (this.framework && this.framework.redraw) {
      this.framework.redraw();
    }
  }

  addFile(file) {
    this.files.push(file);
    if (this.framework && this.framework.redraw) {
      this.framework.redraw();
    }
  }

  clearFiles() {
    this.files = [];
    if (this.framework && this.framework.redraw) {
      this.framework.redraw();
    }
  }

  draw(ctx) {
    ctx.save();

    const radius = this.borderRadius;
    
    // OMBRE POUR MATERIAL
    if (this.platform === 'material' && this.elevation > 0 && !this.pressed) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = this.elevation * 4;
      ctx.shadowOffsetY = this.elevation;
    }

    // Background
    let currentBgColor = this.bgColor;
    if (this.pressed && this.platform === 'cupertino') {
      currentBgColor = '#E5E5EA';
    }

    ctx.fillStyle = currentBgColor;
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // BORDURE
    if (this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      
      if (this.platform === 'material' && this.borderStyle === 'dashed') {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // RIPPLE EFFECT (Material)
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
      ctx.clip();
      
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }

    // ICÔNE
    const iconSize = this.platform === 'material' ? 32 : 28;
    const iconX = this.x + this.width / 2;
    const iconY = this.y + this.height / 2 - (this.files.length > 0 ? 15 : 8);

    ctx.strokeStyle = this.iconColor;
    ctx.lineWidth = this.platform === 'material' ? 1.8 : 2;
    ctx.lineCap = 'round';
    
    // Ligne horizontale
    ctx.beginPath();
    ctx.moveTo(iconX - iconSize / 3, iconY);
    ctx.lineTo(iconX + iconSize / 3, iconY);
    ctx.stroke();
    
    // Ligne verticale
    ctx.beginPath();
    ctx.moveTo(iconX, iconY - iconSize / 3);
    ctx.lineTo(iconX, iconY + iconSize / 3);
    ctx.stroke();

    // LABEL
    ctx.fillStyle = this.platform === 'material' ? '#5F6368' : '#3C3C43';
    ctx.font = this.platform === 'material' 
      ? '500 13px Roboto, sans-serif'
      : '15px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelY = iconY + iconSize / 2 + 12;
    ctx.fillText(this.label, this.x + this.width / 2, labelY);

    // FICHIERS SÉLECTIONNÉS
    if (this.files.length > 0) {
      ctx.fillStyle = this.platform === 'material' ? '#6200EE' : '#007AFF';
      ctx.font = this.platform === 'material' 
        ? '400 11px Roboto, sans-serif'
        : '13px -apple-system, sans-serif';
      
      let fileText = '';
      if (this.files.length === 1) {
        fileText = this.truncateText(this.files[0].name, 25);
      } else {
        fileText = `${this.files.length} fichier${this.files.length > 1 ? 's' : ''}`;
      }
      
      const fileIconY = this.y + this.height - 18;
      
      if (this.platform === 'material') {
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        ctx.roundRect(this.x + this.width / 2 - 40, fileIconY - 2, 8, 10, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2 - 32, fileIconY - 2);
        ctx.lineTo(this.x + this.width / 2 - 32, fileIconY + 8);
        ctx.lineTo(this.x + this.width / 2 - 40, fileIconY + 8);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillText(fileText, this.x + this.width / 2 + 5, fileIconY + 3);
      } else {
        ctx.fillText(`📎 ${fileText}`, this.x + this.width / 2, fileIconY);
      }
    }

    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    if (r > 0) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default FileUpload;