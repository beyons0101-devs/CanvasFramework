import Component from '../core/Component.js';
/**
 * Composant Skeleton (placeholder animé pendant le chargement)
 * @class
 * @extends Component
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {string} [options.type='text'] - Type de skeleton ('text', 'circle', 'rectangle')
 * @param {number} [options.animationSpeed=0.03] - Vitesse de l'animation
 * @example
 * const skeleton = new Skeleton(framework, {
 *   type: 'text',
 *   width: 200,
 *   height: 100
 * });
 */
class Skeleton extends Component {
  /**
   * @constructs Skeleton
   */
  constructor(framework, options = {}) {
    super(framework, options);
    /** @type {string} */
    this.type = options.type || 'text'; // text, circle, rectangle
    /** @type {number} */
    this.animationSpeed = options.animationSpeed || 0.03;
    /** @type {number} */
    this.animationProgress = 0;
    this.startAnimation();
  }
  
  /**
   * Démarre l'animation du skeleton
   * @private
   */
  startAnimation() {
    const animate = () => {
      if (!this.visible) return;
      
      this.animationProgress += this.animationSpeed;
      if (this.animationProgress > Math.PI * 2) {
        this.animationProgress = 0;
      }
      
      requestAnimationFrame(animate);
    };
    animate();
  }
  
  /**
   * Dessine le skeleton avec animation
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const brightness = 0.9 + 0.1 * Math.sin(this.animationProgress);
    ctx.fillStyle = `rgba(240, 240, 240, ${brightness})`;
    
    switch(this.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'text':
        // Simuler des lignes de texte
        const lineHeight = 20;
        const lines = Math.floor(this.height / lineHeight);
        
        for (let i = 0; i < lines; i++) {
          const lineWidth = i === lines - 1 ? this.width * 0.6 : this.width;
          ctx.fillRect(this.x, this.y + i * lineHeight, lineWidth, 16);
        }
        break;
      default:
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    ctx.restore();
  }
}

export default Skeleton;
