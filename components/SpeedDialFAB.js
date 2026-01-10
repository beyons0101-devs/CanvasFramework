import FAB from './FAB.js';

/**
 * Speed Dial FAB - FAB qui ouvre un menu d'actions
 * @class
 * @extends FAB
 * @property {Array} actions - Liste des actions du menu
 * @property {boolean} isOpen - État ouvert/fermé
 * @property {number} animProgress - Progression de l'animation (0-1)
 */
class SpeedDialFAB extends FAB {
  /**
   * Crée une instance de SpeedDialFAB
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.actions=[]] - Actions du menu
   * @example
   * actions: [
   *   { icon: '✉', label: 'Email', bgColor: '#4CAF50', action: () => {...} },
   *   { icon: '📞', label: 'Call', bgColor: '#2196F3', action: () => {...} },
   *   { icon: '📍', label: Map', bgColor: '#FF9800', action: () => {...} }
   * ]
   */
  constructor(framework, options = {}) {
    super(framework, {
      ...options,
      icon: options.icon || '+'
    });
    
    this.actions = options.actions || [];
    this.isOpen = false;
    this.animProgress = 0;
    this.actionSpacing = 72; // Espacement entre les mini FABs
    
    // AJOUT: Flags pour gérer l'interaction
    this.justClicked = false; // Pour éviter la fermeture immédiate
    this.clickStartTime = 0;
    this.clickStartY = 0;
    this.isScrolling = false;
    this.scrollThreshold = 5; // Seuil de mouvement pour détecter un scroll
    
    // Initialiser les mini FABs
    this.miniFabs = this.actions.map((action, index) => ({
      ...action,
      size: 48,
      x: this.x,
      y: this.y,
      targetY: this.y - (index + 1) * this.actionSpacing,
      currentY: this.y,
      alpha: 0,
      pressed: false
    }));
    
    // Overlay pour fermer le menu
    this.showOverlay = false;
    
    // Bind methods
    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
  }
  
