import Component from '../core/Component.js';
/**
 * Interrupteur (toggle)
 * @class
 * @extends Component
 * @property {boolean} checked - État activé
 * @property {string} platform - Plateforme
 * @property {number} animProgress - Progression de l'animation
 * @property {boolean} isAnimating - En cours d'animation
 * @property {Function} onChange - Callback au changement
 */
class Switch extends Component {
  /**
   * Crée une instance de Switch
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {boolean} [options.checked=false] - État initial
   * @param {Function} [options.onChange] - Callback au changement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.checked = options.checked || false;
    this.platform = framework.platform;
    this.width = 51;
    this.height = 31;
    this.onChange = options.onChange;
    this.animProgress = this.checked ? 1 : 0;
    this.isAnimating = false;
    
    // S'assurer que le Switch est cliquable
    this.onClick = this.handleClick.bind(this);
  }

  /**
   * Gère le clic sur le switch
   * @private
   */
  handleClick() {
    console.log('Switch clicked!');
    this.checked = !this.checked;
    if (this.onChange) this.onChange(this.checked);
    this.animate();
  }

  /**
   * Anime le toggle
   * @private
   */
  animate() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const target = this.checked ? 1 : 0;
    const step = 0.1;
    const interval = setInterval(() => {
      if (Math.abs(this.animProgress - target) < step) {
        this.animProgress = target;
        clearInterval(interval);
        this.isAnimating = false;
      } else {
        this.animProgress += this.animProgress < target ? step : -step;
      }
    }, 16);
  }

  /**
   * Dessine le switch
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Déplacer le contexte avec le scroll
    const adjustedY = this.y;
    
    if (this.platform === 'material') {
      // Material Design Switch
      const trackColor = this.checked ? 'rgba(98, 0, 238, 0.5)' : 'rgba(0, 0, 0, 0.38)';
      const thumbColor = this.checked ? '#6200EE' : '#FAFAFA';

      // Track
      ctx.fillStyle = trackColor;
      ctx.beginPath();
      ctx.arc(this.x + 15.5, adjustedY + 15.5, 7, Math.PI / 2, Math.PI * 1.5);
      ctx.arc(this.x + 35.5, adjustedY + 15.5, 7, Math.PI * 1.5, Math.PI / 2);
      ctx.closePath();
      ctx.fill();

      // Thumb
      const thumbX = this.x + 15.5 + (this.animProgress * 20);
      ctx.fillStyle = thumbColor;
      ctx.beginPath();
      ctx.arc(thumbX, adjustedY + 15.5, 10, 0, Math.PI * 2);
      ctx.fill();

      // Shadow for unchecked state
      if (!this.checked) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else {
      // Cupertino (iOS) Switch
      const bgColor = this.checked ? '#34C759' : '#E9E9EA';

      // Track
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(this.x + 15.5, adjustedY + 15.5, 15.5, Math.PI / 2, Math.PI * 1.5);
      ctx.arc(this.x + 35.5, adjustedY + 15.5, 15.5, Math.PI * 1.5, Math.PI / 2);
      ctx.closePath();
      ctx.fill();

      // Thumb with shadow
      const thumbX = this.x + 15.5 + (this.animProgress * 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(thumbX, adjustedY + 15.5, 13.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le switch
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
}

export default Switch;