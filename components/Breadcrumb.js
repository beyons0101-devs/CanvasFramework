import Component from '../core/Component.js';

/**
 * Fil d'Ariane (Breadcrumb) avec variantes Material et Cupertino
 * @class
 * @extends Component
 * 
 * Material: Texte avec séparateurs "/"
 * Cupertino: Style iOS avec chevrons "<"
 */
class Breadcrumb extends Component {
  /**
   * Crée une instance de Breadcrumb
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.items=[]] - Liste des éléments {label, path}
   * @param {string} [options.separator] - Séparateur personnalisé
   * @param {number} [options.maxItems=5] - Nombre max d'items avant collapse
   * @param {Function} [options.onItemClick] - Callback clic sur item
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.platform = framework.platform;
    this.items = options.items || [];
    this.maxItems = options.maxItems || 5;
    this.onItemClick = options.onItemClick || (() => {});
    
    // Séparateur selon plateforme
    if (this.platform === 'material') {
      this.separator = options.separator || '/';
      this.fontSize = 14;
      this.activeColor = '#6200EE';
      this.inactiveColor = '#757575';
      this.hoverColor = '#9C47FF';
    } else {
      this.separator = options.separator || '›';
      this.fontSize = 17;
      this.activeColor = '#007AFF';
      this.inactiveColor = '#8E8E93';
      this.hoverColor = '#0051D5';
    }
    
    // Hauteur fixe
    this.height = this.platform === 'material' ? 40 : 44;
    
    // État hover/pressed
    this.hoveredIndex = null;
    this.pressedIndex = null;
    
    // Zones cliquables
    this.clickableAreas = [];
  }
  
  /**
   * Obtient les items à afficher (avec collapse si nécessaire)
   * @returns {Array} Items à afficher
   * @private
   */
  getDisplayItems() {
    if (this.items.length <= this.maxItems) {
      return this.items;
    }
    
    // Garder premier, dernier, et collapse le milieu
    return [
      this.items[0],
      { label: '...', collapsed: true },
      ...this.items.slice(-(this.maxItems - 2))
    ];
  }
  
