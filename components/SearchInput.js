import Input from './Input.js';

/**
 * Champ de saisie pour la recherche
 * @class
 * @extends Input
 * @property {Function} onSearch - Callback lors de la recherche
 * @property {Function} onClear - Callback lors de l'effacement
 * @property {boolean} showClearButton - Afficher le bouton d'effacement
 */
class SearchInput extends Input {
  /**
   * Crée une instance de SearchInput
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Function} [options.onSearch] - Callback lors de la recherche
   * @param {Function} [options.onClear] - Callback lors de l'effacement
   * @param {string} [options.searchIcon] - Icône de recherche
   */
  constructor(framework, options = {}) {
    super(framework, {
      placeholder: options.placeholder || 'Rechercher...',
      ...options
    });
    
    this.onSearch = options.onSearch;
    this.onClear = options.onClear;
    this.searchIcon = options.searchIcon || '🔍';
    this.clearIcon = '×';
    this.showClearButton = false;
    
    // Bind des méthodes supplémentaires
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleClearClick = this.handleClearClick.bind(this);
  }

  /**
   * Configure l'input HTML caché (surcharge)
   */
  setupHiddenInput() {
    if (this.hiddenInput) return;
    
    // Appeler la méthode parent
    super.setupHiddenInput();
    
    if (this.hiddenInput) {
      // Ajouter l'événement keydown pour la touche Entrée
      this.hiddenInput.addEventListener('keydown', this.handleKeyDown);
    }
  }

  /**
   * Gère la pression des touches
   * @param {KeyboardEvent} e - Événement clavier
   * @private
   */
  handleKeyDown(e) {
    if (e.key === 'Enter' && this.onSearch) {
      this.onSearch(this.value);
    }
  }

  /**
   * Gère le clic sur le bouton d'effacement
   * @private
   */
  handleClearClick() {
    const hadValue = this.value.length > 0;
    this.value = '';
    
    if (this.hiddenInput) {
      this.hiddenInput.value = '';
    }
    
    // Appeler les callbacks
    if (hadValue && this.onClear) {
      this.onClear();
    }
    
    // Mettre à jour l'affichage
    this.showClearButton = false;
    
    // Redonner le focus
    this.onFocus();
  }

