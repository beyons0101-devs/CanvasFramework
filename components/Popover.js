import Component from '../core/Component.js';

/**
 * Popover (fenêtre contextuelle) avec variantes Material et Cupertino
 * @class
 * @extends Component
 * 
 * Material: Carte avec ombre et flèche
 * Cupertino: Style iOS avec blur background
 */
class Popover extends Component {
  /**
   * Crée une instance de Popover
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title] - Titre du popover
   * @param {string} [options.content] - Contenu texte
   * @param {Component} [options.customContent] - Composant personnalisé
   * @param {string} [options.placement='top'] - Position: 'top', 'bottom', 'left', 'right'
   * @param {Object} [options.anchor] - Point d'ancrage {x, y}
   * @param {number} [options.maxWidth=280] - Largeur maximale
   * @param {boolean} [options.showArrow=true] - Afficher la flèche
   * @param {Function} [options.onClose] - Callback fermeture
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.platform = framework.platform;
    this.title = options.title || null;
    this.content = options.content || '';
    this.customContent = options.customContent || null;
    this.placement = options.placement || 'top';
    this.anchor = options.anchor || null;
    this.maxWidth = options.maxWidth || 280;
    this.showArrow = options.showArrow !== false;
    this.onClose = options.onClose || (() => {});
    
    this.visible = false;
    this.arrowSize = 12;
    this.padding = this.platform === 'material' ? 16 : 12;
    
    // Couleurs
    if (this.platform === 'material') {
      this.backgroundColor = '#FFFFFF';
      this.titleColor = '#000000';
      this.textColor = '#757575';
      this.borderColor = '#E0E0E0';
      this.elevation = 8;
    } else {
      this.backgroundColor = 'rgba(242, 242, 247, 0.98)';
      this.titleColor = '#000000';
      this.textColor = '#3C3C43';
      this.borderColor = 'rgba(0, 0, 0, 0.1)';
    }
    
    // Calculer dimensions
    this.calculateDimensions();
    
    // Animation
    this.animationProgress = 0;
    this.animating = false;
	// ✅ Flag pour éviter les doubles appels
    this._isShowing = false;
  }
  
  /**
   * Calcule les dimensions du popover
   * @private
   */
  calculateDimensions() {
    const ctx = this.framework.ctx;
    ctx.save();
    
    // Mesurer le texte
    let contentHeight = 0;
    let contentWidth = 0;
    
    // Titre
    if (this.title) {
      ctx.font = `600 ${this.platform === 'material' ? 16 : 17}px ${this.platform === 'material' ? 'Roboto' : '-apple-system'}, sans-serif`;
      const titleWidth = ctx.measureText(this.title).width;
      contentWidth = Math.max(contentWidth, titleWidth);
      contentHeight += this.platform === 'material' ? 24 : 22;
      contentHeight += 8; // Espacement
    }
    
    // Contenu
    if (this.content) {
      ctx.font = `400 ${this.platform === 'material' ? 14 : 15}px ${this.platform === 'material' ? 'Roboto' : '-apple-system'}, sans-serif`;
      
      // Wrap text
      const words = this.content.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > this.maxWidth - this.padding * 2 && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      this.contentLines = lines;
      contentHeight += lines.length * (this.platform === 'material' ? 20 : 21);
      
      lines.forEach(line => {
        const lineWidth = ctx.measureText(line).width;
        contentWidth = Math.max(contentWidth, lineWidth);
      });
    }
    
    // Custom content
    if (this.customContent) {
      contentWidth = Math.max(contentWidth, this.customContent.width);
      contentHeight += this.customContent.height;
    }
    
    this.width = Math.min(this.maxWidth, contentWidth + this.padding * 2);
    this.height = contentHeight + this.padding * 2;
    
    ctx.restore();
  }
  
  /**
   * Positionne le popover par rapport à l'ancre
   * @private
   */
  positionPopover() {
    if (!this.anchor) return;
    
    const arrowOffset = this.showArrow ? this.arrowSize : 0;
    
    switch (this.placement) {
      case 'top':
        this.x = this.anchor.x - this.width / 2;
        this.y = this.anchor.y - this.height - arrowOffset;
        break;
        
      case 'bottom':
        this.x = this.anchor.x - this.width / 2;
        this.y = this.anchor.y + arrowOffset;
        break;
        
      case 'left':
        this.x = this.anchor.x - this.width - arrowOffset;
        this.y = this.anchor.y - this.height / 2;
        break;
        
      case 'right':
        this.x = this.anchor.x + arrowOffset;
        this.y = this.anchor.y - this.height / 2;
        break;
    }
    
    // Ajuster si hors écran
    const canvas = this.framework.canvas;
    this.x = Math.max(10, Math.min(this.x, canvas.width - this.width - 10));
    this.y = Math.max(10, Math.min(this.y, canvas.height - this.height - 10));
  }
  
