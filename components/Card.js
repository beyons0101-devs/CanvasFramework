import Component from '../core/Component.js';
/**
 * Carte avec ombre et contenu
 * @class
 * @extends Component
 * @property {Component[]} children - Enfants de la carte
 * @property {number} padding - Padding interne
 * @property {string} bgColor - Couleur de fond
 * @property {number} elevation - Élévation (ombre)
 * @property {number} borderRadius - Rayon des coins
 * @property {boolean} clipContent - Clip le contenu
 * @property {boolean} clickableChildren - Active les clics sur les enfants
 */
class Card extends Component {
  /**
   * Crée une instance de Card
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.padding=16] - Padding interne
   * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
   * @param {number} [options.elevation=2] - Élévation (ombre)
   * @param {number} [options.borderRadius] - Rayon des coins (auto selon platform)
   * @param {boolean} [options.clipContent=true] - Clip le contenu
   * @param {boolean} [options.clickableChildren=true] - Active les clics enfants
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.children = [];
    this.padding = options.padding || 16;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.elevation = options.elevation || 2;
    this.borderRadius = options.borderRadius || (framework.platform === 'material' ? 4 : 12);
    this.clipContent = options.clipContent !== false;
    this.clickableChildren = options.clickableChildren !== false; // NOUVEAU: activer/désactiver les enfants cliquables
  }

  /**
   * Ajoute un enfant à la carte
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    // Ajuster les coordonnées de l'enfant pour qu'elles soient relatives à la Card
    child.x = child.x || 0;
    child.y = child.y || 0;
    this.children.push(child);
    
    // Marquer l'enfant comme appartenant à cette Card
    child.parentCard = this;
    
    return child;
  }

  /**
   * Dessine la carte et ses enfants
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre
    if (this.elevation > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = this.elevation * 3;
      ctx.shadowOffsetY = this.elevation;
    }
    
    // Background
    ctx.fillStyle = this.bgColor;
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Clipping pour empêcher le contenu de déborder
    if (this.clipContent) {
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();
    }
    
    // Children - dessinés relativement à la Card
    for (let child of this.children) {
      if (child.visible) {
        // Sauvegarder les coordonnées originales
        const originalX = child.x;
        const originalY = child.y;
        
        // Ajuster les coordonnées pour être relatives à la Card
        child.x = this.x + this.padding + originalX;
        child.y = this.y + this.padding + originalY;
        
        // Dessiner l'enfant
        child.draw(ctx);
        
        // Restaurer les coordonnées originales
        child.x = originalX;
        child.y = originalY;
      }
    }
    
    ctx.restore();
  }

  /**
   * Vérifie les clics sur les enfants
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si un enfant a été cliqué
   * @private
   */
  checkChildClick(x, y) {
    // Ajuster y avec le scrollOffset
    const adjustedY = y - this.framework.scrollOffset;
    
    // Vérifier chaque enfant
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      
      // Calculer les coordonnées absolues de l'enfant
      const childX = this.x + this.padding + child.x;
      const childY = this.y + this.padding + child.y;
      
      // Vérifier si le clic est dans l'enfant
      if (child.visible && 
          adjustedY >= childY && 
          adjustedY <= childY + child.height &&
          x >= childX && 
          x <= childX + child.width) {
        
        // Si l'enfant a un onClick ou onPress, le déclencher
        if (child.onClick) {
          child.onClick();
          return true;
        } else if (child.onPress) {
          child.onPress(x, adjustedY);
          return true;
        }
      }
    }
    
    return false;
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
   * @returns {boolean} True si le point est dans la carte
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
  
  /**
   * Gère le clic sur la carte
   * @private
   */
  onClick() {
    // La Card elle-même peut avoir un onClick, mais on veut aussi vérifier les enfants
    // Cette logique est gérée dans le CanvasFramework modifié ci-dessous
  }
}

export default Card;