import Component from '../core/Component.js';
/**
 * Toast (notification temporaire)
 * @class
 * @extends Component
 * @property {string} text - Message
 * @property {number} duration - Durée d'affichage
 * @property {number} fontSize - Taille de police
 * @property {number} padding - Padding interne
 * @property {number} opacity - Opacité
 * @property {string} platform - Plateforme
 * @property {boolean} isVisible - Visibilité
 * @property {number} targetY - Position Y cible
 * @property {number} minWidth - Largeur minimale
 * @property {number} maxWidth - Largeur maximale
 * @property {boolean} animating - En cours d'animation
 */
class Toast extends Component {
  /**
   * Crée une instance de Toast
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.text=''] - Message
   * @param {number} [options.duration=3000] - Durée en ms
   * @param {number} [options.x] - Position X (auto-centré)
   * @param {number} [options.y] - Position Y (en bas)
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: framework.height, // Commence hors écran en bas
      width: framework.width,
      height: 60, // Hauteur fixe pour le toast
      ...options
    });
    
    this.text = options.text || '';
    this.duration = options.duration || 3000;
    this.fontSize = 16;
    this.padding = 20;
    this.opacity = 0;
    this.platform = framework.platform;
    this.isVisible = false;
    
    // Position cible (en bas, légèrement remonté)
    this.targetY = framework.height - 100;
    
    // Calculer la largeur minimale
    this.minWidth = 200;
    this.maxWidth = Math.min(600, framework.width - 40);
    
    // Animation
    this.animating = false;
    
    // NE PAS appeler show() ici - laissé à l'appelant
  }

  /**
   * Affiche le toast
   */
  show() {
    this.isVisible = true;
    this.visible = true;
    this.animateIn();
    
    // Auto-dismiss après la durée
    setTimeout(() => {
      if (this.isVisible) {
        this.hide();
      }
    }, this.duration);
  }

  /**
   * Cache le toast
   */
  hide() {
    this.animateOut();
  }

  /**
   * Anime l'entrée
   * @private
   */
  animateIn() {
    if (this.animating) return;
    this.animating = true;
    
    const animate = () => {
      this.opacity += 0.1;
      this.y -= (this.y - this.targetY) * 0.2;
      
      if (this.opacity >= 1 && Math.abs(this.y - this.targetY) < 1) {
        this.opacity = 1;
        this.y = this.targetY;
        this.animating = false;
        return;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Anime la sortie
   * @private
   */
  animateOut() {
    if (this.animating) return;
    this.animating = true;
    
    const animate = () => {
      this.opacity -= 0.1;
      this.y += 5;
      
      if (this.opacity <= 0) {
        this.opacity = 0;
        this.isVisible = false;
        this.visible = false;
        this.animating = false;
        this.framework.remove(this);
        return;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Dessine le toast
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.isVisible || this.opacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Calculer la largeur en fonction du texte
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    const textWidth = ctx.measureText(this.text).width;
    const toastWidth = Math.min(
      this.maxWidth,
      Math.max(this.minWidth, textWidth + this.padding * 2)
    );
    
    // Position centrée horizontalement
    const toastX = (this.framework.width - toastWidth) / 2;
    const toastY = this.y;
    
    if (this.platform === 'material') {
      // Material Toast
      ctx.fillStyle = '#323232';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      this.roundRect(ctx, toastX, toastY, toastWidth, this.height, 8);
      ctx.fill();
    } else {
      // Cupertino Toast
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      this.roundRect(ctx, toastX, toastY, toastWidth, this.height, 14);
      ctx.fill();
    }
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Texte
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Tronquer le texte si nécessaire
    let displayText = this.text;
    if (textWidth > toastWidth - this.padding * 2) {
      // Trouver où couper le texte
      let truncated = this.text;
      for (let i = this.text.length; i > 0; i--) {
        truncated = this.text.substring(0, i) + '...';
        if (ctx.measureText(truncated).width <= toastWidth - this.padding * 2) {
          displayText = truncated;
          break;
        }
      }
    }
    
    ctx.fillText(displayText, toastX + toastWidth / 2, toastY + this.height / 2);
    
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
   * @returns {boolean} False (non cliquable)
   */
  isPointInside() {
    return false; // Non cliquable
  }
}

export default Toast;