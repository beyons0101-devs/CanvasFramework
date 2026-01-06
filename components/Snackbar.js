import Component from '../core/Component.js';
/**
 * Snackbar (notification avec action)
 * @class
 * @extends Component
 * @property {string} message - Message
 * @property {string|null} actionText - Texte de l'action
 * @property {Function} onAction - Callback de l'action
 * @property {number} duration - Durée d'affichage
 * @property {string} platform - Plateforme
 * @property {number} padding - Padding interne
 * @property {number} minWidth - Largeur minimale
 * @property {number} maxWidth - Largeur maximale
 * @property {number} targetY - Position Y cible
 * @property {number} opacity - Opacité
 * @property {boolean} isVisible - Visibilité
 * @property {Object|null} actionRect - Rectangle de l'action
 * @property {boolean} actionHovered - Action survolée
 */
class Snackbar extends Component {
  /**
   * Crée une instance de Snackbar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.message=''] - Message
   * @param {string} [options.actionText] - Texte de l'action
   * @param {Function} [options.onAction] - Callback de l'action
   * @param {number} [options.duration=4000] - Durée en ms
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.message = options.message || '';
    this.actionText = options.actionText || null;
    this.onAction = options.onAction;
    this.duration = options.duration || 4000;
    this.platform = framework.platform;
    
    // Dimensions
    this.height = 48;
    this.padding = 16;
    this.minWidth = 344;
    this.maxWidth = Math.min(672, framework.width - 32);
    
    // Calculer la largeur
    const ctx = framework.ctx;
    ctx.font = '14px -apple-system, Roboto, sans-serif';
    const messageWidth = ctx.measureText(this.message).width;
    const actionWidth = this.actionText ? ctx.measureText(this.actionText).width + 40 : 0;
    this.width = Math.min(this.maxWidth, Math.max(this.minWidth, messageWidth + actionWidth + this.padding * 3));
    
    // Position (centré en bas)
    this.x = (framework.width - this.width) / 2;
    this.y = framework.height; // Commence hors écran
    this.targetY = framework.height - this.height - 37;
    
    this.opacity = 0;
    this.isVisible = false;
    
    // Zone du bouton d'action
    this.actionRect = null;
    
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Affiche la snackbar
   */
  show() {
    this.isVisible = true;
    this.visible = true;
    this.animateIn();
    
    // Auto-hide après duration
    setTimeout(() => {
      if (this.isVisible) {
        this.hide();
      }
    }, this.duration);
  }
  
  /**
   * Cache la snackbar
   */
  hide() {
    this.animateOut();
  }
  
  /**
   * Anime l'entrée
   * @private
   */
  animateIn() {
    const animate = () => {
      if (this.y > this.targetY) {
        this.y -= (this.y - this.targetY) * 0.2;
        this.opacity = Math.min(1, this.opacity + 0.1);
        requestAnimationFrame(animate);
      } else {
        this.y = this.targetY;
        this.opacity = 1;
      }
    };
    animate();
  }
  
  /**
   * Anime la sortie
   * @private
   */
  animateOut() {
    const animate = () => {
      if (this.opacity > 0) {
        this.y += 5;
        this.opacity -= 0.1;
        requestAnimationFrame(animate);
      } else {
        this.isVisible = false;
        this.visible = false;
        this.framework.remove(this);
      }
    };
    animate();
  }
  
  /**
   * Dessine la snackbar
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.isVisible || this.opacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Background
    ctx.fillStyle = this.platform === 'material' ? '#323232' : 'rgba(0, 0, 0, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 4);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Message
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px -apple-system, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.message, this.x + this.padding, this.y + this.height / 2);
    
    // Bouton d'action
    if (this.actionText) {
      const ctx2 = this.framework.ctx;
      ctx2.font = '14px -apple-system, Roboto, sans-serif';
      const actionWidth = ctx2.measureText(this.actionText).width;
      const actionX = this.x + this.width - actionWidth - this.padding * 2;
      const actionY = this.y;
      
      this.actionRect = {
        x: actionX,
        y: actionY,
        width: actionWidth + this.padding * 2,
        height: this.height
      };
      
      // Highlight si hover
      if (this.actionHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(actionX, actionY, actionWidth + this.padding * 2, this.height);
      }
      
      // Texte du bouton
      const actionColor = this.platform === 'material' ? '#BB86FC' : '#0A84FF';
      ctx.fillStyle = actionColor;
      ctx.font = 'bold 14px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.actionText, actionX + (actionWidth + this.padding * 2) / 2, this.y + this.height / 2);
    }
    
    ctx.restore();
  }
  
  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    if (this.actionRect && this.actionText) {
      if (x >= this.actionRect.x && 
          x <= this.actionRect.x + this.actionRect.width &&
          y >= this.actionRect.y && 
          y <= this.actionRect.y + this.actionRect.height) {
        if (this.onAction) {
          this.onAction();
        }
        this.hide();
      }
    }
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
   * @returns {boolean} True si le point est dans la snackbar
   */
  isPointInside(x, y) {
    return this.isVisible && 
           x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }
}

export default Snackbar;