  /**
   * Gère la saisie (surcharge)
   */
  onInputUpdate() {
    // Mettre à jour l'affichage du bouton d'effacement
    this.showClearButton = this.value.length > 0;
    
    // Appeler le callback de recherche au fur et à mesure (optionnel)
    if (this.value.length > 0 && this.onSearch) {
      // Délai pour éviter de déclencher à chaque frappe
      clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => {
        if (this.onSearch) {
          this.onSearch(this.value);
        }
      }, 300);
    }
  }

  /**
   * Gère le clic (surcharge)
   */
  onClick() {
    // Vérifier si on a cliqué sur le bouton d'effacement
    if (this.showClearButton && this.isPointInClearButton(this.lastClickX, this.lastClickY)) {
      this.handleClearClick();
      return;
    }
    
    // Sinon, focus normal
    super.onFocus();
  }

  /**
   * Gère le focus (surcharge)
   */
  onFocus() {
    super.onFocus();
    
    // Mettre à jour l'état du bouton d'effacement
    this.showClearButton = this.value.length > 0;
  }

  /**
   * Gère la pression (surcharge pour capturer les coordonnées)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  onPress(x, y) {
    // Stocker les coordonnées du dernier clic
    this.lastClickX = x;
    this.lastClickY = y;
    
    // Appeler la méthode parent
    super.onPress(x, y);
  }

  /**
   * Vérifie si un point est dans le bouton d'effacement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le bouton
   */
  isPointInClearButton(x, y) {
    if (!this.showClearButton) return false;
    
    // Position du bouton d'effacement (à droite)
    const clearButtonSize = this.height * 0.6;
    const clearButtonX = this.x + this.width - clearButtonSize - 10;
    const clearButtonY = this.y + (this.height - clearButtonSize) / 2;
    
    return x >= clearButtonX && 
           x <= clearButtonX + clearButtonSize && 
           y >= clearButtonY && 
           y <= clearButtonY + clearButtonSize;
  }

  /**
   * Dessine le champ de recherche (surcharge)
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Style selon la plateforme
    if (this.platform === 'material') {
      ctx.strokeStyle = this.focused ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = this.focused ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
    } else {
      // iOS style avec coins arrondis
      ctx.fillStyle = this.focused ? '#FFFFFF' : '#F2F2F7';
      ctx.strokeStyle = this.focused ? '#007AFF' : '#C7C7CC';
      ctx.lineWidth = 1;
      
      // Fond
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 10);
      ctx.fill();
      
      // Bordure
      ctx.stroke();
    }
    
    // Icône de recherche (à gauche)
    ctx.fillStyle = '#999999';
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.searchIcon, this.x + 25, this.y + this.height / 2);
    
    // Texte
    ctx.fillStyle = this.value ? '#000000' : '#999999';
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Calculer la largeur disponible pour le texte
    const leftPadding = 50; // Pour l'icône de recherche
    const rightPadding = this.showClearButton ? 50 : 20; // Pour le bouton d'effacement
    const maxTextWidth = this.width - leftPadding - rightPadding;
    
    const displayText = this.value || this.placeholder;
    
    // Tronquer le texte si nécessaire
    let textToShow = displayText;
    let textWidth = ctx.measureText(textToShow).width;
    
    if (textWidth > maxTextWidth) {
      // Ajouter "..." à la fin
      while (textWidth > maxTextWidth && textToShow.length > 0) {
        textToShow = textToShow.substring(0, textToShow.length - 1);
        textWidth = ctx.measureText(textToShow + '...').width;
      }
      if (textToShow.length > 0) {
        textToShow += '...';
      }
    }
    
    // Couleur différente pour le placeholder
    if (!this.value) {
      ctx.fillStyle = '#999999';
    }
    
    ctx.fillText(textToShow, this.x + leftPadding, this.y + this.height / 2);
    
    // Bouton d'effacement (si il y a du texte)
    if (this.showClearButton) {
      const clearButtonSize = this.height * 0.6;
      const clearButtonX = this.x + this.width - clearButtonSize - 15;
      const clearButtonY = this.y + (this.height - clearButtonSize) / 2;
      
      // Cercle de fond
      ctx.fillStyle = '#E0E0E0';
      ctx.beginPath();
      ctx.arc(
        clearButtonX + clearButtonSize / 2,
        clearButtonY + clearButtonSize / 2,
        clearButtonSize / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Croix
      ctx.fillStyle = '#666666';
      ctx.font = `bold ${clearButtonSize * 0.6}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.clearIcon,
        clearButtonX + clearButtonSize / 2,
        clearButtonY + clearButtonSize / 2
      );
    }
    
    // Curseur (si focus et a du texte)
    if (this.focused && this.cursorVisible && this.value) {
      const textWidth = ctx.measureText(this.value).width;
      const cursorX = this.x + leftPadding + Math.min(textWidth, maxTextWidth);
      ctx.fillStyle = '#000000';
      ctx.fillRect(cursorX, this.y + 10, 2, this.height - 20);
    }
    
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans les limites (surcharge)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans l'input
   */
  isPointInside(x, y) {
    // Vérifier l'input principal
    const inInput = x >= this.x && 
                    x <= this.x + this.width && 
                    y >= this.y && 
                    y <= this.y + this.height;
    
    // Vérifier aussi le bouton d'effacement
    const inClearButton = this.isPointInClearButton(x, y);
    
    return inInput || inClearButton;
  }

  /**
   * Nettoie les ressources (surcharge)
   */
  destroy() {
    // Nettoyer le timeout de recherche
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }
    
    // Retirer l'écouteur keydown
    if (this.hiddenInput) {
      this.hiddenInput.removeEventListener('keydown', this.handleKeyDown);
    }
    
    // Appeler la méthode parent
    super.destroy();
  }
}

export default SearchInput;