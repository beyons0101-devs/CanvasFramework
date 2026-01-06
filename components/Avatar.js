import Component from '../core/Component.js';
/**
 * Avatar (photo de profil)
 * @class
 * @extends Component
 * @property {string|null} imageUrl - URL de l'image
 * @property {string} initials - Initiales
 * @property {number} size - Taille
 * @property {string} bgColor - Couleur de fond
 * @property {string} textColor - Couleur du texte
 * @property {number} borderWidth - Épaisseur de la bordure
 * @property {string} borderColor - Couleur de la bordure
 * @property {string|null} status - Statut ('online', 'offline', 'away', 'busy')
 * @property {ImageComponent|null} imageComponent - Composant image interne
 */
class Avatar extends Component {
  /**
   * Crée une instance de Avatar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.imageUrl] - URL de l'image
   * @param {string} [options.initials='??'] - Initiales
   * @param {number} [options.size=48] - Taille
   * @param {string} [options.bgColor] - Couleur de fond (auto générée)
   * @param {string} [options.textColor='#FFFFFF'] - Couleur du texte
   * @param {number} [options.borderWidth=0] - Épaisseur de la bordure
   * @param {string} [options.borderColor='#FFFFFF'] - Couleur de la bordure
   * @param {string} [options.status] - Statut
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.imageUrl = options.imageUrl || null;
    this.initials = options.initials || '??';
    this.size = options.size || 48;
    this.bgColor = options.bgColor || this.generateColor(this.initials);
    this.textColor = options.textColor || '#FFFFFF';
    this.borderWidth = options.borderWidth || 0;
    this.borderColor = options.borderColor || '#FFFFFF';
    this.status = options.status || null; // 'online', 'offline', 'away', 'busy'
    
    this.width = this.size;
    this.height = this.size;
    
    // Image component interne
    this.imageComponent = null;
    if (this.imageUrl) {
      this.imageComponent = new ImageComponent(framework, {
        x: this.x,
        y: this.y,
        width: this.size,
        height: this.size,
        src: this.imageUrl,
        fit: 'cover',
        borderRadius: this.size / 2
      });
    }
  }
  
  /**
   * Génère une couleur basée sur le texte
   * @param {string} text - Texte pour générer la couleur
   * @returns {string} Couleur hexadécimale
   * @private
   */
  generateColor(text) {
    // Générer une couleur basée sur le texte (pour cohérence)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#00BCD4', '#009688', '#4CAF50',
      '#FF9800', '#FF5722', '#795548', '#607D8B'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  /**
   * Dessine l'avatar
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;
    const radius = this.size / 2;
    
    // Bordure
    if (this.borderWidth > 0) {
      ctx.fillStyle = this.borderColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Clipping circulaire
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - this.borderWidth, 0, Math.PI * 2);
    ctx.clip();
    
    if (this.imageComponent && this.imageComponent.loaded) {
      // Dessiner l'image
      this.imageComponent.x = this.x + this.borderWidth;
      this.imageComponent.y = this.y + this.borderWidth;
      this.imageComponent.width = this.size - this.borderWidth * 2;
      this.imageComponent.height = this.size - this.borderWidth * 2;
      this.imageComponent.draw(ctx);
    } else {
      // Background coloré
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      
      // Initiales
      ctx.fillStyle = this.textColor;
      ctx.font = `bold ${this.size / 2.5}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.initials.toUpperCase(), centerX, centerY);
    }
    
    ctx.restore();
    
    // Indicateur de statut
    if (this.status) {
      const statusSize = this.size / 4;
      const statusX = this.x + this.size - statusSize;
      const statusY = this.y + this.size - statusSize;
      
      let statusColor;
      switch (this.status) {
        case 'online': statusColor = '#4CAF50'; break;
        case 'offline': statusColor = '#9E9E9E'; break;
        case 'away': statusColor = '#FF9800'; break;
        case 'busy': statusColor = '#F44336'; break;
        default: statusColor = '#9E9E9E';
      }
      
      // Bordure blanche autour du statut
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(statusX, statusY, statusSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      
      // Cercle de statut
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(statusX, statusY, statusSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  /**
   * Change l'image de l'avatar
   * @param {string} url - Nouvelle URL d'image
   */
  setImage(url) {
    this.imageUrl = url;
    if (url) {
      this.imageComponent = new ImageComponent(this.framework, {
        x: this.x,
        y: this.y,
        width: this.size,
        height: this.size,
        src: url,
        fit: 'cover',
        borderRadius: this.size / 2
      });
    } else {
      this.imageComponent = null;
    }
  }
  
  /**
   * Change le statut
   * @param {string} status - Nouveau statut
   */
  setStatus(status) {
    this.status = status;
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans l'avatar
   */
  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    const dx = x - (this.x + this.size / 2);
    const dy = adjustedY - (this.y + this.size / 2);
    return Math.sqrt(dx * dx + dy * dy) <= this.size / 2;
  }
}

export default Avatar;