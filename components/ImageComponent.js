import Component from '../core/Component.js';
/**
 * Composant d'image
 * @class
 * @extends Component
 * @property {string} src - URL de l'image
 * @property {string} fit - Mode d'ajustement ('cover', 'contain', 'fill', 'none')
 * @property {number} borderRadius - Rayon des coins
 * @property {string} placeholder - Couleur de placeholder
 * @property {boolean} loaded - Image chargée
 * @property {boolean} loading - En cours de chargement
 * @property {boolean} error - Erreur de chargement
 * @property {HTMLImageElement} img - Élément image HTML
 */
class ImageComponent extends Component {
  /**
   * Crée une instance de ImageComponent
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.src=''] - URL de l'image
   * @param {string} [options.fit='cover'] - Mode d'ajustement
   * @param {number} [options.borderRadius=0] - Rayon des coins
   * @param {string} [options.placeholder='#E0E0E0'] - Couleur de placeholder
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.src = options.src || '';
    this.fit = options.fit || 'cover'; // cover, contain, fill, none
    this.borderRadius = options.borderRadius || 0;
    this.placeholder = options.placeholder || '#E0E0E0';
    this.loaded = false;
    this.loading = false;
    this.error = false;
    
    // Créer l'élément image
    this.img = null;
    if (this.src) {
      this.loadImage();
    }
  }
  
  /**
   * Charge l'image
   * @private
   */
  loadImage() {
    if (this.loading) return;
    
    this.loading = true;
    this.img = new Image();
    this.img.crossOrigin = 'anonymous';
    
    this.img.onload = () => {
      this.loaded = true;
      this.loading = false;
      this.error = false;
    };
    
    this.img.onerror = () => {
      this.loaded = false;
      this.loading = false;
      this.error = true;
    };
    
    this.img.src = this.src;
  }
  
  /**
   * Change l'URL de l'image
   * @param {string} newSrc - Nouvelle URL
   */
  setSrc(newSrc) {
    this.src = newSrc;
    this.loaded = false;
    this.error = false;
    this.loadImage();
  }
  
  /**
   * Dessine l'image
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Clipping avec borderRadius
    if (this.borderRadius > 0) {
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();
    }
    
    if (this.loaded && this.img) {
      // Dessiner l'image selon le mode fit
      const imgRatio = this.img.width / this.img.height;
      const boxRatio = this.width / this.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      switch (this.fit) {
        case 'cover':
          if (imgRatio > boxRatio) {
            drawHeight = this.height;
            drawWidth = drawHeight * imgRatio;
            drawX = this.x - (drawWidth - this.width) / 2;
            drawY = this.y;
          } else {
            drawWidth = this.width;
            drawHeight = drawWidth / imgRatio;
            drawX = this.x;
            drawY = this.y - (drawHeight - this.height) / 2;
          }
          break;
          
        case 'contain':
          if (imgRatio > boxRatio) {
            drawWidth = this.width;
            drawHeight = drawWidth / imgRatio;
            drawX = this.x;
            drawY = this.y + (this.height - drawHeight) / 2;
          } else {
            drawHeight = this.height;
            drawWidth = drawHeight * imgRatio;
            drawX = this.x + (this.width - drawWidth) / 2;
            drawY = this.y;
          }
          break;
          
        case 'fill':
          drawX = this.x;
          drawY = this.y;
          drawWidth = this.width;
          drawHeight = this.height;
          break;
          
        case 'none':
          drawX = this.x + (this.width - this.img.width) / 2;
          drawY = this.y + (this.height - this.img.height) / 2;
          drawWidth = this.img.width;
          drawHeight = this.img.height;
          break;
          
        default:
          drawX = this.x;
          drawY = this.y;
          drawWidth = this.width;
          drawHeight = this.height;
      }
      
      ctx.drawImage(this.img, drawX, drawY, drawWidth, drawHeight);
      
    } else if (this.loading) {
      // Placeholder avec spinner
      ctx.fillStyle = this.placeholder;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Petit spinner au centre
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      const spinnerSize = Math.min(40, this.width / 3, this.height / 3);
      
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const rotation = (Date.now() / 10) % 360 * (Math.PI / 180);
      ctx.beginPath();
      ctx.arc(centerX, centerY, spinnerSize / 2, rotation, rotation + Math.PI * 1.5);
      ctx.stroke();
      
    } else if (this.error) {
      // Placeholder avec icône d'erreur
      ctx.fillStyle = this.placeholder;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      ctx.fillStyle = '#999999';
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️', this.x + this.width / 2, this.y + this.height / 2);
      
    } else {
      // Placeholder simple
      ctx.fillStyle = this.placeholder;
      ctx.fillRect(this.x, this.y, this.width, this.height);
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
   * @returns {boolean} False (non cliquable par défaut)
   */
  isPointInside() {
    return false; // Non cliquable par défaut
  }
}

export default ImageComponent;