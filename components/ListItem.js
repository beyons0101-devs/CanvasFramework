import Component from '../core/Component.js';
/**
 * Élément de liste
 * @class
 * @extends Component
 * @property {string} title - Titre
 * @property {string} subtitle - Sous-titre
 * @property {string|null} leftIcon - Icône gauche
 * @property {string|null} leftImage - Image gauche (URL)
 * @property {string|null} rightIcon - Icône droite
 * @property {string|null} rightText - Texte droite
 * @property {boolean} divider - Afficher un diviseur
 * @property {string} platform - Plateforme
 * @property {string} bgColor - Couleur de fond
 * @property {Array} ripples - Effets ripple (Material)
 */
class ListItem extends Component {
  /**
   * Crée une instance de ListItem
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title=''] - Titre
   * @param {string} [options.subtitle=''] - Sous-titre
   * @param {string} [options.leftIcon] - Icône gauche
   * @param {string} [options.leftImage] - URL image gauche
   * @param {string} [options.rightIcon] - Icône droite
   * @param {string} [options.rightText] - Texte droite
   * @param {boolean} [options.divider=true] - Diviseur
   * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
   * @param {number} [options.height] - Hauteur (auto selon contenu)
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.title = options.title || '';
    this.subtitle = options.subtitle || '';
    this.leftIcon = options.leftIcon || null;
    this.leftImage = options.leftImage || null; // URL d'image
    this.rightIcon = options.rightIcon || null;
    this.rightText = options.rightText || '';
    this.divider = options.divider !== false;
    this.platform = framework.platform;
    this.height = options.height || (this.subtitle ? 72 : 56);
    this.width = options.width || framework.width;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.ripples = []; // Pour l'effet ripple Material
    
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    if (this.platform === 'material') {
      const adjustedY = y - this.framework.scrollOffset;
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
   * @private
   */
  animateRipple() {
    const animate = () => {
      let hasActiveRipples = false;
      
      for (let ripple of this.ripples) {
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += ripple.maxRadius / 15;
          hasActiveRipples = true;
        }
        
        if (ripple.radius >= ripple.maxRadius * 0.5) {
          ripple.opacity -= 0.05;
        }
      }
      
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      
      if (hasActiveRipples) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Dessine l'élément de liste
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = this.pressed ? '#F5F5F5' : this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Ripple effect (Material)
    if (this.platform === 'material' && this.ripples.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x, this.y, this.width, this.height);
      ctx.clip();
      
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    let leftOffset = 16;
    
    // Left Icon ou Image
    if (this.leftIcon) {
      ctx.fillStyle = '#757575';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.leftIcon, this.x + leftOffset, this.y + this.height / 2);
      leftOffset += 48;
    } else if (this.leftImage) {
      // Circle pour l'avatar
      ctx.fillStyle = '#E0E0E0';
      ctx.beginPath();
      ctx.arc(this.x + leftOffset + 20, this.y + this.height / 2, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // TODO: Charger vraie image
      ctx.fillStyle = '#757575';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', this.x + leftOffset + 20, this.y + this.height / 2);
      
      leftOffset += 56;
    }
    
    // Title et Subtitle
    const textX = this.x + leftOffset;
    const centerY = this.y + this.height / 2;
    
    if (this.subtitle) {
      // Title
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.title, textX, centerY - 2);
      
      // Subtitle
      ctx.fillStyle = '#757575';
      ctx.font = '14px -apple-system, Roboto, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(this.subtitle, textX, centerY + 2);
    } else {
      // Title seul (centré verticalement)
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.title, textX, centerY);
    }
    
    // Right Text ou Icon
    if (this.rightText) {
      ctx.fillStyle = '#757575';
      ctx.font = '14px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.rightText, this.x + this.width - 16, centerY);
    } else if (this.rightIcon) {
      ctx.fillStyle = '#757575';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.rightIcon, this.x + this.width - 16, centerY);
    }
    
    // Divider
    if (this.divider) {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + leftOffset, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans l'élément
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default ListItem;