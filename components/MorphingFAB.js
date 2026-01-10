import FAB from './FAB.js';

/**
 * Morphing FAB - FAB qui se transforme en barre d'actions
 * @class
 * @extends FAB
 * @property {boolean} isMorphed - État transformé
 * @property {Array} actions - Actions disponibles dans la barre
 * @property {number} morphProgress - Progression de l'animation (0-1)
 * @property {number} targetWidth - Largeur cible en mode morphé
 */
class MorphingFAB extends FAB {
  /**
   * Crée une instance de MorphingFAB
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.actions=[]] - Actions de la barre
   * @param {string} [options.morphType='toolbar'] - Type: 'toolbar', 'searchbar'
   * @example
   * // Toolbar
   * actions: [
   *   { icon: '🏠', label: 'Home', action: () => {...} },
   *   { icon: '⭐', label: 'Favorites', action: () => {...} },
   *   { icon: '⚙', label: 'Settings', action: () => {...} }
   * ]
   * 
   * // Searchbar
   * morphType: 'searchbar'
   */
  constructor(framework, options = {}) {
    super(framework, {
      ...options,
      icon: options.icon || '+'
    });
    
    this.actions = options.actions || [];
    this.morphType = options.morphType || 'toolbar';
    this.isMorphed = false;
    this.morphProgress = 0;
    
    // Dimensions
    this.originalWidth = this.width;
    this.originalHeight = this.height;
    this.originalX = this.x;
    this.originalY = this.y;
    
    // Calculer la largeur cible selon le type
    if (this.morphType === 'searchbar') {
      this.targetWidth = Math.min(framework.width - 32, 400);
      this.targetHeight = 56;
      this.targetX = (framework.width - this.targetWidth) / 2;
      this.targetY = 16;
    } else {
      // toolbar
      this.targetWidth = Math.min(framework.width - 32, this.actions.length * 80 + 32);
      this.targetHeight = 56;
      this.targetX = (framework.width - this.targetWidth) / 2;
      this.targetY = framework.height - 80;
    }
    
    // État des boutons d'actions
    this.actionButtons = this.actions.map((action, index) => ({
      ...action,
      x: 0,
      y: 0,
      width: 60,
      height: 48,
      alpha: 0,
      pressed: false
    }));
    
    // État de la searchbar
    this.searchText = '';
    this.searchFocused = false;
    
    // Input caché pour la searchbar
    if (this.morphType === 'searchbar') {
      this.setupHiddenInput();
    }
    
    // Bind
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Configure l'input HTML caché pour la searchbar
   * @private
   */
  setupHiddenInput() {
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.style.position = 'fixed';
    this.hiddenInput.style.opacity = '0';
    this.hiddenInput.style.pointerEvents = 'none';
    this.hiddenInput.style.top = '-100px';
    document.body.appendChild(this.hiddenInput);
    
    this.hiddenInput.addEventListener('input', (e) => {
      if (this.searchFocused) {
        this.searchText = e.target.value;
      }
    });
    
    this.hiddenInput.addEventListener('blur', () => {
      this.searchFocused = false;
    });
  }
  
  /**
   * Gère la pression
   */
  handlePress(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    
    if (this.isMorphed) {
      // Mode morphé
      if (this.morphType === 'searchbar') {
        // Zone de l'input searchbar
        const searchInputX = this.x + 48;
        const searchInputWidth = this.width - 96;
        
        if (x >= searchInputX && x <= searchInputX + searchInputWidth &&
            adjustedY >= this.y && adjustedY <= this.y + this.height) {
          // Clic sur l'input - activer le focus
          this.searchFocused = true;
          if (this.hiddenInput) {
            this.hiddenInput.value = this.searchText;
            this.hiddenInput.style.top = `${this.y}px`;
            this.hiddenInput.focus();
          }
          return;
        }
        
        // Bouton fermer (X)
        const closeX = this.x + this.width - 40;
        if (x >= closeX && x <= closeX + 40 &&
            adjustedY >= this.y && adjustedY <= this.y + this.height) {
          this.searchText = '';
          this.toggle();
          return;
        }
      } else {
        // Toolbar - vérifier les actions
        for (let btn of this.actionButtons) {
          if (x >= btn.x && x <= btn.x + btn.width &&
              adjustedY >= btn.y && adjustedY <= btn.y + btn.height) {
            btn.pressed = true;
            setTimeout(() => {
              btn.pressed = false;
              if (btn.action) btn.action();
            }, 150);
            return;
          }
        }
      }
      
      // Clic en dehors -> fermer
      if (!this.isPointInside(x, y)) {
        this.toggle();
      }
    } else {
      // Mode normal - ouvrir
      this.toggle();
      super.handlePress(x, y);
    }
  }
  
  /**
   * Toggle entre FAB et barre
   */
  toggle() {
    this.isMorphed = !this.isMorphed;
    
    // Si on ferme et que c'est une searchbar, nettoyer l'input
    if (!this.isMorphed && this.morphType === 'searchbar') {
      this.searchText = '';
      this.searchFocused = false;
      if (this.hiddenInput) {
        this.hiddenInput.blur();
        this.hiddenInput.remove();
        this.hiddenInput = null;
      }
    }
    
    // Si on ouvre une searchbar, recréer l'input
    if (this.isMorphed && this.morphType === 'searchbar' && !this.hiddenInput) {
      this.setupHiddenInput();
    }
    
    this.animate();
  }
  
  /**
   * Anime la transformation
   * @private
   */
  animate() {
    const startTime = Date.now();
    const duration = 400;
    
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.morphProgress = this.isMorphed ? eased : 1 - eased;
      
      // Interpoler les dimensions
      this.width = this.lerp(this.originalWidth, this.targetWidth, this.morphProgress);
      this.height = this.lerp(this.originalHeight, this.targetHeight, this.morphProgress);
      this.x = this.lerp(this.originalX, this.targetX, this.morphProgress);
      this.y = this.lerp(this.originalY, this.targetY, this.morphProgress);
      
      // Mettre à jour les positions des actions
      if (this.morphType === 'toolbar') {
        this.updateActionPositions();
      }
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    step();
  }
  
  /**
   * Met à jour les positions des boutons d'action
   * @private
   */
  updateActionPositions() {
    const spacing = this.targetWidth / (this.actionButtons.length + 1);
    
    this.actionButtons.forEach((btn, index) => {
      btn.x = this.x + spacing * (index + 1) - btn.width / 2;
      btn.y = this.y + (this.height - btn.height) / 2;
      btn.alpha = this.morphProgress;
    });
  }
  
  /**
   * Interpolation linéaire
   * @private
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  }
  
  /**
   * Dessine le Morphing FAB
   */
  draw(ctx) {
    ctx.save();
    
    if (this.isMorphed || this.morphProgress > 0) {
      this.drawMorphed(ctx);
    } else {
      super.draw(ctx);
    }
    
    ctx.restore();
  }
  
  /**
   * Dessine l'état morphé
   * @private
   */
  drawMorphed(ctx) {
    // Ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    
    // Background de la barre
    ctx.fillStyle = this.bgColor;
    ctx.beginPath();
    const radius = this.lerp(this.borderRadius, 28, this.morphProgress);
    this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    if (this.morphType === 'searchbar') {
      this.drawSearchBar(ctx);
    } else {
      this.drawToolbar(ctx);
    }
  }
  
  /**
   * Dessine la toolbar
   * @private
   */
  drawToolbar(ctx) {
    // Dessiner les actions
    for (let btn of this.actionButtons) {
      if (btn.alpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = btn.alpha;
        
        // Highlight si pressed
        if (btn.pressed) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(btn.x + btn.width / 2, btn.y + btn.height / 2, 24, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Icône
        ctx.fillStyle = this.iconColor;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.icon, btn.x + btn.width / 2, btn.y + btn.height / 2 - 8);
        
        // Label
        if (btn.label) {
          ctx.font = '11px -apple-system, sans-serif';
          ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 12);
        }
        
        ctx.restore();
      }
    }
  }
  
