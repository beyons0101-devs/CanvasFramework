import Component from '../core/Component.js';

/**
 * Composant Pull-to-Refresh complètement autonome
 * Intercepte les événements touch/mouse directement
 * @class
 * @extends Component
 */
class PullToRefresh extends Component {
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: -100,
      width: framework.width,
      height: 100
    });
    
    this.framework = framework;
    this.onRefresh = options.onRefresh;
    this.state = 'idle';
    this.pullDistance = 0;
    this.refreshThreshold = options.refreshThreshold || 80;
    this.isRefreshing = false;
    
    // ✅ Propres gestionnaires d'événements
    this.myIsDragging = false;
    this.startY = 0;
    this.currentY = 0;
    this.canPull = false; // Seulement si on commence en haut
    
    // ✅ Installer nos propres écouteurs d'événements
    this.setupOwnEventListeners();
  }
  
  /**
   * Configure les écouteurs d'événements propres au composant
   */
  setupOwnEventListeners() {
    const canvas = this.framework.canvas;
    
    // Touch events
    this.handleTouchStartBound = this.handleOwnTouchStart.bind(this);
    this.handleTouchMoveBound = this.handleOwnTouchMove.bind(this);
    this.handleTouchEndBound = this.handleOwnTouchEnd.bind(this);
    
    canvas.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEndBound, { passive: false });
    
    // Mouse events (pour desktop)
    this.handleMouseDownBound = this.handleOwnMouseDown.bind(this);
    this.handleMouseMoveBound = this.handleOwnMouseMove.bind(this);
    this.handleMouseUpBound = this.handleOwnMouseUp.bind(this);
    
    canvas.addEventListener('mousedown', this.handleMouseDownBound);
    canvas.addEventListener('mousemove', this.handleMouseMoveBound);
    canvas.addEventListener('mouseup', this.handleMouseUpBound);
  }
  
  /**
   * Gère le début du touch
   */
  handleOwnTouchStart(e) {
    const scrollOffset = this.framework.scrollOffset || 0;
    
    // ✅ On peut pull SEULEMENT si on est en haut (scrollOffset === 0)
    if (Math.abs(scrollOffset) < 1) {
      this.canPull = true;
      const touch = e.touches[0];
      this.startY = touch.clientY;
      this.currentY = touch.clientY;
      this.myIsDragging = false;
    } else {
      this.canPull = false;
    }
  }
  
  /**
   * Gère le mouvement du touch
   */
  handleOwnTouchMove(e) {
    if (!this.canPull) return;
    
    const touch = e.touches[0];
    this.currentY = touch.clientY;
    const deltaY = this.currentY - this.startY;
    
    // ✅ Si on tire vers le bas (deltaY > 0)
    if (deltaY > 10) {
      this.myIsDragging = true;
      this.state = 'pulling';
      
      // ✅ Effet de résistance (plus on tire, plus c'est dur)
      this.pullDistance = Math.min(deltaY * 0.5, this.refreshThreshold * 1.5);
      
      // ✅ Empêcher le scroll du framework si on est en train de pull
      if (deltaY > 20) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
  
  /**
   * Gère la fin du touch
   */
  handleOwnTouchEnd(e) {
    if (!this.canPull) return;
    
    if (this.myIsDragging && this.state === 'pulling') {
      if (this.pullDistance >= this.refreshThreshold) {
        this.triggerRefresh();
      } else {
        this.reset();
      }
    }
    
    this.myIsDragging = false;
    this.canPull = false;
  }
  
  /**
   * Gère le début du clic souris
   */
  handleOwnMouseDown(e) {
    const scrollOffset = this.framework.scrollOffset || 0;
    
    if (Math.abs(scrollOffset) < 1) {
      this.canPull = true;
      this.startY = e.clientY;
      this.currentY = e.clientY;
      this.myIsDragging = false;
    } else {
      this.canPull = false;
    }
  }
  
  /**
   * Gère le mouvement de la souris
   */
  handleOwnMouseMove(e) {
    if (!this.canPull) return;
    
    this.currentY = e.clientY;
    const deltaY = this.currentY - this.startY;
    
    if (deltaY > 10) {
      this.myIsDragging = true;
      this.state = 'pulling';
      this.pullDistance = Math.min(deltaY * 0.5, this.refreshThreshold * 1.5);
      
      if (deltaY > 20) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
  
  /**
   * Gère le relâchement de la souris
   */
  handleOwnMouseUp(e) {
    if (!this.canPull) return;
    
    if (this.myIsDragging && this.state === 'pulling') {
      if (this.pullDistance >= this.refreshThreshold) {
        this.triggerRefresh();
      } else {
        this.reset();
      }
    }
    
    this.myIsDragging = false;
    this.canPull = false;
  }
  
  /**
   * Déclenche le rafraîchissement
   */
  async triggerRefresh() {
    if (this.isRefreshing) return;
    
    console.log('🔄 Refresh déclenché!');
    this.state = 'refreshing';
    this.isRefreshing = true;
    this.pullDistance = 60;
    
    if (this.onRefresh) {
      try {
        await this.onRefresh();
      } catch (error) {
        console.error('Erreur refresh:', error);
      }
    }
    
    setTimeout(() => {
      this.reset();
    }, 300);
  }
  
  /**
   * Réinitialise l'état
   */
  reset() {
    console.log('🔄 Reset PullToRefresh');
    
    // Animation de retour élastique
    const animate = () => {
      if (this.pullDistance > 0) {
        this.pullDistance *= 0.8;
        if (this.pullDistance < 1) {
          this.pullDistance = 0;
          this.state = 'idle';
          this.isRefreshing = false;
        }
        requestAnimationFrame(animate);
      } else {
        this.state = 'idle';
        this.isRefreshing = false;
      }
    };
    animate();
  }
  
  /**
   * Nettoie les écouteurs d'événements
   */
  destroy() {
    const canvas = this.framework.canvas;
    
    canvas.removeEventListener('touchstart', this.handleTouchStartBound);
    canvas.removeEventListener('touchmove', this.handleTouchMoveBound);
    canvas.removeEventListener('touchend', this.handleTouchEndBound);
    
    canvas.removeEventListener('mousedown', this.handleMouseDownBound);
    canvas.removeEventListener('mousemove', this.handleMouseMoveBound);
    canvas.removeEventListener('mouseup', this.handleMouseUpBound);
  }
  
  /**
   * Dessine le composant
   */
  draw(ctx) {
    // ✅ Ne rien dessiner si pullDistance <= 0
    if (this.pullDistance <= 0) return;
    
    ctx.save();
    
    const progress = Math.min(1, this.pullDistance / this.refreshThreshold);
    const displayHeight = Math.min(this.pullDistance, 100);
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(0, 0, this.width, displayHeight);
    
    // Séparateur
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, displayHeight);
    ctx.lineTo(this.width, displayHeight);
    ctx.stroke();
    
    const centerX = this.width / 2;
    const centerY = Math.min(displayHeight / 0.6, 90);
    const spinnerRadius = 16;
    
    if (this.state === 'refreshing' || this.isRefreshing) {
      // Spinner animé
      const rotation = (Date.now() / 1000) * Math.PI * 2;
      ctx.strokeStyle = '#6200EE';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY, spinnerRadius, rotation, rotation + Math.PI * 1.5);
      ctx.stroke();
      
      if (displayHeight > 35) {
        ctx.fillStyle = '#666666';
        ctx.font = '14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Actualisation...', centerX, centerY + 28);
      }
      
    } else if (this.state === 'pulling') {
      // Cercle de progression
      ctx.strokeStyle = progress >= 1 ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY, spinnerRadius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * progress));
      ctx.stroke();
      
      // Flèche
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(progress >= 1 ? Math.PI : 0);
      
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-5, -3);
      ctx.lineTo(5, -3);
      ctx.closePath();
      ctx.fillStyle = progress >= 1 ? '#6200EE' : '#999999';
      ctx.fill();
      
      ctx.restore();
      
      if (displayHeight > 35) {
        ctx.fillStyle = '#666666';
        ctx.font = '14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (progress >= 1) {
          ctx.fillText('Relâchez pour actualiser', centerX, centerY + 28);
        } else {
          ctx.fillText('Tirez pour actualiser', centerX, centerY + 28);
        }
      }
    }
    
    ctx.restore();
  }
}

export default PullToRefresh;