import Component from '../core/Component.js';

/**
 * Bouton d'action flottant (Material Design 3)
 * @class
 * @extends Component
 * @property {string} icon - Icône du bouton
 * @property {boolean} extended - Mode étendu (avec texte)
 * @property {string} text - Texte (en mode étendu)
 * @property {string} platform - Plateforme
 * @property {string} variant - Variante Material 3: 'small', 'medium', 'large', 'extended'
 * @property {number} size - Taille du bouton
 * @property {string} bgColor - Couleur de fond
 * @property {string} iconColor - Couleur de l'icône
 * @property {Array} ripples - Effets ripple
 */
class FAB extends Component {
  /**
   * Crée une instance de FAB
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.icon='+'] - Icône
   * @param {boolean} [options.extended=false] - Mode étendu
   * @param {string} [options.text=''] - Texte (mode étendu)
   * @param {string} [options.variant='medium'] - Variante: 'small', 'medium', 'large', 'extended'
   * @param {string} [options.bgColor] - Couleur (auto selon platform)
   * @param {string} [options.iconColor='#FFFFFF'] - Couleur de l'icône
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.icon = options.icon || '+';
    this.extended = options.extended || false;
    this.text = options.text || '';
    this.platform = framework.platform;
    this.variant = options.variant || 'medium';
    
    // Tailles selon Material Design 3
    const sizes = {
      small: 40,
      medium: 56,
      large: 96
    };
    
    this.size = options.size || sizes[this.variant] || 56;
    
    // Couleurs Material 3
    this.bgColor = options.bgColor || (framework.platform === 'material' ? '#6750A4' : '#007AFF');
    this.iconColor = options.iconColor || '#FFFFFF';
    
    // Border radius selon Material 3 (pas circulaire!)
    this.borderRadius = {
      small: 12,
      medium: 16,
      large: 28,
      extended: 16
    }[this.variant] || 16;
    
    // Position par défaut en bas à droite
    this.x = options.x !== undefined ? options.x : framework.width - this.size - 16;
    this.y = options.y !== undefined ? options.y : framework.height - this.size - 80;
    
    // Si extended, ajuster la largeur
    if (this.extended && this.text) {
      const ctx = framework.ctx;
      ctx.save();
      ctx.font = 'bold 14px -apple-system, sans-serif';
      const textWidth = ctx.measureText(this.text).width;
      ctx.restore();
      this.width = this.size + textWidth + 24;
      this.borderRadius = 16;
    } else {
      this.width = this.size;
    }
    this.height = this.size;
    
    // Effet ripple
    this.ripples = [];
    
    // ✅ CORRECTION : Binder onPress comme dans Button
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Gère la pression sur le FAB
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    // Créer un ripple au point de clic (Material uniquement)
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
   * Anime l'effet ripple
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
        
        // Fade out après 50% de l'expansion
        if (ripple.radius >= ripple.maxRadius * 0.5) {
          ripple.opacity -= 0.05;
        }
      }
      
      // Nettoyer les ripples terminés
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      
      if (hasActiveRipples) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Dessine le FAB
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre (elevation)
    if (!this.pressed) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = this.platform === 'material' ? 8 : 12;
      ctx.shadowOffsetY = this.platform === 'material' ? 4 : 6;
    }
    
    // Background - Material 3: rectangles arrondis, pas cercles!
    ctx.fillStyle = this.pressed ? this.darkenColor(this.bgColor) : this.bgColor;
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Clipping pour les ripples (Material uniquement)
    if (this.platform === 'material') {
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.clip();
      
      // Dessiner les ripples
      for (let ripple of this.ripples) {
        ctx.globalAlpha = ripple.opacity;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
    
    // Overlay si pressed (iOS)
    if (this.pressed && this.platform === 'cupertino') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.fill();
    }
    
    // Icône
    ctx.fillStyle = this.iconColor;
    const iconSize = this.variant === 'large' ? 36 : 24;
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (this.extended && this.text) {
      // Icône à gauche
      ctx.fillText(this.icon, this.x + this.size / 2, this.y + this.size / 2);
      
      // Texte à droite
      ctx.font = 'bold 14px -apple-system, sans-serif';
      ctx.fillText(this.text, this.x + this.size + 12, this.y + this.size / 2);
    } else {
      // Icône centrée
      ctx.fillText(this.icon, this.x + this.width / 2, this.y + this.height / 2);
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
   * Assombrit une couleur
   * @param {string} color - Couleur hexadécimale
   * @returns {string} Couleur assombrie
   * @private
   */
  darkenColor(color) {
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  }
  
  /**
   * Convertit une couleur hex en RGB
   * @param {string} hex - Couleur hexadécimale
   * @returns {{r: number, g: number, b: number}} Objet RGB
   * @private
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le FAB
   */
  isPointInside(x, y) {
    // Material 3: toujours des rectangles arrondis, plus de cercles
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }
}

export default FAB;