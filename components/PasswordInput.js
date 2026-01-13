import Component from '../core/Component.js';

/**
 * Champ de saisie de mot de passe avec masquage
 * @class
 * @extends Component
 * @property {string} placeholder - Texte d'indication
 * @property {string} value - Valeur réelle
 * @property {string} displayedValue - Valeur affichée (avec *)
 * @property {number} fontSize - Taille de police
 * @property {boolean} focused - Focus actif
 * @property {string} platform - Plateforme
 * @property {boolean} cursorVisible - Curseur visible
 * @property {number} cursorPosition - Position du curseur
 * @property {HTMLInputElement} hiddenInput - Input HTML caché
 * @property {boolean} showPassword - Afficher le mot de passe en clair
 * @property {string} maskChar - Caractère de masquage
 */
class PasswordInput extends Component {
  static activeInput = null;
  static allInputs = new Set();
  static globalClickHandler = null;
  
  /**
   * Crée une instance de PasswordInput
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.placeholder=''] - Texte d'indication
   * @param {string} [options.value=''] - Valeur initiale
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {Function} [options.onFocus] - Callback au focus
   * @param {Function} [options.onBlur] - Callback au blur
   * @param {string} [options.maskChar='*'] - Caractère de masquage
   * @param {boolean} [options.showPassword=false] - Afficher le mot de passe initialement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.placeholder = options.placeholder || 'Mot de passe';
    this.value = options.value || '';
    this.maskChar = options.maskChar || '•';
    this.showPassword = options.showPassword || false;
    this.fontSize = options.fontSize || 16;
    this.focused = false;
    this.platform = framework.platform;
    this.cursorVisible = true;
    this.cursorPosition = this.value.length;
    this.displayedValue = this.getDisplayedValue();
    
    // Bouton pour afficher/masquer le mot de passe
    this.toggleButtonSize = 24;
    this.toggleButtonPadding = 10;
    
    // Gestion du focus
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onTogglePassword = this.onTogglePassword.bind(this);
    
    // Enregistrer cet input
    PasswordInput.allInputs.add(this);
    
    // Animation du curseur
    this.cursorInterval = setInterval(() => {
      if (this.focused) this.cursorVisible = !this.cursorVisible;
    }, 500);
    
    // Écouter les clics partout pour détecter quand on clique ailleurs
    this.setupGlobalClickHandler();
  }

  /**
   * Obtient la valeur affichée
   * @returns {string} Valeur affichée
   */
  getDisplayedValue() {
    if (this.showPassword) {
      return this.value;
    }
    return this.maskChar.repeat(this.value.length);
  }

  /**
   * Bascule l'affichage du mot de passe
   */
  onTogglePassword() {
    this.showPassword = !this.showPassword;
    this.displayedValue = this.getDisplayedValue();
  }

  /**
   * Vérifie si un point est sur le bouton d'affichage
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est sur le bouton
   */
  isPointOnToggleButton(x, y) {
    const buttonX = this.x + this.width - this.toggleButtonSize - this.toggleButtonPadding;
    const buttonY = this.y + (this.height - this.toggleButtonSize) / 2;
    
    return x >= buttonX && 
           x <= buttonX + this.toggleButtonSize && 
           y >= buttonY && 
           y <= buttonY + this.toggleButtonSize;
  }

  /**
   * Écoute les clics globaux pour détecter les clics hors input
   */
  setupGlobalClickHandler() {
    if (!PasswordInput.globalClickHandler) {
      PasswordInput.globalClickHandler = (e) => {
        let clickedOnInput = false;
        
        for (let input of PasswordInput.allInputs) {
          if (input.hiddenInput && e.target === input.hiddenInput) {
            clickedOnInput = true;
            break;
          }
        }
        
        if (!clickedOnInput) {
          PasswordInput.removeAllHiddenInputs();
        }
      };
      
      document.addEventListener('click', PasswordInput.globalClickHandler, true);
      document.addEventListener('touchstart', PasswordInput.globalClickHandler, true);
    }
  }

  /**
   * Configure l'input HTML caché
   * @private
   */
  setupHiddenInput() {
    if (this.hiddenInput) return;
    
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.style.position = 'fixed';
    this.hiddenInput.type = this.showPassword ? 'text' : 'password';
    this.hiddenInput.style.opacity = '0';
    this.hiddenInput.style.pointerEvents = 'none';
    this.hiddenInput.style.top = '-100px';
    this.hiddenInput.style.zIndex = '9999';
    document.body.appendChild(this.hiddenInput);
    
    this.hiddenInput.addEventListener('input', (e) => {
      if (this.focused) {
        this.value = e.target.value;
        this.cursorPosition = this.value.length;
        this.displayedValue = this.getDisplayedValue();
      }
    });
    
    this.hiddenInput.addEventListener('blur', () => {
      this.focused = false;
      this.cursorVisible = false;
      
      setTimeout(() => {
        this.destroyHiddenInput();
      }, 100);
    });
  }

  /**
   * Gère le focus
   */
  onFocus() {
    if (PasswordInput.activeInput === this) {
      return;
    }
    
    PasswordInput.removeAllHiddenInputs();
    
    for (let input of PasswordInput.allInputs) {
      if (input !== this) {
        input.focused = false;
        input.cursorVisible = false;
      }
    }
    
    this.focused = true;
    this.cursorVisible = true;
    PasswordInput.activeInput = this;
    
    this.setupHiddenInput();
    
    if (this.hiddenInput) {
      this.hiddenInput.value = this.value;
      this.hiddenInput.type = this.showPassword ? 'text' : 'password';
      
      const adjustedY = this.y + this.framework.scrollOffset;
      this.hiddenInput.style.top = `${adjustedY}px`;
      
      setTimeout(() => {
        if (this.hiddenInput && this.focused) {
          this.hiddenInput.focus();
          this.hiddenInput.setSelectionRange(this.value.length, this.value.length);
        }
      }, 50);
    }
  }

