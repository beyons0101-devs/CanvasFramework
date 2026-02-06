import Component from '../core/Component.js';
/**
 * Container avec système de layout et effet d'élévation
 * @class
 * @extends Component
 * @property {Component[]} children - Enfants
 * @property {number} padding - Padding interne
 * @property {number} gap - Espacement entre enfants
 * @property {string} direction - Direction ('column' ou 'row')
 * @property {string} align - Alignement ('start', 'center', 'end')
 * @property {string} bgColor - Couleur de fond
 * @property {number} borderRadius - Rayon des coins
 * @property {number} elevation - Niveau d'élévation (ombres)
 */
class Card extends Component {
  /**
   * Crée une instance de Card
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.padding=0] - Padding interne
   * @param {number} [options.gap=0] - Espacement entre enfants
   * @param {string} [options.direction='column'] - Direction
   * @param {string} [options.align='start'] - Alignement
   * @param {string} [options.bgColor='transparent'] - Couleur de fond
   * @param {number} [options.borderRadius=0] - Rayon des coins
   * @param {number} [options.elevation=0] - Niveau d'élévation (0-5)
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
    this.elevation = options.elevation || 0; // Nouvelle propriété
  }

  /**
   * Ajoute un enfant
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    this.children.push(child);
    this.layout();
    return child;
  }

  /**
   * Organise les enfants selon le layout
   * @private
   */
  layout() {
    let currentX = this.x + this.padding;
    let currentY = this.y + this.padding;
    
    for (let child of this.children) {
      if (this.direction === 'column') {
        child.x = currentX;
        child.y = currentY;
        if (this.align === 'center') {
          child.x = this.x + (this.width - child.width) / 2;
        } else if (this.align === 'end') {
          child.x = this.x + this.width - child.width - this.padding;
        }
        currentY += child.height + this.gap;
      } else {
        child.x = currentX;
        child.y = currentY;
        if (this.align === 'center') {
          child.y = this.y + (this.height - child.height) / 2;
        } else if (this.align === 'end') {
          child.y = this.y + this.height - child.height - this.padding;
        }
        currentX += child.width + this.gap;
      }
    }
  }

  /**
   * Génère les paramètres d'ombre selon le niveau d'élévation
   * @param {number} elevation - Niveau d'élévation (0-5)
   * @returns {Object} Configuration de l'ombre
   * @private
   */
  getShadowConfig(elevation) {
    const shadows = [
      { blur: 0, offsetY: 0, color: 'transparent', spread: 0 }, // 0 - pas d'ombre
      { blur: 2, offsetY: 1, color: 'rgba(0,0,0,0.12)', spread: 0 }, // 1 - léger
      { blur: 3, offsetY: 1, color: 'rgba(0,0,0,0.14)', spread: 0 }, // 2 - léger
      { blur: 4, offsetY: 2, color: 'rgba(0,0,0,0.16)', spread: 0 }, // 3 - moyen
      { blur: 6, offsetY: 3, color: 'rgba(0,0,0,0.18)', spread: 0 }, // 4 - moyen
      { blur: 8, offsetY: 4, color: 'rgba(0,0,0,0.20)', spread: 0 }, // 5 - fort
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
    
    // Sauvegarder l'état du contexte
    ctx.save();
    
    // Configurer l'ombre
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow.offsetY;
    
    // Dessiner un rectangle pour l'ombre
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
}

export default Card;