  /**
   * Dessine le breadcrumb Material
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawMaterial(ctx) {
    const displayItems = this.getDisplayItems();
    let currentX = this.x + 16;
    
    this.clickableAreas = [];
    
    displayItems.forEach((item, index) => {
      const isLast = index === displayItems.length - 1;
      const isCollapsed = item.collapsed;
      const isHovered = this.hoveredIndex === index;
      const isPressed = this.pressedIndex === index;
      
      // Texte de l'item
      ctx.font = `${isLast ? '500' : '400'} ${this.fontSize}px Roboto, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const textWidth = ctx.measureText(item.label).width;
      
      // Background hover (sauf dernier et collapsed)
      if (isHovered && !isLast && !isCollapsed) {
        ctx.fillStyle = 'rgba(98, 0, 238, 0.08)';
        this.roundRect(ctx, currentX - 4, this.y + 6, textWidth + 8, 28, 4);
        ctx.fill();
      }
      
      // Couleur du texte
      if (isLast) {
        ctx.fillStyle = this.activeColor;
      } else if (isPressed && !isCollapsed) {
        ctx.fillStyle = this.darkenColor(this.inactiveColor);
      } else if (isHovered && !isCollapsed) {
        ctx.fillStyle = this.hoverColor;
      } else {
        ctx.fillStyle = this.inactiveColor;
      }
      
      // Texte
      const textY = this.y + this.height / 2;
      ctx.fillText(item.label, currentX, textY);
      
      // Stocker zone cliquable (sauf dernier et collapsed)
      if (!isLast && !isCollapsed) {
        this.clickableAreas.push({
          x: currentX - 4,
          y: this.y,
          width: textWidth + 8,
          height: this.height,
          index: index,
          originalIndex: this.getOriginalIndex(index)
        });
      }
      
      currentX += textWidth + 12;
      
      // Séparateur (sauf dernier)
      if (!isLast) {
        ctx.fillStyle = '#BDBDBD';
        ctx.font = `400 ${this.fontSize}px Roboto, sans-serif`;
        ctx.fillText(this.separator, currentX, textY);
        currentX += ctx.measureText(this.separator).width + 12;
      }
    });
  }
  
  /**
   * Dessine le breadcrumb Cupertino (iOS)
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawCupertino(ctx) {
    const displayItems = this.getDisplayItems();
    let currentX = this.x + 16;
    
    this.clickableAreas = [];
    
    displayItems.forEach((item, index) => {
      const isLast = index === displayItems.length - 1;
      const isCollapsed = item.collapsed;
      const isHovered = this.hoveredIndex === index;
      const isPressed = this.pressedIndex === index;
      
      // Chevron back (sauf premier)
      if (index > 0) {
        const chevronColor = isPressed && index === displayItems.length - 1 ? 
                           this.darkenColor(this.activeColor) :
                           this.activeColor;
        
        this.drawChevron(ctx, currentX, this.y + this.height / 2, chevronColor, 'left');
        currentX += 20;
      }
      
      // Texte de l'item
      ctx.font = `${isLast ? '600' : '400'} ${this.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const textWidth = ctx.measureText(item.label).width;
      
      // Couleur du texte
      if (isLast) {
        ctx.fillStyle = isPressed ? this.darkenColor(this.activeColor) : this.activeColor;
      } else if (isPressed && !isCollapsed) {
        ctx.fillStyle = this.darkenColor(this.inactiveColor);
      } else {
        ctx.fillStyle = this.inactiveColor;
      }
      
      // Texte
      const textY = this.y + this.height / 2;
      ctx.fillText(item.label, currentX, textY);
      
      // Stocker zone cliquable (sauf dernier et collapsed)
      if (!isLast && !isCollapsed) {
        this.clickableAreas.push({
          x: currentX - 20,
          y: this.y,
          width: textWidth + 20,
          height: this.height,
          index: index,
          originalIndex: this.getOriginalIndex(index)
        });
      }
      
      currentX += textWidth + 16;
    });
  }
  
  /**
   * Dessine un chevron iOS
   * @private
   */
  drawChevron(ctx, x, y, color, direction) {
    const size = 8;
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    if (direction === 'left') {
      ctx.moveTo(x + size / 2, y - size / 2);
      ctx.lineTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y + size / 2);
    } else {
      ctx.moveTo(x - size / 2, y - size / 2);
      ctx.lineTo(x + size / 2, y);
      ctx.lineTo(x - size / 2, y + size / 2);
    }
    ctx.stroke();
    ctx.restore();
  }
  
  /**
   * Obtient l'index original (avant collapse)
   * @private
   */
  getOriginalIndex(displayIndex) {
    if (this.items.length <= this.maxItems) {
      return displayIndex;
    }
    
    // Si c'est le premier
    if (displayIndex === 0) return 0;
    
    // Si après le collapse
    if (displayIndex > 1) {
      const offset = this.items.length - (this.maxItems - 2);
      return offset + displayIndex - 2;
    }
    
    return displayIndex;
  }
  
  /**
   * Dessine le composant
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.platform === 'material') {
      this.drawMaterial(ctx);
    } else {
      this.drawCupertino(ctx);
    }
    
    ctx.restore();
  }
  
  /**
   * Gère le clic sur un item
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleClick(x, y) {
    for (let area of this.clickableAreas) {
      if (x >= area.x && x <= area.x + area.width &&
          y >= area.y && y <= area.y + area.height) {
        
        this.pressedIndex = area.index;
        this.framework.redraw();
        
        setTimeout(() => {
          this.pressedIndex = null;
          const item = this.items[area.originalIndex];
          this.onItemClick(item, area.originalIndex);
          this.framework.redraw();
        }, 100);
        
        return true;
      }
    }
    return false;
  }
  
  /**
   * Gère le survol
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleHover(x, y) {
    let newHoveredIndex = null;
    
    for (let area of this.clickableAreas) {
      if (x >= area.x && x <= area.x + area.width &&
          y >= area.y && y <= area.y + area.height) {
        newHoveredIndex = area.index;
        break;
      }
    }
    
    if (newHoveredIndex !== this.hoveredIndex) {
      this.hoveredIndex = newHoveredIndex;
      this.framework.redraw();
    }
  }
  
  /**
   * Ajoute un item au breadcrumb
   * @param {string} label - Libellé
   * @param {string} path - Chemin
   */
  addItem(label, path) {
    this.items.push({ label, path });
    this.framework.redraw();
  }
  
  /**
   * Retire les items après un index
   * @param {number} index - Index à partir duquel supprimer
   */
  removeAfter(index) {
    this.items = this.items.slice(0, index + 1);
    this.framework.redraw();
  }
  
  /**
   * Définit les items
   * @param {Array} items - Nouveaux items
   */
  setItems(items) {
    this.items = items;
    this.framework.redraw();
  }
  
  /**
   * Assombrit une couleur
   * @private
   */
  darkenColor(color) {
    if (color.startsWith('rgb')) {
      return color.replace(/[\d.]+\)$/g, match => {
        const val = parseFloat(match);
        return `${Math.max(0, val - 0.2)})`;
      });
    }
    
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.max(0, rgb.r - 50)}, ${Math.max(0, rgb.g - 50)}, ${Math.max(0, rgb.b - 50)})`;
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
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
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
}

export default Breadcrumb;