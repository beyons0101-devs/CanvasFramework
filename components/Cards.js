import Component from '../core/Component.js';

/**
 * Container avec système de layout et élévation
 * @class
 * @extends Component
 */
class Cards extends Component {
  constructor(framework, options = {}, children = []) {
    super(framework, options);
    this.children = [];
    this.padding = options.padding || 0;
    this.gap = options.gap || 0;
    this.direction = options.direction || 'column';
    this.align = options.align || 'start';
    this.bgColor = options.bgColor || 'transparent';
    this.borderRadius = options.borderRadius || 0;
    this.elevation = options.elevation || 0;
    this.shadowColor = options.shadowColor || 'rgba(0,0,0,0.15)';
    this._applyElevationStyles();
    
    // Mode de positionnement
    this.positionMode = options.positionMode || 'flow';
    
    // Stocker les positions relatives des enfants
    this.childRelativePositions = new Map();
    
    // Ajouter les enfants passés dans le constructeur
    if (children && children.length > 0) {
      this.addChildren(children);
    }
  }

  _applyElevationStyles() {
    const elevationStyles = {
      0: { blur: 0, offsetY: 0, spread: 0, opacity: 0 },
      1: { blur: 2, offsetY: 1, spread: 0, opacity: 0.1 },
      2: { blur: 4, offsetY: 2, spread: 1, opacity: 0.15 },
      3: { blur: 8, offsetY: 4, spread: 2, opacity: 0.2 },
      4: { blur: 16, offsetY: 8, spread: 3, opacity: 0.25 },
      5: { blur: 24, offsetY: 12, spread: 4, opacity: 0.3 }
    };
    
    const style = elevationStyles[Math.min(this.elevation, 5)] || elevationStyles[0];
    
    this.shadowBlur = style.blur;
    this.shadowOffsetY = style.offsetY;
    this.shadowSpread = style.spread;
    this.shadowOpacity = style.opacity;
    
    this._updateShadowColor();
  }

  _updateShadowColor() {
    const rgbMatch = this.shadowColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = rgbMatch[1];
      const g = rgbMatch[2];
      const b = rgbMatch[3];
      this._computedShadowColor = `rgba(${r}, ${g}, ${b}, ${this.shadowOpacity})`;
    } else {
      this._computedShadowColor = this.shadowColor;
    }
  }

  /**
   * Ajoute plusieurs enfants
   * @param {Component[]} children - Tableau d'enfants
   */
  addChildren(children) {
    for (const child of children) {
      this.add(child);
    }
  }

  /**
   * Ajoute un enfant
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    this.children.push(child);
    
    // Si l'enfant a des coordonnées x,y, on les interprète comme relatives au container
    if (child.x !== undefined && child.y !== undefined) {
      // Stocker les positions RELATIVES par rapport au container
      this.childRelativePositions.set(child, {
        relativeX: child.x,  // x relatif au container
        relativeY: child.y   // y relatif au container
      });
      
      // Calculer la position absolue immédiatement
      this.updateChildPosition(child);
    }
    
    return child;
  }

  /**
   * Met à jour la position d'un enfant en fonction de la position du container
   * @param {Component} child - L'enfant à positionner
   * @private
   */
  updateChildPosition(child) {
    const relativePos = this.childRelativePositions.get(child);
    
    if (relativePos) {
      // Position ABSOLUE = position container + position relative + padding
      child.x = this.x + this.padding + relativePos.relativeX;
      child.y = this.y + this.padding + relativePos.relativeY;
    }
  }

  /**
   * Met à jour la position de tous les enfants quand le container bouge
   * @override
   */
  setPosition(x, y) {
    super.setPosition(x, y);
    this.updateAllChildrenPositions();
  }

  /**
   * Met à jour toutes les positions des enfants
   * @private
   */
  updateAllChildrenPositions() {
    for (const child of this.children) {
      this.updateChildPosition(child);
    }
  }

  /**
   * Change la position relative d'un enfant dans le container
   * @param {Component} child - L'enfant à repositionner
   * @param {number} relativeX - Nouvelle position X relative
   * @param {number} relativeY - Nouvelle position Y relative
   */
  setChildPosition(child, relativeX, relativeY) {
    this.childRelativePositions.set(child, {
      relativeX: relativeX,
      relativeY: relativeY
    });
    this.updateChildPosition(child);
  }

  draw(ctx) {
    ctx.save();
    
    // Dessiner l'ombre
    if (this.elevation > 0 && this.bgColor !== 'transparent') {
      this.drawShadow(ctx);
    }
    
    // Dessiner le fond
    if (this.bgColor !== 'transparent') {
      ctx.fillStyle = this.bgColor;
      if (this.borderRadius > 0) {
        ctx.beginPath();
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
    
    // Dessiner les enfants
    for (let child of this.children) {
      if (child.visible) child.draw(ctx);
    }
    
    ctx.restore();
  }

  drawShadow(ctx) {
    ctx.save();
    
    ctx.shadowColor = this._computedShadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = this.shadowOffsetY;
    
    ctx.fillStyle = this.bgColor;
    
    if (this.borderRadius > 0) {
      ctx.beginPath();
      const spread = this.shadowSpread;
      this.roundRect(
        ctx, 
        this.x - spread/2, 
        this.y - spread/2, 
        this.width + spread, 
        this.height + spread, 
        this.borderRadius + spread/2
      );
      ctx.fill();
    } else {
      const spread = this.shadowSpread;
      ctx.fillRect(
        this.x - spread/2, 
        this.y - spread/2, 
        this.width + spread, 
        this.height + spread
      );
    }
    
    ctx.restore();
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
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Cards;