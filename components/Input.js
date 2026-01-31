import Component from '../core/Component.js';

/**
 * Champ de saisie texte avec styles Material 3 (Filled/Outlined) et Cupertino
 * @class
 * @extends Component
 * @property {string} placeholder - Texte d'indication
 * @property {string} value - Valeur
 * @property {number} fontSize - Taille de police
 * @property {boolean} focused - Focus actif
 * @property {string} platform - Plateforme ('material' ou 'cupertino')
 * @property {string} variant - Variante Material ('filled' ou 'outlined')
 * @property {boolean} cursorVisible - Curseur visible
 * @property {number} cursorPosition - Position du curseur
 * @property {HTMLInputElement} hiddenInput - Input HTML caché
 * @property {string} label - Label flottant (Material)
 * @property {boolean} hasLabel - Si un label est défini
 * @property {boolean} error - État d'erreur
 * @property {string} errorText - Texte d'erreur
 * @property {boolean} disabled - État désactivé
 * @property {string} helperText - Texte d'aide
 * @property {boolean} leadingIcon - Afficher une icône à gauche
 * @property {boolean} trailingIcon - Afficher une icône à droite
 * @property {string} backgroundColor - Couleur de fond personnalisée
 * @property {string} borderColor - Couleur de bordure personnalisée
 * @property {string} focusColor - Couleur au focus personnalisée
 * @property {string} textColor - Couleur du texte personnalisée
 * @property {string} placeholderColor - Couleur du placeholder personnalisée
 */
class Input extends Component {
  static activeInput = null;
  static allInputs = new Set();
  static globalClickHandler = null;
  