  /**
   * Gère le blur
   */
  onBlur() {
    this.focused = false;
    this.cursorVisible = false;
  }

  /**
   * Détruit l'input HTML
   */
  destroyHiddenInput() {
    if (this.hiddenInput && this.hiddenInput.parentNode) {
      this.hiddenInput.parentNode.removeChild(this.hiddenInput);
      this.hiddenInput = null;
    }
  }

  /**
   * Gère le clic
   */
  onClick() {
    this.onFocus();
  }
  
  /**
   * Gère le clic sur le bouton d'affichage
   */
  onToggleButtonClick() {
    this.onTogglePassword();
    
    // Mettre à jour le type de l'input HTML si existant
    if (this.hiddenInput) {
      this.hiddenInput.type = this.showPassword ? 'text' : 'password';
      if (this.focused) {
        setTimeout(() => {
          if (this.hiddenInput) {
            this.hiddenInput.focus();
          }
        }, 10);
      }
    }
  }

  /**
   * Méthode statique pour détruire tous les inputs HTML
   */
  static removeAllHiddenInputs() {
    for (let input of PasswordInput.allInputs) {
      input.focused = false;
      input.cursorVisible = false;
      
      if (input.hiddenInput && input.hiddenInput.parentNode) {
        input.hiddenInput.parentNode.removeChild(input.hiddenInput);
        input.hiddenInput = null;
      }
    }
    
    PasswordInput.activeInput = null;
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans l'input
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }

  /**
   * Dessine l'input
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.platform === 'material') {
      ctx.strokeStyle = this.focused ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = this.focused ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
    } else {
      ctx.strokeStyle = this.focused ? '#007AFF' : '#C7C7CC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 8);
      ctx.stroke();
    }
    
    // Texte
    ctx.fillStyle = this.value ? '#000000' : '#999999';
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const displayText = this.displayedValue || this.placeholder;
    
    // Calculer la largeur disponible (en tenant compte du bouton)
    const availableWidth = this.width - 20 - this.toggleButtonSize - this.toggleButtonPadding;
    
    // Tronquer le texte si nécessaire
    let finalDisplayText = displayText;
    const textWidth = ctx.measureText(displayText).width;
    if (textWidth > availableWidth) {
      // Tronquer le texte avec "..."
      for (let i = displayText.length; i > 0; i--) {
        const truncated = displayText.substring(0, i) + '...';
        if (ctx.measureText(truncated).width <= availableWidth) {
          finalDisplayText = truncated;
          break;
        }
      }
    }
    
    ctx.fillText(finalDisplayText, this.x + 10, this.y + this.height / 2);
    
    // Curseur
    if (this.focused && this.cursorVisible && this.displayedValue) {
      const textWidth = ctx.measureText(finalDisplayText).width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x + 10 + textWidth, this.y + 10, 2, this.height - 20);
    }
    
    // Bouton d'affichage/masquage
    this.drawToggleButton(ctx);
    
    ctx.restore();
  }

  /**
   * Dessine le bouton d'affichage/masquage
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  drawToggleButton(ctx) {
    const buttonX = this.x + this.width - this.toggleButtonSize - this.toggleButtonPadding;
    const buttonY = this.y + (this.height - this.toggleButtonSize) / 2;
    
    // Cercle du bouton
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.arc(
      buttonX + this.toggleButtonSize / 2,
      buttonY + this.toggleButtonSize / 2,
      this.toggleButtonSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Icône de l'œil
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (this.showPassword) {
      // Œil barré (mot de passe visible)
      // Contour de l'œil
      ctx.arc(
        buttonX + this.toggleButtonSize / 2,
        buttonY + this.toggleButtonSize / 2,
        this.toggleButtonSize / 4,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      
      // Pupille
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.arc(
        buttonX + this.toggleButtonSize / 2,
        buttonY + this.toggleButtonSize / 2,
        this.toggleButtonSize / 8,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Barre diagonale
      ctx.beginPath();
      ctx.moveTo(buttonX + 5, buttonY + 5);
      ctx.lineTo(buttonX + this.toggleButtonSize - 5, buttonY + this.toggleButtonSize - 5);
      ctx.stroke();
    } else {
      // Œil ouvert (mot de passe masqué)
      // Contour de l'œil
      ctx.arc(
        buttonX + this.toggleButtonSize / 2,
        buttonY + this.toggleButtonSize / 2,
        this.toggleButtonSize / 4,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      
      // Pupille
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.arc(
        buttonX + this.toggleButtonSize / 2,
        buttonY + this.toggleButtonSize / 2,
        this.toggleButtonSize / 8,
        0,
        Math.PI * 2
      );
      ctx.fill();
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
   * Nettoie les ressources
   */
  destroy() {
    this.destroyHiddenInput();
    
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
    }
    
    PasswordInput.allInputs.delete(this);
    
    if (PasswordInput.allInputs.size === 0 && PasswordInput.globalClickHandler) {
      document.removeEventListener('click', PasswordInput.globalClickHandler, true);
      document.removeEventListener('touchstart', PasswordInput.globalClickHandler, true);
      PasswordInput.globalClickHandler = null;
    }
    
    super.destroy && super.destroy();
  }
}

export default PasswordInput;