  /**
   * Gère le début de la pression
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handlePress(x, y) {
    this.justClicked = true;
    this.clickStartTime = Date.now();
    this.clickStartY = y;
    this.isScrolling = false;
    
    const adjustedY = y - this.framework.scrollOffset;
    
    // 1. Vérifier si c'est le FAB principal
    const isMainFabClick = x >= this.x && x <= this.x + this.width &&
                           adjustedY >= this.y && adjustedY <= this.y + this.height;
    
    if (isMainFabClick) {
      // Le FAB principal peut toujours être cliqué (ouvrir/fermer)
      this.toggle();
      super.handlePress(x, y);
      
      // Empêcher la fermeture immédiate
      setTimeout(() => {
        this.justClicked = false;
      }, 300);
      return;
    }
    
    // 2. Si le menu est ouvert, vérifier les mini FABs
    if (this.isOpen) {
      for (let i = 0; i < this.miniFabs.length; i++) {
        const fab = this.miniFabs[i];
        if (fab.alpha < 0.5) continue; // Ignorer les FABs pas encore visibles
        
        const fabX = this.x + (this.width - fab.size) / 2;
        const fabY = fab.currentY;
        
        const distance = Math.sqrt(
          Math.pow(x - (fabX + fab.size / 2), 2) +
          Math.pow(adjustedY - (fabY + fab.size / 2), 2)
        );
        
        if (distance <= fab.size / 2) {
          // Action cliquée
          fab.pressed = true;
          setTimeout(() => {
            fab.pressed = false;
            if (fab.action) fab.action();
            this.close();
          }, 150);
          
          // Empêcher la fermeture par handleClickOutside
          this.justClicked = true;
          setTimeout(() => {
            this.justClicked = false;
          }, 300);
          return;
        }
      }
      
      // 3. Clic sur overlay (n'importe où ailleurs)
      // Ne pas fermer immédiatement, attendre la fin du mouvement
    }
    
    // Pas de return ici, la fermeture sera gérée par handleClickOutside
    // avec vérification du mouvement
  }
  
  /**
   * Gère le mouvement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleMove(x, y) {
    // Détecter si c'est un scroll
    const deltaY = Math.abs(y - this.clickStartY);
    if (deltaY > this.scrollThreshold) {
      this.isScrolling = true;
    }
  }
  
  /**
   * Ouvre le menu
   */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.showOverlay = true;
    this.animate();
  }
  
  /**
   * Ferme le menu
   */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.animate();
  }
  
  /**
   * Toggle l'état ouvert/fermé
   */
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  
  /**
   * Anime l'ouverture/fermeture
   * @private
   */
  animate() {
    const startTime = Date.now();
    const duration = 300;
    
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.animProgress = this.isOpen ? eased : 1 - eased;
      
      // Mettre à jour les positions des mini FABs
      this.miniFabs.forEach((fab, index) => {
        const delay = index * 0.05;
        const fabProgress = Math.max(0, Math.min(1, (this.animProgress - delay) / (1 - delay)));
        
        fab.currentY = this.y - (fabProgress * (index + 1) * this.actionSpacing);
        fab.alpha = fabProgress;
      });
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (!this.isOpen) {
          this.showOverlay = false;
        }
      }
    };
    
    step();
  }
  
  /**
   * Dessine le Speed Dial FAB
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    // Overlay semi-transparent avec gestion du clic
    if (this.showOverlay) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${this.animProgress * 0.5})`;
      ctx.fillRect(0, 0, this.framework.width, this.framework.height);
      ctx.restore();
      
      // Dessiner une zone invisible pour détecter les clics sur l'overlay
      // On enregistre cette zone pour la détection
      this.overlayActive = true;
    } else {
      this.overlayActive = false;
    }
    
    // Dessiner les mini FABs (de bas en haut)
    if (this.animProgress > 0) {
      for (let i = this.miniFabs.length - 1; i >= 0; i--) {
        const fab = this.miniFabs[i];
        if (fab.alpha > 0.01) {
          this.drawMiniFab(ctx, fab);
        }
      }
    }
    
    // FAB principal
    ctx.save();
    
    // Rotation de l'icône + quand ouvert
    if (this.icon === '+') {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate((this.animProgress * 45) * Math.PI / 180);
      ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
    }
    
    super.draw(ctx);
    
    if (this.icon === '+') {
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  /**
   * Dessine un mini FAB
   * @private
   */
  drawMiniFab(ctx, fab) {
    ctx.save();
    ctx.globalAlpha = fab.alpha;
    
    const fabX = this.x + (this.width - fab.size) / 2;
    const fabY = fab.currentY;
    
    // Ombre
    if (!fab.pressed) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
    }
    
    // Background
    const bgColor = fab.bgColor || this.bgColor;
    ctx.fillStyle = fab.pressed ? this.darkenColor(bgColor) : bgColor;
    ctx.beginPath();
    ctx.arc(fabX + fab.size / 2, fabY + fab.size / 2, fab.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Icône
    ctx.fillStyle = fab.iconColor || '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fab.icon, fabX + fab.size / 2, fabY + fab.size / 2);
    
    // Label à gauche
    if (fab.label && fab.alpha > 0.5) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      
      const labelPadding = 12;
      const labelHeight = 32;
      ctx.font = '14px -apple-system, sans-serif';
      const labelWidth = ctx.measureText(fab.label).width + labelPadding * 2;
      
      // Fond du label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.roundRect(
        ctx,
        fabX - labelWidth - 8,
        fabY + fab.size / 2 - labelHeight / 2,
        labelWidth,
        labelHeight,
        4
      );
      ctx.fill();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Texte du label
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.fillText(fab.label, fabX - 16, fabY + fab.size / 2);
    }
    
    ctx.restore();
  }
  
  /**
   * Dessine un rectangle arrondi
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
  }
  
  /**
   * Vérifie si un point est dans le Speed Dial
   */
  /**
 * Vérifie si un point est dans le Speed Dial
 */
isPointInside(x, y) {
  const adjustedY = y - this.framework.scrollOffset;
  
  // Vérifier le FAB principal
  if (x >= this.x && x <= this.x + this.width &&
      adjustedY >= this.y && adjustedY <= this.y + this.height) {
    return true;
  }
  
  // Si ouvert, vérifier les mini FABs
  if (this.isOpen) {
    for (let fab of this.miniFabs) {
      if (fab.alpha < 0.01) continue;
      
      const fabX = this.x + (this.width - fab.size) / 2;
      const fabY = fab.currentY;
      
      const distance = Math.sqrt(
        Math.pow(x - (fabX + fab.size / 2), 2) +
        Math.pow(adjustedY - (fabY + fab.size / 2), 2)
      );
      
      if (distance <= fab.size / 2) {
        return true;
      }
    }
    
    // LA CLÉ : Quand le menu est ouvert, TOUT L'ÉCRAN compte comme "inside"
    // Cela empêche le framework d'appeler handleClickOutside()
    return true;
  }
  
  return false;
}

/**
 * Gère le clic en dehors (appelé par le framework)
 */
handleClickOutside() {
  // Ne pas fermer automatiquement
  // La fermeture se fera par handleClick() seulement
  // si on a vraiment cliqué en dehors
}
  
  
}
export default SpeedDialFAB;
