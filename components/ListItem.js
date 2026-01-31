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
      // ✅ CORRECTION : Calculer les coordonnées LOCALES du composant
      // x et y sont déjà les coordonnées écran après ajustement par le framework
      
      // Calculer les coordonnées relatives au composant
      const localX = x - this.x;
      const localY = y - this.y;
      
      // ✅ AJOUTER : Vérifier si le point est vraiment dans le composant
      if (localX < 0 || localX > this.width || localY < 0 || localY > this.height) {
        return; // Le clic n'est pas dans le composant
      }
      
      this.ripples.push({
        x: localX, // ✅ Coordonnée X relative au composant
        y: localY, // ✅ Coordonnée Y relative au composant
        radius: 0,
        maxRadius: Math.max(this.width, this.height) * 1.5,
        opacity: 1,
        startTime: Date.now() // Pour une animation plus précise
      });
      // ✅ TEMPORAIREMENT mettre pressed à true pour le feedback visuel immédiat
      this.pressed = true;
      
      // ✅ MAIS le remettre à false après un court délai
      setTimeout(() => {
        this.pressed = false;
      }, 150); // 150ms de feedback tactile
      this.animateRipple();
    }
  }
  
  /**
   * Anime les effets ripple
   * @private
   */
  animateRipple() {
    let animationId = null;
    const startTime = Date.now();
    const duration = 600; // 600ms pour l'animation complète
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      let hasActiveRipples = false;
      
      for (let ripple of this.ripples) {
        // ✅ Animation plus fluide avec easing
        const easedProgress = this.easeOutCubic(progress);
        ripple.radius = easedProgress * ripple.maxRadius;
        
        // Fade out à partir de 50% de progression
        if (progress > 0.5) {
          const fadeProgress = (progress - 0.5) / 0.5;
          ripple.opacity = 1 - fadeProgress;
        }
        
        if (progress < 1) {
          hasActiveRipples = true;
        }
      }
      
      // Filtrer les ripples terminés
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      
      if (hasActiveRipples && this.ripples.length > 0) {
        animationId = requestAnimationFrame(animate);
      } else {
        // ✅ Nettoyer quand l'animation est terminée
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        this.ripples = [];
      }
    };
    
    animationId = requestAnimationFrame(animate);
  }
  
   /**
   * Fonction d'easing pour animation fluide
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  /**
   * Dessine l'élément de liste
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // 1. Background (toujours opaque)
    ctx.fillStyle = this.pressed ? '#F5F5F5' : this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 2. Ripples (si présents)
    if (this.platform === 'material' && this.ripples.length > 0) {
        ctx.save();
        
        // Clip pour contenir les ripples
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.clip();
        
        // Dessiner tous les ripples
        for (let ripple of this.ripples) {
            // Utiliser fillStyle avec alpha intégré au lieu de globalAlpha
            ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * ripple.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // 3. Contenu (texte, icônes, etc.) - toujours avec alpha = 1
    this.drawContent(ctx);
    
    ctx.restore();
}

/**
 * Dessine le contenu du ListItem (séparé pour plus de clarté)
 */
drawContent(ctx) {
    let leftOffset = 16;
    
    if (this.leftIcon) {
        ctx.fillStyle = '#757575';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.leftIcon, this.x + leftOffset, this.y + this.height / 2);
        leftOffset += 48;
    } else if (this.leftImage) {
        ctx.fillStyle = '#E0E0E0';
        ctx.beginPath();
        ctx.arc(this.x + leftOffset + 20, this.y + this.height / 2, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#757575';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', this.x + leftOffset + 20, this.y + this.height / 2);
        leftOffset += 56;
    }
    
    const textX = this.x + leftOffset;
    const centerY = this.y + this.height / 2;
    
    if (this.subtitle) {
        ctx.fillStyle = '#000000';
        ctx.font = '16px -apple-system, Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.title, textX, centerY - 2);
        
        ctx.fillStyle = '#757575';
        ctx.font = '14px -apple-system, Roboto, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(this.subtitle, textX, centerY + 2);
    } else {
        ctx.fillStyle = '#000000';
        ctx.font = '16px -apple-system, Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.title, textX, centerY);
    }
    
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
    
    if (this.divider) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + leftOffset, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.stroke();
    }
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