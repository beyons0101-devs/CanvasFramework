import Component from '../core/Component.js';

/**
 * Spinner de chargement circulaire avec support Material et Cupertino
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
   * @param {number} [options.lineWidth] - Épaisseur (auto selon platform)
   * @param {number} [options.animationSpeed] - Vitesse d'animation (auto selon platform)
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.size = options.size || 40;
    this.indeterminate = options.indeterminate !== false;
    this.progress = options.progress || 0; // 0-100
    this.platform = framework.platform;
    
    // Couleurs selon la plateforme
    this.color = options.color || (
      this.platform === 'material' ? '#6200EE' : '#8E8E93'
    );
    
    // Épaisseur selon la plateforme
    this.lineWidth = options.lineWidth || (
      this.platform === 'material' ? 4 : 2.5
    );
    
    // Vitesse d'animation selon la plateforme
    this.animationSpeed = options.animationSpeed || (
      this.platform === 'material' ? 0.05 : 0.08
    );
    
    this.rotation = 0;
    
    // Pour l'animation Material (arc qui s'agrandit/rétrécit)
    this.arcStart = 0;
    this.arcEnd = 0;
    this.arcGrowing = true;
    
    // Pour l'animation Cupertino (12 traits qui tournent)
    this.cupertinoLines = 12;
    this.cupertinoOpacity = Array(this.cupertinoLines).fill(0);
    
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
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      if (!this.visible || !this.indeterminate) return;
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      if (this.platform === 'material') {
        this.animateMaterial(deltaTime);
      } else {
        this.animateCupertino(deltaTime);
      }
      
      this.markDirty();
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Animation Material (arc qui tourne et change de taille)
   * @private
   */
  animateMaterial(deltaTime) {
    // Rotation globale
    this.rotation += this.animationSpeed;
    if (this.rotation > Math.PI * 2) {
      this.rotation -= Math.PI * 2;
    }
    
    // Animation de l'arc (grossit puis rétrécit)
    const arcSpeed = 0.03;
    
    if (this.arcGrowing) {
      this.arcEnd += arcSpeed;
      if (this.arcEnd > Math.PI * 1.5) {
        this.arcGrowing = false;
      }
    } else {
      this.arcStart += arcSpeed;
      if (this.arcStart >= this.arcEnd) {
        this.arcGrowing = true;
        this.arcStart = 0;
        this.arcEnd = 0;
      }
    }
  }
  
  /**
   * Animation Cupertino (traits qui s'estompent)
   * @private
   */
  animateCupertino(deltaTime) {
    this.rotation += this.animationSpeed;
    if (this.rotation > Math.PI * 2) {
      this.rotation -= Math.PI * 2;
    }
    
    // Calculer l'opacité de chaque trait (fade progressif)
    const activeIndex = Math.floor((this.rotation / (Math.PI * 2)) * this.cupertinoLines);
    
    for (let i = 0; i < this.cupertinoLines; i++) {
      const distance = Math.abs(i - activeIndex);
      const minDistance = Math.min(distance, this.cupertinoLines - distance);
      this.cupertinoOpacity[i] = 1 - (minDistance / this.cupertinoLines) * 0.8;
    }
  }
  
  /**
   * Dessine le spinner Material
   * @private
   */
  drawMaterial(ctx, centerX, centerY, radius) {
    if (this.indeterminate) {
      // Track (cercle de base - très léger)
      ctx.strokeStyle = 'rgba(98, 0, 238, 0.1)';
      ctx.lineWidth = this.lineWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Arc animé qui tourne
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(this.rotation);
      
      ctx.strokeStyle = this.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = this.lineWidth;
      ctx.beginPath();
      ctx.arc(0, 0, radius, this.arcStart, this.arcEnd);
      ctx.stroke();
      
      ctx.restore();
    } else {
      // Progress circulaire déterminé
      // Track
      ctx.strokeStyle = '#E0E0E0';
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
      
      // Pourcentage au centre
      if (this.progress > 0) {
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size / 3}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(this.progress)}%`, centerX, centerY);
      }
    }
  }
  
  /**
   * Dessine le spinner Cupertino (style iOS)
   * @private
   */
  drawCupertino(ctx, centerX, centerY, radius) {
    if (this.indeterminate) {
      // Spinner iOS avec 12 traits
      ctx.lineCap = 'round';
      ctx.lineWidth = this.lineWidth;
      
      for (let i = 0; i < this.cupertinoLines; i++) {
        const angle = (i / this.cupertinoLines) * Math.PI * 2;
        const opacity = this.cupertinoOpacity[i];
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        
        // Trait avec opacité variable
        const startRadius = radius * 0.6;
        const endRadius = radius;
        
        ctx.strokeStyle = this.hexToRgba(this.color, opacity);
        ctx.beginPath();
        ctx.moveTo(0, -startRadius);
        ctx.lineTo(0, -endRadius);
        ctx.stroke();
        
        ctx.restore();
      }
    } else {
      // Progress circulaire iOS (plus fin et élégant)
      // Track
      ctx.strokeStyle = '#E5E5EA';
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
      
      // Pas de texte au centre pour iOS (plus minimaliste)
      // Mais si tu veux, décommente :
      /*
      if (this.progress > 0) {
        ctx.fillStyle = this.color;
        ctx.font = `${this.size / 4}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(this.progress)}%`, centerX, centerY);
      }
      */
    }
  }
  
  /**
   * Dessine le spinner
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;
    const radius = (this.size - this.lineWidth * 2) / 2;
    
    if (this.platform === 'material') {
      this.drawMaterial(ctx, centerX, centerY, radius);
    } else {
      this.drawCupertino(ctx, centerX, centerY, radius);
    }
    
    ctx.restore();
  }
  
  /**
   * Convertit une couleur hex en rgba avec opacité
   * @private
   */
  hexToRgba(hex, alpha) {
    // Si c'est déjà rgba, le retourner
    if (hex.startsWith('rgba')) return hex;
    if (hex.startsWith('rgb')) {
      return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    
    // Convertir hex en rgba
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  /**
   * Définit la progression
   * @param {number} value - Valeur de progression (0-100)
   */
  setProgress(value) {
    this.progress = Math.max(0, Math.min(100, value));
    this.indeterminate = false;
    this.markDirty();
  }
  
  /**
   * Active le mode indéterminé
   */
  setIndeterminate() {
    this.indeterminate = true;
    if (!this._animating) {
      this.startAnimation();
    }
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