  /**
   * Dessine la flèche
   * @private
   */
  drawArrow(ctx) {
    if (!this.showArrow || !this.anchor) return;
    
    const size = this.arrowSize;
    
    ctx.fillStyle = this.backgroundColor;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    switch (this.placement) {
      case 'top':
        const bottomX = this.anchor.x;
        ctx.moveTo(bottomX, this.y + this.height);
        ctx.lineTo(bottomX - size / 2, this.y + this.height + size);
        ctx.lineTo(bottomX + size / 2, this.y + this.height + size);
        break;
        
      case 'bottom':
        const topX = this.anchor.x;
        ctx.moveTo(topX, this.y);
        ctx.lineTo(topX - size / 2, this.y - size);
        ctx.lineTo(topX + size / 2, this.y - size);
        break;
        
      case 'left':
        const rightY = this.anchor.y;
        ctx.moveTo(this.x + this.width, rightY);
        ctx.lineTo(this.x + this.width + size, rightY - size / 2);
        ctx.lineTo(this.x + this.width + size, rightY + size / 2);
        break;
        
      case 'right':
        const leftY = this.anchor.y;
        ctx.moveTo(this.x, leftY);
        ctx.lineTo(this.x - size, leftY - size / 2);
        ctx.lineTo(this.x - size, leftY + size / 2);
        break;
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  
  /**
   * Dessine le popover Material
   * @private
   */
  drawMaterial(ctx) {
    ctx.save();
    
    // Ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = this.elevation * 2;
    ctx.shadowOffsetY = this.elevation;
    
    // Background
    ctx.fillStyle = this.backgroundColor;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 8);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Bordure légère
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Flèche
    this.drawArrow(ctx);
    
    ctx.restore();
    
    // Contenu
    this.drawContent(ctx);
  }
  
  /**
   * Dessine le popover Cupertino (iOS)
   * @private
   */
  drawCupertino(ctx) {
    ctx.save();
    
    // Blur background effect (simulé avec semi-transparence)
    ctx.fillStyle = this.backgroundColor;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 12);
    ctx.fill();
    
    // Bordure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Flèche
    this.drawArrow(ctx);
    
    ctx.restore();
    
    // Contenu
    this.drawContent(ctx);
  }
  
  /**
   * Dessine le contenu
   * @private
   */
  drawContent(ctx) {
    let currentY = this.y + this.padding;
    
    // Titre
    if (this.title) {
      ctx.fillStyle = this.titleColor;
      ctx.font = `600 ${this.platform === 'material' ? 16 : 17}px ${this.platform === 'material' ? 'Roboto' : '-apple-system'}, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.title, this.x + this.padding, currentY);
      currentY += this.platform === 'material' ? 24 : 22;
      currentY += 8;
    }
    
    // Contenu texte
    if (this.content && this.contentLines) {
      ctx.fillStyle = this.textColor;
      ctx.font = `400 ${this.platform === 'material' ? 14 : 15}px ${this.platform === 'material' ? 'Roboto' : '-apple-system'}, sans-serif`;
      
      this.contentLines.forEach(line => {
        ctx.fillText(line, this.x + this.padding, currentY);
        currentY += this.platform === 'material' ? 20 : 21;
      });
    }
    
    // Custom content
    if (this.customContent) {
      ctx.save();
      ctx.translate(this.x + this.padding, currentY);
      this.customContent.draw(ctx);
      ctx.restore();
    }
  }
  
  /**
   * Dessine le composant
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.visible) return;
    
    // Animation d'apparition
    if (this.animating) {
      ctx.save();
      ctx.globalAlpha = this.animationProgress;
      
      const scale = 0.8 + (this.animationProgress * 0.2);
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
    }
    
    if (this.platform === 'material') {
      this.drawMaterial(ctx);
    } else {
      this.drawCupertino(ctx);
    }
    
    if (this.animating) {
      ctx.restore();
    }
  }
  
  /**
   * Affiche le popover
   * @param {Object} anchor - Point d'ancrage {x, y}
   * @param {string} placement - Position
   */
  show(anchor, placement) {
    // ✅ Éviter les appels multiples
    if (this._isShowing) return;
    this._isShowing = true;
    
    if (anchor) this.anchor = anchor;
    if (placement) this.placement = placement;
    
    this.calculateDimensions();
    this.positionPopover();
    
    this.visible = true;
    this.animating = true;
    this.animationProgress = 0;
    
    this.animateIn();
    
    // ✅ Réinitialiser le flag après l'animation
    setTimeout(() => {
        this._isShowing = false;
    }, this.splashOptions?.duration || 200);
}
  
  /**
   * Cache le popover
   */
  hide() {
    this.animating = true;
    this.animateOut();
  }
  
  /**
   * Animation d'apparition
   * @private
   */
  animateIn() {
    const duration = 200;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      this.animationProgress = Math.min(1, elapsed / duration);
      
      
      
      if (this.animationProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animating = false;
      }
    };
    
    animate();
  }
  
  /**
   * Animation de disparition
   * @private
   */
  animateOut() {
    const duration = 150;
    const startTime = Date.now();
    const startProgress = this.animationProgress;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      this.animationProgress = startProgress * (1 - elapsed / duration);
      
     
      if (this.animationProgress > 0) {
        requestAnimationFrame(animate);
      } else {
        this.animating = false;
        this.visible = false;
        this.onClose();
      }
    };
    
    animate();
  }
  
  /**
   * Gère le clic à l'extérieur
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si clic à l'extérieur
   */
  handleClickOutside(x, y) {
    if (!this.visible) return false;
    
    const isInside = x >= this.x && x <= this.x + this.width &&
                     y >= this.y && y <= this.y + this.height;
    
    if (!isInside) {
      this.hide();
      return true;
    }
    
    return false;
  }
  
  /**
   * Définit le contenu
   * @param {string} content - Nouveau contenu
   */
  setContent(content) {
    this.content = content;
    this.calculateDimensions();
    this.positionPopover();
  }
  
  /**
   * Définit le titre
   * @param {string} title - Nouveau titre
   */
  setTitle(title) {
    this.title = title;
    this.calculateDimensions();
    this.positionPopover();
  }
  
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
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
    if (!this.visible) return false;
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
}

export default Popover;