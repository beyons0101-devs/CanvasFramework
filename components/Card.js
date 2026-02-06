import Component from '../core/Component.js';

/**
 * Container avec système de layout et effet d'élévation
 * @class
 * @extends Component
 * @property {Component[]} children - Enfants
 * @property {number} padding - Padding interne
 * @property {number} gap - Espacement constant entre enfants
 * @property {string} direction - Direction ('column' ou 'row')
 * @property {string} align - Alignement ('start', 'center', 'end', 'stretch')
 * @property {string} bgColor - Couleur de fond
 * @property {number} borderRadius - Rayon des coins
 * @property {number} elevation - Niveau d'élévation (ombres)
 * @property {boolean} autoLayout - Active le layout automatique
 */
class Card extends Component {
  /**
   * Crée une instance de Card
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.padding=0] - Padding interne
   * @param {number} [options.gap=0] - Espacement constant entre enfants
   * @param {string} [options.direction='column'] - Direction
   * @param {string} [options.align='start'] - Alignement
   * @param {string} [options.bgColor='transparent'] - Couleur de fond
   * @param {number} [options.borderRadius=0] - Rayon des coins
   * @param {number} [options.elevation=0] - Niveau d'élévation (0-5)
   * @param {boolean} [options.autoLayout=true] - Active le layout automatique
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.children = [];
    this.padding = options.padding || 0;
    this.gap = options.gap || 0;
    this.direction = options.direction || 'column';
    this.align = options.align || 'start';
    this.bgColor = options.bgColor || 'transparent';
    this.borderRadius = options.borderRadius || 0;
    this.elevation = options.elevation || 0;
    this.autoLayout = options.autoLayout !== undefined ? options.autoLayout : true;
    
    // Stocker les positions relatives des enfants
    this.childPositions = new Map();
  }

  /**
   * Ajoute un enfant (position relative convertie en absolue)
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    this.children.push(child);
    
    // CONVERTIR les positions relatives en positions absolues
    // Les x, y passés sont relatifs à la Card
    child.x = this.x + child.x;
    child.y = this.y + child.y;
    
    // Stocker la position relative originale
    this.childPositions.set(child, { 
      x: child.x - this.x, 
      y: child.y - this.y 
    });
    
    // Si autoLayout est activé, organiser automatiquement
    if (this.autoLayout) {
      this.layout();
    }
    
    return child;
  }

  /**
   * Supprime un enfant
   * @param {Component} child - Composant enfant à supprimer
   * @returns {boolean} True si l'enfant a été supprimé
   */
  remove(child) {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      this.childPositions.delete(child);
      if (this.autoLayout) this.layout();
      return true;
    }
    return false;
  }

  /**
   * Supprime tous les enfants
   */
  clear() {
    this.children = [];
    this.childPositions.clear();
  }

  /**
   * Organise les enfants selon le layout
   * @private
   */
  layout() {
    if (this.children.length === 0 || !this.autoLayout) return;

    if (this.direction === 'column') {
      let currentY = this.padding;
      
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        
        // Calculer la position X selon l'alignement
        let childX = this.padding;
        if (this.align === 'center') {
          childX = (this.width - child.width) / 2;
        } else if (this.align === 'end') {
          childX = this.width - child.width - this.padding;
        } else if (this.align === 'stretch') {
          childX = this.padding;
          child.width = this.width - (this.padding * 2);
        }
        
        // Positionner l'enfant RELATIVEMENT à la Card
        child.x = this.x + childX;
        child.y = this.y + currentY;
        
        // Stocker la position relative
        this.childPositions.set(child, { x: childX, y: currentY });
        
        // Mettre à jour la position Y pour l'enfant suivant
        currentY += child.height;
        
        // Ajouter le gap seulement si ce n'est pas le dernier enfant
        if (i < this.children.length - 1) {
          currentY += this.gap;
        }
      }
    } else {
      // Direction 'row'
      let currentX = this.padding;
      
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        
        // Calculer la position Y selon l'alignement
        let childY = this.padding;
        if (this.align === 'center') {
          childY = (this.height - child.height) / 2;
        } else if (this.align === 'end') {
          childY = this.height - child.height - this.padding;
        } else if (this.align === 'stretch') {
          childY = this.padding;
          child.height = this.height - (this.padding * 2);
        }
        
        // Positionner l'enfant RELATIVEMENT à la Card
        child.x = this.x + currentX;
        child.y = this.y + childY;
        
        // Stocker la position relative
        this.childPositions.set(child, { x: currentX, y: childY });
        
        // Mettre à jour la position X pour l'enfant suivant
        currentX += child.width;
        
        // Ajouter le gap seulement si ce n'est pas le dernier enfant
        if (i < this.children.length - 1) {
          currentX += this.gap;
        }
      }
    }
  }

  /**
   * Met à jour la position de la carte et ajuste les enfants
   * @param {number} x - Nouvelle position X
   * @param {number} y - Nouvelle position Y
   */
  setPosition(x, y) {
    const deltaX = x - this.x;
    const deltaY = y - this.y;
    
    super.setPosition(x, y);
    
    // Déplacer tous les enfants avec la carte
    for (let child of this.children) {
      child.x += deltaX;
      child.y += deltaY;
    }
  }

  /**
   * Définit la position d'un enfant dans le système de coordonnées de la Card
   * @param {Component} child - L'enfant à positionner
   * @param {number} relativeX - Position X relative à la Card
   * @param {number} relativeY - Position Y relative à la Card
   */
  setChildPosition(child, relativeX, relativeY) {
    if (this.children.includes(child)) {
      child.x = this.x + relativeX;
      child.y = this.y + relativeY;
      this.childPositions.set(child, { x: relativeX, y: relativeY });
    }
  }

  /**
   * Active/désactive le layout automatique
   * @param {boolean} enabled - True pour activer le layout automatique
   */
  setAutoLayout(enabled) {
    this.autoLayout = enabled;
    if (enabled) this.layout();
  }

  /**
   * Force un recalcul du layout
   */
  updateLayout() {
    this.layout();
  }

  /**
   * Génère les paramètres d'ombre selon le niveau d'élévation
   * @param {number} elevation - Niveau d'élévation (0-5)
   * @returns {Object} Configuration de l'ombre
   * @private
   */
  getShadowConfig(elevation) {
    const shadows = [
      { blur: 0, offsetY: 0, color: 'transparent', spread: 0 },
      { blur: 2, offsetY: 1, color: 'rgba(0,0,0,0.12)', spread: 0 },
      { blur: 3, offsetY: 1, color: 'rgba(0,0,0,0.14)', spread: 0 },
      { blur: 4, offsetY: 2, color: 'rgba(0,0,0,0.16)', spread: 0 },
      { blur: 6, offsetY: 3, color: 'rgba(0,0,0,0.18)', spread: 0 },
      { blur: 8, offsetY: 4, color: 'rgba(0,0,0,0.20)', spread: 0 },
    ];
    
    return shadows[Math.min(elevation, shadows.length - 1)];
  }

  /**
   * Dessine l'effet d'ombre selon l'élévation
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawShadow(ctx) {
    if (this.elevation <= 0) return;
    
    const shadow = this.getShadowConfig(this.elevation);
    
    ctx.save();
    
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.offsetY;
    
    if (this.borderRadius > 0) {
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y + shadow.offsetY, this.width, this.height, this.borderRadius);
      ctx.fillStyle = this.bgColor === 'transparent' ? 'white' : this.bgColor;
      ctx.fill();
    } else {
      ctx.fillStyle = this.bgColor === 'transparent' ? 'white' : this.bgColor;
      ctx.fillRect(this.x, this.y + shadow.offsetY, this.width, this.height);
    }
    
    ctx.restore();
  }

  /**
   * Dessine la carte et ses enfants
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Dessiner l'ombre si elevation > 0
    if (this.elevation > 0) {
      this.drawShadow(ctx);
    }
    
    // Dessiner le fond de la carte
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

  /**
   * Dessine un rectangle avec coins arrondis
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} width - Largeur
   * @param {number} height - Hauteur
   * @param {number} radius - Rayon des coins
   * @private
   */
  roundRect(ctx, x, y, width, height, radius) {
    if (radius === 0) {
      ctx.rect(x, y, width, height);
      return;
    }
    
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

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans la vue
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }

  /**
   * Définit le niveau d'élévation
   * @param {number} elevation - Nouveau niveau d'élévation (0-5)
   */
  setElevation(elevation) {
    this.elevation = Math.max(0, Math.min(elevation, 5));
  }

  /**
   * Augmente le niveau d'élévation
   */
  raise() {
    this.setElevation(this.elevation + 1);
  }

  /**
   * Réduit le niveau d'élévation
   */
  lower() {
    this.setElevation(this.elevation - 1);
  }

  /**
   * Définit l'espacement entre enfants
   * @param {number} gap - Nouvel espacement
   */
  setGap(gap) {
    this.gap = Math.max(0, gap);
    if (this.autoLayout) this.layout();
  }

  /**
   * Définit le padding
   * @param {number} padding - Nouveau padding
   */
  setPadding(padding) {
    this.padding = Math.max(0, padding);
    if (this.autoLayout) this.layout();
  }

  /**
   * Définit la direction du layout
   * @param {string} direction - 'column' ou 'row'
   */
  setDirection(direction) {
    if (direction === 'column' || direction === 'row') {
      this.direction = direction;
      if (this.autoLayout) this.layout();
    }
  }

  /**
   * Définit l'alignement
   * @param {string} align - 'start', 'center', 'end' ou 'stretch'
   */
  setAlign(align) {
    if (['start', 'center', 'end', 'stretch'].includes(align)) {
      this.align = align;
      if (this.autoLayout) this.layout();
    }
  }

  /**
   * Calcule la hauteur totale nécessaire pour contenir tous les enfants
   * @returns {number} Hauteur totale nécessaire
   */
  getTotalHeight() {
    if (this.children.length === 0) return 0;
    
    if (this.direction === 'column') {
      const totalChildrenHeight = this.children.reduce((sum, child) => sum + child.height, 0);
      const totalGapHeight = this.gap * Math.max(0, this.children.length - 1);
      return totalChildrenHeight + totalGapHeight + (this.padding * 2);
    }
    return this.height;
  }

  /**
   * Calcule la largeur totale nécessaire pour contenir tous les enfants
   * @returns {number} Largeur totale nécessaire
   */
  getTotalWidth() {
    if (this.children.length === 0) return 0;
    
    if (this.direction === 'row') {
      const totalChildrenWidth = this.children.reduce((sum, child) => sum + child.width, 0);
      const totalGapWidth = this.gap * Math.max(0, this.children.length - 1);
      return totalChildrenWidth + totalGapWidth + (this.padding * 2);
    }
    return this.width;
  }

  /**
   * Ajuste automatiquement la hauteur de la carte pour contenir tous les enfants
   */
  fitHeight() {
    if (this.direction === 'column') {
      this.height = this.getTotalHeight();
    }
  }

  /**
   * Ajuste automatiquement la largeur de la carte pour contenir tous les enfants
   */
  fitWidth() {
    if (this.direction === 'row') {
      this.width = this.getTotalWidth();
    }
  }

  /**
   * Ajuste automatiquement les dimensions de la carte pour contenir tous les enfants
   */
  fitSize() {
    this.fitWidth();
    this.fitHeight();
  }

  /**
   * Met à jour les dimensions et relayout si autoLayout est activé
   * @param {number} width - Nouvelle largeur
   * @param {number} height - Nouvelle hauteur
   */
  setSize(width, height) {
    super.setSize(width, height);
    if (this.autoLayout) this.layout();
  }

  /**
   * Obtient la position relative d'un enfant
   * @param {Component} child - L'enfant
   * @returns {Object|null} Position relative {x, y} ou null si non trouvé
   */
  getChildPosition(child) {
    return this.childPositions.get(child) || null;
  }
}

export default Card;