  /**
   * Crée une instance de Input
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.placeholder=''] - Texte d'indication
   * @param {string} [options.value=''] - Valeur initiale
   * @param {string} [options.label=''] - Label flottant (Material)
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {string} [options.variant='filled'] - Variante Material ('filled' ou 'outlined')
   * @param {boolean} [options.error=false] - État d'erreur
   * @param {string} [options.errorText=''] - Texte d'erreur
   * @param {boolean} [options.disabled=false] - État désactivé
   * @param {string} [options.helperText=''] - Texte d'aide
   * @param {boolean} [options.leadingIcon=false] - Afficher une icône à gauche
   * @param {boolean} [options.trailingIcon=false] - Afficher une icône à droite
   * @param {string} [options.backgroundColor] - Couleur de fond personnalisée
   * @param {string} [options.borderColor] - Couleur de bordure personnalisée
   * @param {string} [options.focusColor] - Couleur au focus personnalisée
   * @param {string} [options.textColor] - Couleur du texte personnalisée
   * @param {string} [options.placeholderColor] - Couleur du placeholder personnalisée
   * @param {string} [options.labelColor] - Couleur du label personnalisée
   * @param {Function} [options.onFocus] - Callback au focus
   * @param {Function} [options.onBlur] - Callback au blur
   * @param {Function} [options.onChange] - Callback au changement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.label = options.label || '';
    this.fontSize = options.fontSize || 16;
    this.focused = false;
    this.platform = framework.platform;
    this.variant = options.variant || 'filled'; // 'filled' ou 'outlined'
    this.cursorVisible = true;
    this.cursorPosition = this.value.length;
    this.error = options.error || false;
    this.errorText = options.errorText || '';
    this.disabled = options.disabled || false;
    this.helperText = options.helperText || '';
    this.hasLabel = !!this.label;
    this.leadingIcon = options.leadingIcon || false;
    this.trailingIcon = options.trailingIcon || false;
    
    // Couleurs personnalisables
    this.backgroundColor = options.backgroundColor || null;
    this.borderColor = options.borderColor || null;
    this.focusColor = options.focusColor || null;
    this.textColor = options.textColor || null;
    this.placeholderColor = options.placeholderColor || null;
    this.labelColor = options.labelColor || null;
    
    // Dimensions pour le padding
    this.paddingLeft = this.leadingIcon ? 56 : 16;
    this.paddingRight = this.trailingIcon ? 56 : 16;
    
    // Couleurs Material Design 3 par défaut
    this.m3Colors = {
      primary: '#6750A4',
      onSurface: '#1D1B20',
      onSurfaceVariant: '#49454F',
      surfaceVariant: '#E7E0EC',
      surface: '#FEF7FF',
      error: '#BA1A1A',
      onError: '#FFFFFF',
      outline: '#79747E',
      outlineVariant: '#CAC4D0',
      disabled: '#1D1B20' + '61', // 38% opacity
      disabledContainer: '#E7E0EC' + '80',
      // Valeurs par défaut si pas personnalisé
      defaultBackground: '#F5F5F5', // Gris clair pour filled
      defaultBorder: '#CCCCCC', // Gris pour bordure non focus
      defaultFocus: '#1976D2' // Bleu Material par défaut
    };
    
    // Couleurs iOS Cupertino par défaut
    this.cupertinoColors = {
      blue: '#007AFF',
      label: '#000000',
      placeholder: '#999999',
      background: '#FFFFFF',
      border: '#C7C7CC',
      error: '#FF3B30',
      disabled: '#000000' + '4D' // 30% opacity
    };
    
    // Gestion du focus
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onChange = options.onChange || (() => {});
    
    // Enregistrer cet input
    Input.allInputs.add(this);
    
    // Animation du curseur
    this.cursorInterval = setInterval(() => {
      if (this.focused && !this.disabled) this.cursorVisible = !this.cursorVisible;
    }, 500);
    
    // Écouter les clics partout pour détecter quand on clique ailleurs
    this.setupGlobalClickHandler();
  }

  /**
   * Écoute les clics globaux pour détecter les clics hors input
   */
  setupGlobalClickHandler() {
    if (!Input.globalClickHandler) {
      Input.globalClickHandler = (e) => {
        let clickedOnInput = false;
        
        for (let input of Input.allInputs) {
          if (input.hiddenInput && e.target === input.hiddenInput) {
            clickedOnInput = true;
            break;
          }
        }
        
        if (!clickedOnInput) {
          Input.removeAllHiddenInputs();
        }
      };
      
      document.addEventListener('click', Input.globalClickHandler, true);
      document.addEventListener('touchstart', Input.globalClickHandler, true);
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
    this.hiddenInput.style.opacity = '0';
    this.hiddenInput.style.pointerEvents = 'none';
    this.hiddenInput.style.top = '-100px';
    this.hiddenInput.style.zIndex = '9999';
    document.body.appendChild(this.hiddenInput);
    
    this.hiddenInput.addEventListener('input', (e) => {
      if (this.focused && !this.disabled) {
        const oldValue = this.value;
        this.value = e.target.value;
        this.cursorPosition = this.value.length;
        if (oldValue !== this.value) {
          this.onChange(this.value);
        }
      }
    });
    
    this.hiddenInput.addEventListener('blur', () => {
      this.focused = false;
      this.cursorVisible = false;
      
      setTimeout(() => {
        this.destroyHiddenInput();
      }, 100);
    });
    
    // Gérer les touches spéciales
    this.hiddenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.focused = false;
        this.cursorVisible = false;
        this.destroyHiddenInput();
      }
    });
  }

  /**
   * Gère le focus
   */
  onFocus() {
    if (this.disabled || Input.activeInput === this) return;
    
    Input.removeAllHiddenInputs();
    
    for (let input of Input.allInputs) {
      if (input !== this) {
        input.focused = false;
        input.cursorVisible = false;
      }
    }
    
    this.focused = true;
    this.cursorVisible = true;
    Input.activeInput = this;
    
    this.setupHiddenInput();
    
    if (this.hiddenInput) {
      this.hiddenInput.value = this.value;
      this.hiddenInput.disabled = this.disabled;
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
    if (!this.disabled) {
      this.onFocus();
    }
  }
  
  /**
   * Méthode statique pour détruire tous les inputs HTML
   */
  static removeAllHiddenInputs() {
    for (let input of Input.allInputs) {
      input.focused = false;
      input.cursorVisible = false;
      
      if (input.hiddenInput && input.hiddenInput.parentNode) {
        input.hiddenInput.parentNode.removeChild(input.hiddenInput);
        input.hiddenInput = null;
      }
    }
    
    Input.activeInput = null;
  }
  
  /**
   * Vérifie si un point est dans les limites
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }

  /**
   * Obtient la couleur avec fallback
   * @param {string} customColor - Couleur personnalisée
   * @param {string} defaultColor - Couleur par défaut
   * @returns {string} La couleur à utiliser
   * @private
   */
  getColor(customColor, defaultColor) {
    return this.disabled ? this.m3Colors.disabled : 
           (customColor || defaultColor);
  }

  /**
   * Obtient la couleur de focus
   * @returns {string} La couleur au focus
   * @private
   */
  getFocusColor() {
    if (this.disabled) return this.m3Colors.outlineVariant;
    if (this.error && this.errorText) return this.m3Colors.error;
    return this.focusColor || this.m3Colors.defaultFocus;
  }

  /**
   * Obtient la couleur de bordure
   * @returns {string} La couleur de bordure
   * @private
   */
  getBorderColor() {
    if (this.disabled) return this.m3Colors.outlineVariant;
    if (this.error && this.errorText) return this.m3Colors.error;
    if (this.focused) return this.getFocusColor();
    return this.borderColor || this.m3Colors.defaultBorder;
  }

  /**
   * Obtient la couleur de fond
   * @returns {string} La couleur de fond
   * @private
   */
  getBackgroundColor() {
    if (this.disabled) return this.m3Colors.disabledContainer;
    return this.backgroundColor || this.m3Colors.defaultBackground;
  }

  /**
   * Obtient la couleur du texte
   * @returns {string} La couleur du texte
   * @private
   */
  getTextColor() {
    if (this.disabled) return this.m3Colors.disabled;
    return this.textColor || this.m3Colors.onSurface;
  }

  /**
   * Obtient la couleur du placeholder
   * @returns {string} La couleur du placeholder
   * @private
   */
  getPlaceholderColor() {
    if (this.disabled) return this.m3Colors.disabled;
    return this.placeholderColor || this.m3Colors.onSurfaceVariant;
  }

  /**
   * Obtient la couleur du label
   * @returns {string} La couleur du label
   * @private
   */
  getLabelColor() {
    if (this.disabled) return this.m3Colors.disabled;
    if (this.error && this.errorText) return this.m3Colors.error;
    if (this.focused) return this.getFocusColor();
    return this.labelColor || this.m3Colors.onSurfaceVariant;
  }

  /**
   * Dessine l'icône Material
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {string} type - Type d'icône ('leading' ou 'trailing')
   * @private
   */
  drawMaterialIcon(ctx, type) {
    const isError = this.error && this.errorText;
    
    ctx.save();
    ctx.strokeStyle = this.disabled ? this.m3Colors.disabled :
                     isError ? this.m3Colors.error :
                     this.focused ? this.getFocusColor() : this.m3Colors.onSurfaceVariant;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Position de l'icône
    const iconSize = 24;
    const iconX = type === 'leading' ? 
      this.x + 16 : this.x + this.width - 40;
    const iconY = this.y + this.height / 2 - iconSize / 2;
    
    // Dessiner une icône simple
    ctx.beginPath();
    if (type === 'leading') {
      // Icône de recherche (loupe)
      ctx.arc(iconX + 12, iconY + 12, 8, 0, Math.PI * 2);
      ctx.moveTo(iconX + 18, iconY + 18);
      ctx.lineTo(iconX + 22, iconY + 22);
    } else {
      // Icône d'erreur ou clear
      if (this.error) {
        // Point d'exclamation dans un cercle
        ctx.arc(iconX + 12, iconY + 12, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = this.m3Colors.error;
        ctx.fill();
        ctx.fillStyle = this.m3Colors.onError;
        ctx.fillRect(iconX + 11, iconY + 6, 2, 8);
        ctx.fillRect(iconX + 11, iconY + 16, 2, 2);
        ctx.restore();
        return;
      } else {
        // Croix simple (clear)
        ctx.moveTo(iconX + 8, iconY + 8);
        ctx.lineTo(iconX + 16, iconY + 16);
        ctx.moveTo(iconX + 16, iconY + 8);
        ctx.lineTo(iconX + 8, iconY + 16);
      }
    }
    
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dessine l'input Material Design 3 - Filled avec bordure en bas
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawMaterialFilledInput(ctx) {
    const isActive = this.focused || this.value.length > 0;
    const showError = this.error && this.errorText;
    
    // Container avec fond personnalisable
    ctx.fillStyle = this.getBackgroundColor();
    ctx.beginPath();
    // Coins arrondis seulement en haut
    ctx.moveTo(this.x + 12, this.y);
    ctx.lineTo(this.x + this.width - 12, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + 12);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x, this.y + 12);
    ctx.quadraticCurveTo(this.x, this.y, this.x + 12, this.y);
    ctx.closePath();
    ctx.fill();
    
    // Bordure inférieure - toujours visible
    const borderHeight = 1;
    const focusBorderHeight = 2;
    
    // Bordure normale (gris par défaut)
    ctx.fillStyle = this.getBorderColor();
    
    if (this.focused || showError) {
      // Bordure épaisse au focus/erreur
      ctx.fillRect(this.x, this.y + this.height - focusBorderHeight, 
                  this.width, focusBorderHeight);
    } else {
      // Bordure fine normale
      ctx.fillRect(this.x, this.y + this.height - borderHeight, 
                  this.width, borderHeight);
    }
    
    // Icône leading
    if (this.leadingIcon) {
      this.drawMaterialIcon(ctx, 'leading');
    }
    
    // Icône trailing
    if (this.trailingIcon) {
      this.drawMaterialIcon(ctx, 'trailing');
    }
    
    // Label flottant
    if (this.hasLabel) {
      ctx.fillStyle = this.getLabelColor();
      ctx.font = `${isActive ? 12 : this.fontSize}px 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      
      const labelX = this.x + this.paddingLeft;
      const labelY = this.focused || this.value.length > 0 ? 
        this.y + 12 : this.y + this.height / 2;
      
      ctx.fillText(this.label, labelX, labelY);
    }
    
    // Texte de saisie
    if (this.value || (!this.hasLabel && !this.focused)) {
      const displayText = this.value || this.placeholder;
      ctx.fillStyle = this.value ? this.getTextColor() : this.getPlaceholderColor();
      ctx.font = `${this.fontSize}px 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const textX = this.x + this.paddingLeft;
      const textY = this.hasLabel && (this.focused || this.value.length > 0) ? 
        this.y + this.height / 2 + 8 : this.y + this.height / 2;
      
      // Troncature du texte
      const maxWidth = this.width - this.paddingLeft - this.paddingRight;
      let displayTextAdjusted = displayText;
      let textWidth = ctx.measureText(displayText).width;
      
      if (textWidth > maxWidth) {
        while (textWidth > maxWidth && displayTextAdjusted.length > 0) {
          displayTextAdjusted = displayTextAdjusted.slice(0, -1);
          textWidth = ctx.measureText(displayTextAdjusted + '...').width;
        }
        displayTextAdjusted += '...';
      }
      
      ctx.fillText(displayTextAdjusted, textX, textY);
      
      // Curseur
      if (this.focused && this.cursorVisible && this.value) {
        ctx.fillStyle = this.getFocusColor();
        ctx.fillRect(textX + textWidth, textY - 12, 2, 24);
      }
    }
    
    // Texte d'aide ou d'erreur
    if (showError || this.helperText) {
      const helpText = showError ? this.errorText : this.helperText;
      ctx.fillStyle = showError ? this.m3Colors.error : this.m3Colors.onSurfaceVariant;
      ctx.font = `12px 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(helpText, this.x + this.paddingLeft, this.y + this.height + 4);
    }
  }

  /**
   * Dessine l'input Material Design 3 - Outlined
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawMaterialOutlinedInput(ctx) {
    const isActive = this.focused || this.value.length > 0;
    const showError = this.error && this.errorText;
    
    // Background personnalisable
    ctx.fillStyle = this.getBackgroundColor();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 4);
    ctx.fill();
    
    // Bordure avec épaisseur variable
    ctx.strokeStyle = this.getBorderColor();
    ctx.lineWidth = this.focused ? 2 : 1;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 4);
    ctx.stroke();
    
    // Fond pour le label (pour qu'il apparaisse au-dessus de la bordure)
    if (this.hasLabel && (this.focused || this.value.length > 0)) {
      ctx.fillStyle = this.getBackgroundColor();
      ctx.fillRect(this.x + 12, this.y - 6, ctx.measureText(this.label).width + 8, 12);
    }
    
    // Icône leading
    if (this.leadingIcon) {
      this.drawMaterialIcon(ctx, 'leading');
    }
    
    // Icône trailing
    if (this.trailingIcon) {
      this.drawMaterialIcon(ctx, 'trailing');
    }
    
    // Label flottant
    if (this.hasLabel) {
      ctx.fillStyle = this.getLabelColor();
      ctx.font = `${isActive ? 12 : this.fontSize}px 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      
      const labelX = this.x + this.paddingLeft;
      const labelY = this.focused || this.value.length > 0 ? 
        this.y - 2 : this.y + this.height / 2;
      
      ctx.fillText(this.label, labelX, labelY);
    }
    
    // Texte de saisie
    if (this.value || (!this.hasLabel && !this.focused)) {
      const displayText = this.value || this.placeholder;
      ctx.fillStyle = this.value ? this.getTextColor() : this.getPlaceholderColor();
      ctx.font = `${this.fontSize}px 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const textX = this.x + this.paddingLeft;
      const textY = this.y + this.height / 2;
      
      // Troncature du texte
      const maxWidth = this.width - this.paddingLeft - this.paddingRight;
      let displayTextAdjusted = displayText;
      let textWidth = ctx.measureText(displayText).width;
      
      if (textWidth > maxWidth) {
        while (textWidth > maxWidth && displayTextAdjusted.length > 0) {
          displayTextAdjusted = displayTextAdjusted.slice(0, -1);
          textWidth = ctx.measureText(displayTextAdjusted + '...').width;
        }
        displayTextAdjusted += '...';
      }
      
      ctx.fillText(displayTextAdjusted, textX, textY);
      
      // Curseur
      if (this.focused && this.cursorVisible && this.value) {
        ctx.fillStyle = this.getFocusColor();
        ctx.fillRect(textX + textWidth, textY - 12, 2, 24);
      }
    }
    
    // Texte d'aide ou d'erreur
    if (showError || this.helperText) {
      const helpText = showError ? this.errorText : this.helperText;
      ctx.fillStyle = showError ? this.m3Colors.error : this.m3Colors.onSurfaceVariant;
      ctx.font = `12px 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(helpText, this.x + this.paddingLeft, this.y + this.height + 4);
    }
  }

  /**
   * Dessine l'input iOS Cupertino
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawCupertinoInput(ctx) {
    const showError = this.error && this.errorText;
    
    // Background personnalisable
    ctx.fillStyle = this.backgroundColor || this.cupertinoColors.background;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 10);
    ctx.fill();
    
    // Bordure
    ctx.strokeStyle = this.disabled ? this.cupertinoColors.border + '80' :
                     showError ? this.cupertinoColors.error :
                     this.focused ? (this.focusColor || this.cupertinoColors.blue) : 
                     (this.borderColor || this.cupertinoColors.border);
    ctx.lineWidth = this.focused ? 2 : 1;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, 10);
    ctx.stroke();
    
    // Texte
    if (this.value || this.placeholder) {
      const displayText = this.value || this.placeholder;
      ctx.fillStyle = this.disabled ? this.cupertinoColors.disabled : 
                     this.value ? (this.textColor || this.cupertinoColors.label) : 
                     (this.placeholderColor || this.cupertinoColors.placeholder);
      ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      // Calculer la largeur maximale disponible
      const maxWidth = this.width - 32;
      let displayTextAdjusted = displayText;
      let textWidth = ctx.measureText(displayText).width;
      
      // Tronquer le texte si nécessaire
      if (textWidth > maxWidth) {
        while (textWidth > maxWidth && displayTextAdjusted.length > 0) {
          displayTextAdjusted = displayTextAdjusted.slice(0, -1);
          textWidth = ctx.measureText(displayTextAdjusted + '...').width;
        }
        displayTextAdjusted += '...';
      }
      
      ctx.fillText(displayTextAdjusted, this.x + 16, this.y + this.height / 2);
      
      // Curseur
      if (this.focused && this.cursorVisible && this.value) {
        ctx.fillStyle = this.focusColor || this.cupertinoColors.blue;
        ctx.fillRect(this.x + 16 + textWidth, this.y + 10, 2, this.height - 20);
      }
    }
    
    // Texte d'erreur
    if (showError) {
      ctx.fillStyle = this.cupertinoColors.error;
      ctx.font = `13px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.errorText, this.x + 16, this.y + this.height + 4);
    }
  }

  /**
   * Dessine l'input
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    if (this.platform === 'material') {
      if (this.variant === 'outlined') {
        this.drawMaterialOutlinedInput(ctx);
      } else {
        this.drawMaterialFilledInput(ctx);
      }
    } else {
      this.drawCupertinoInput(ctx);
    }
    
    ctx.restore();
  }

  /**
   * Dessine un rectangle avec coins arrondis
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
   * Met à jour la valeur
   * @param {string} newValue - Nouvelle valeur
   */
  setValue(newValue) {
    const oldValue = this.value;
    this.value = newValue;
    this.cursorPosition = this.value.length;
    
    if (oldValue !== newValue) {
      this.onChange(newValue);
    }
  }

  /**
   * Change la variante Material
   * @param {string} variant - 'filled' ou 'outlined'
   */
  setVariant(variant) {
    if (variant === 'filled' || variant === 'outlined') {
      this.variant = variant;
    }
  }

  /**
   * Définit les couleurs personnalisées
   * @param {Object} colors - Objet contenant les couleurs
   * @param {string} [colors.backgroundColor] - Couleur de fond
   * @param {string} [colors.borderColor] - Couleur de bordure
   * @param {string} [colors.focusColor] - Couleur au focus
   * @param {string} [colors.textColor] - Couleur du texte
   * @param {string} [colors.placeholderColor] - Couleur du placeholder
   * @param {string} [colors.labelColor] - Couleur du label
   */
  setColors(colors) {
    if (colors.backgroundColor !== undefined) this.backgroundColor = colors.backgroundColor;
    if (colors.borderColor !== undefined) this.borderColor = colors.borderColor;
    if (colors.focusColor !== undefined) this.focusColor = colors.focusColor;
    if (colors.textColor !== undefined) this.textColor = colors.textColor;
    if (colors.placeholderColor !== undefined) this.placeholderColor = colors.placeholderColor;
    if (colors.labelColor !== undefined) this.labelColor = colors.labelColor;
  }

  /**
   * Active/désactive l'état d'erreur
   * @param {boolean} error - État d'erreur
   * @param {string} errorText - Texte d'erreur
   */
  setError(error, errorText = '') {
    this.error = error;
    this.errorText = errorText;
  }

  /**
   * Active/désactive l'état désactivé
   * @param {boolean} disabled - État désactivé
   */
  setDisabled(disabled) {
    this.disabled = disabled;
    if (disabled && this.focused) {
      this.onBlur();
      this.destroyHiddenInput();
    }
  }

  /**
   * Configure les icônes
   * @param {boolean} leading - Afficher l'icône à gauche
   * @param {boolean} trailing - Afficher l'icône à droite
   */
  setIcons(leading, trailing) {
    this.leadingIcon = leading;
    this.trailingIcon = trailing;
    this.paddingLeft = leading ? 56 : 16;
    this.paddingRight = trailing ? 56 : 16;
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.destroyHiddenInput();
    
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
    }
    
    Input.allInputs.delete(this);
    
    if (Input.allInputs.size === 0 && Input.globalClickHandler) {
      document.removeEventListener('click', Input.globalClickHandler, true);
      document.removeEventListener('touchstart', Input.globalClickHandler, true);
      Input.globalClickHandler = null;
    }
    
    super.destroy && super.destroy();
  }
}

export default Input;