  /**
   * Dessine la search bar
   * @private
   */
  drawSearchBar(ctx) {
    ctx.save();
    ctx.globalAlpha = this.morphProgress;
    
    // Icône de recherche
    ctx.fillStyle = this.iconColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔍', this.x + 16, this.y + this.height / 2);
    
    // Curseur clignotant si focus
    let showCursor = false;
    if (this.searchFocused) {
      showCursor = Math.floor(Date.now() / 500) % 2 === 0;
    }
    
    // Placeholder ou texte
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = this.searchText ? this.iconColor : 'rgba(255, 255, 255, 0.6)';
    const displayText = this.searchText || 'Search...';
    ctx.fillText(displayText, this.x + 48, this.y + this.height / 2);
    
    // Curseur
    if (showCursor && this.searchText) {
      const textWidth = ctx.measureText(this.searchText).width;
      ctx.fillStyle = this.iconColor;
      ctx.fillRect(this.x + 48 + textWidth + 2, this.y + this.height / 2 - 10, 2, 20);
    }
    
    // Bouton fermer
    if (this.searchText || this.isMorphed) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('✕', this.x + this.width - 16, this.y + this.height / 2);
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
   * Vérifie si un point est dans le composant
   */
  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    return x >= this.x && x <= this.x + this.width &&
           adjustedY >= this.y && adjustedY <= this.y + this.height;
  }
  
  /**
   * Gère l'input texte (pour searchbar)
   * @param {string} char - Caractère à ajouter
   */
  addChar(char) {
    if (this.morphType === 'searchbar' && this.isMorphed) {
      this.searchText += char;
    }
  }
  
  /**
   * Efface un caractère
   */
  backspace() {
    if (this.morphType === 'searchbar' && this.isMorphed) {
      this.searchText = this.searchText.slice(0, -1);
    }
  }
  
  /**
   * Réinitialise la recherche
   */
  clearSearch() {
    this.searchText = '';
  }
}

export default MorphingFAB;
