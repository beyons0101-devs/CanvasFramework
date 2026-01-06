import Component from '../core/Component.js';
/**
 * Spinner de chargement circulaire
 * @class
 * @extends Component
 * @property {number} size - Taille du spinner
 * @property {boolean} indeterminate - Mode indéterminé
 * @property {number} progress - Progression (0-100)
 * @property {string} platform - Plateforme
 * @property {string} color - Couleur
 * @property {number} lineWidth - Épaisseur de la ligne
 * @property {number} rotation - Rotation actuelle
 * @property {number} animationSpeed - Vitesse d'animation
 */
class CircularProgress extends Component {
  /**
   * Crée une instance de CircularProgress
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.size=40] - Taille
   * @param {boolean} [options.indeterminate=true] - Mode indéterminé
   * @param {number} [options.progress=0] - Progression (0-100)
   * @param {string} [options.color] - Couleur (auto selon platform)
   * @param {number} [options.lineWidth=4] - Épaisseur
   * @param {number} [options.animationSpeed=0.05] - Vitesse d'animation
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.size = options.size || 40;
    this.indeterminate = options.indeterminate !== false;
    this.progress = options.progress || 0; // 0-100
    this.platform = framework.platform;
    this.color = options.color || (framework.platform === 'material' ? '#6200EE' : '#007AFF');
    this.lineWidth = options.lineWidth || 4;
    this.rotation = 0;
    this.animationSpeed = options.animationSpeed || 0.05;
    
    this.width = this.size;
    this.height = this.size;
    
    // Démarrer l'animation pour indeterminate
    if (this.indeterminate) {
      this.startAnimation();
    }
  }
  
  /**
   * Démarre l'animation du spinner
   * @private
   */
  startAnimation() {
    const animate = () => {
      if (!this.visible || !this.indeterminate) return;
      
      this.rotation += this.animationSpeed;
      if (this.rotation > Math.PI * 2) {
        this.rotation = 0;
      }
      
      requestAnimationFrame(animate);
    };
    animate();
  }
  
  /**
   * Dessine le spinner
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;
    const radius = (this.size - this.lineWidth) / 2;
    
    if (this.indeterminate) {
      // Spinner qui tourne
      ctx.translate(centerX, centerY);
      ctx.rotate(this.rotation);
      ctx.translate(-centerX, -centerY);
      
      // Cercle de base (track)
      ctx.strokeStyle = this.platform === 'material' ? '#E0E0E0' : '#E5E5EA';
      ctx.lineWidth = this.lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Arc animé
      ctx.strokeStyle = this.color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 1.5);
      ctx.stroke();
      
    } else {
      // Progress circulaire déterminé
      // Track
      ctx.strokeStyle = this.platform === 'material' ? '#E0E0E0' : '#E5E5EA';
      ctx.lineWidth = this.lineWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Progress
      const angle = (this.progress / 100) * Math.PI * 2;
      ctx.strokeStyle = this.color;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
      ctx.stroke();
      
      // Pourcentage au centre (optionnel)
      if (this.progress > 0) {
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size / 3}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(this.progress)}%`, centerX, centerY);
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Définit la progression
   * @param {number} value - Valeur de progression (0-100)
   */
  setProgress(value) {
    this.progress = Math.max(0, Math.min(100, value));
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @returns {boolean} False (non cliquable)
   */
  isPointInside() {
    return false; // Non cliquable
  }
}

export default CircularProgress;