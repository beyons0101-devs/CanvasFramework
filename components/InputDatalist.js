import Component from '../core/Component.js';

/**
 * Champ de saisie avec suggestions (datalist)
 * @class
 * @extends Component
 * @property {string} placeholder - Texte d'indication
 * @property {string} value - Valeur
 * @property {Array} options - Liste des suggestions
 * @property {Array} filteredOptions - Options filtrées
 * @property {number} fontSize - Taille de police
 * @property {boolean} focused - Focus actif
 * @property {string} platform - Plateforme
 * @property {boolean} cursorVisible - Curseur visible
 * @property {number} cursorPosition - Position du curseur
 * @property {HTMLInputElement} hiddenInput - Input HTML caché
 * @property {number} selectedIndex - Index de l'option sélectionnée
 * @property {boolean} showDropdown - Afficher la liste déroulante
 * @property {number} maxDropdownItems - Nombre max d'éléments affichés
 * @property {number} dropdownItemHeight - Hauteur d'un élément
 */
class InputDatalist extends Component {
  static activeInput = null;
  static allInputs = new Set();
  static globalClickHandler = null;
  
  /**
   * Crée une instance de InputDatalist
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.placeholder=''] - Texte d'indication
   * @param {string} [options.value=''] - Valeur initiale
   * @param {Array} [options.options=[]] - Liste des suggestions
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {Function} [options.onFocus] - Callback au focus
   * @param {Function} [options.onBlur] - Callback au blur
   * @param {Function} [options.onSelect] - Callback quand une option est sélectionnée
   * @param {Function} [options.onInput] - Callback quand la valeur change
   * @param {number} [options.maxDropdownItems=5] - Nombre max d'éléments affichés
   * @param {string} [options.dropdownBackground='#FFFFFF'] - Couleur de fond du dropdown
   * @param {string} [options.hoverBackground='#F5F5F5'] - Couleur de fond au survol
   * @param {string} [options.borderColor='#E0E0E0'] - Couleur de bordure du dropdown
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.options = Array.isArray(options.options) ? [...options.options] : [];
    this.filteredOptions = [];
    this.fontSize = options.fontSize || 16;
    this.focused = false;
    this.platform = framework.platform;
    this.cursorVisible = true;
    this.cursorPosition = this.value.length;
    this.selectedIndex = -1;
    this.showDropdown = false;
    this.maxDropdownItems = options.maxDropdownItems || 5;
    this.dropdownItemHeight = this.fontSize + 16;
    
    // Options de style
    this.dropdownBackground = options.dropdownBackground || '#FFFFFF';
    this.hoverBackground = options.hoverBackground || '#F5F5F5';
    this.borderColor = options.borderColor || '#E0E0E0';
    this.selectedBackground = options.selectedBackground || '#E3F2FD';
    
    // Callbacks
    this.onSelect = options.onSelect || (() => {});
    this.onInput = options.onInput || (() => {});
    
    // Gestion du focus
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.filterOptions = this.filterOptions.bind(this);
    
    // Enregistrer cet input
    InputDatalist.allInputs.add(this);
    
    // Animation du curseur
    this.cursorInterval = setInterval(() => {
      if (this.focused) this.cursorVisible = !this.cursorVisible;
    }, 500);
    
    // Écouter les clics globaux pour détecter les clics hors input
    this.setupGlobalClickHandler();
    
    // Filtrer les options initiales
    if (this.value) {
      this.filterOptions(this.value);
    }
  }

  /**
   * Écoute les clics globaux pour détecter les clics hors input
   */
  setupGlobalClickHandler() {
    if (!InputDatalist.globalClickHandler) {
      InputDatalist.globalClickHandler = (e) => {
        let clickedOnInput = false;
        
        for (let input of InputDatalist.allInputs) {
          if (input.hiddenInput && e.target === input.hiddenInput) {
            clickedOnInput = true;
            break;
          }
        }
        
        if (!clickedOnInput) {
          InputDatalist.removeAllHiddenInputs();
        }
      };
      
      document.addEventListener('click', InputDatalist.globalClickHandler, true);
      document.addEventListener('touchstart', InputDatalist.globalClickHandler, true);
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
    this.hiddenInput.type = 'text'; // Important: type text pour la saisie normale
    this.hiddenInput.style.opacity = '0';
    this.hiddenInput.style.pointerEvents = 'none';
    this.hiddenInput.style.top = '-100px';
    this.hiddenInput.style.zIndex = '9999';
    document.body.appendChild(this.hiddenInput);
    
    this.hiddenInput.addEventListener('input', (e) => {
      if (this.focused) {
        this.value = e.target.value;
        this.cursorPosition = this.value.length;
        this.filterOptions(this.value);
        this.onInput(this.value);
      }
    });
    
    this.hiddenInput.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNextOption();
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          this.selectPreviousOption();
          break;
          
        case 'Enter':
          e.preventDefault();
          this.selectCurrentOption();
          break;
          
        case 'Escape':
          e.preventDefault();
          this.hideDropdown();
          // Garder le focus
          if (this.hiddenInput) {
            setTimeout(() => this.hiddenInput.focus(), 10);
          }
          break;
          
        case 'Tab':
          this.selectCurrentOption();
          break;
      }
    });
    
    this.hiddenInput.addEventListener('blur', () => {
      // Temporisation plus longue pour permettre la sélection avec la souris
      setTimeout(() => {
        if (!this.isDropdownActive) {
          this.focused = false;
          this.cursorVisible = false;
          this.hideDropdown();
          
          setTimeout(() => {
            this.destroyHiddenInput();
          }, 100);
        }
      }, 300);
    });
  }

  /**
   * Vérifie si le dropdown est actif (souris dessus)
   */
  get isDropdownActive() {
    // Cette propriété serait gérée via des événements mouseenter/mouseleave
    // Pour l'instant, on retourne false par défaut
    return false;
  }

  /**
   * Filtre les options selon la recherche
   * @param {string} search - Texte de recherche
   */
  filterOptions(search) {
    const searchLower = search.toLowerCase();
    
    if (search === '') {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter(option =>
        option.toLowerCase().includes(searchLower)
      );
    }
    
    this.selectedIndex = this.filteredOptions.length > 0 ? 0 : -1;
    this.showDropdown = this.filteredOptions.length > 0 && this.focused;
  }

  /**
   * Sélectionne l'option suivante
   */
  selectNextOption() {
    if (this.filteredOptions.length === 0) return;
    
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredOptions.length;
    this.ensureSelectedVisible();
  }

  /**
   * Sélectionne l'option précédente
   */
  selectPreviousOption() {
    if (this.filteredOptions.length === 0) return;
    
    this.selectedIndex = this.selectedIndex <= 0 
      ? this.filteredOptions.length - 1 
      : this.selectedIndex - 1;
    this.ensureSelectedVisible();
  }

  /**
   * Assure que l'option sélectionnée est visible
   */
  ensureSelectedVisible() {
    // Pour l'instant, on s'assure juste que l'index est valide
    if (this.selectedIndex >= this.filteredOptions.length) {
      this.selectedIndex = this.filteredOptions.length - 1;
    }
  }

  /**
   * Sélectionne l'option actuelle
   */
  selectCurrentOption() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredOptions.length) {
      const selectedOption = this.filteredOptions[this.selectedIndex];
      this.value = selectedOption;
      
      if (this.hiddenInput) {
        this.hiddenInput.value = selectedOption;
      }
      
      this.filterOptions(selectedOption);
      this.onSelect(selectedOption);
      this.hideDropdown();
    }
  }

  /**
   * Masque le dropdown
   */
  hideDropdown() {
    this.showDropdown = false;
    this.selectedIndex = -1;
  }

  /**
   * Ajoute une option à la liste
   * @param {string} option - Option à ajouter
   */
  addOption(option) {
    if (!this.options.includes(option)) {
      this.options.push(option);
      this.filterOptions(this.value);
    }
  }

  /**
   * Supprime une option de la liste
   * @param {string} option - Option à supprimer
   */
  removeOption(option) {
    const index = this.options.indexOf(option);
    if (index > -1) {
      this.options.splice(index, 1);
      this.filterOptions(this.value);
    }
  }

  /**
   * Remplace toutes les options
   * @param {Array} newOptions - Nouvelles options
   */
  setOptions(newOptions) {
    this.options = Array.isArray(newOptions) ? [...newOptions] : [];
    this.filterOptions(this.value);
  }

  /**
   * Gère le focus
   */
  onFocus() {
    if (InputDatalist.activeInput === this) {
      return;
    }
    
    InputDatalist.removeAllHiddenInputs();
    
    for (let input of InputDatalist.allInputs) {
      if (input !== this) {
        input.focused = false;
        input.cursorVisible = false;
        input.hideDropdown();
      }
    }
    
    this.focused = true;
    this.cursorVisible = true;
    InputDatalist.activeInput = this;
    
    // Filtrer et montrer les options
    this.filterOptions(this.value);
    this.showDropdown = this.filteredOptions.length > 0;
    
    this.setupHiddenInput();
    
    if (this.hiddenInput) {
      this.hiddenInput.value = this.value;
      
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
    // Le dropdown sera caché par le blur handler de l'input HTML
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
   * Vérifie si un point est dans le dropdown
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {number|null} Index de l'option ou null
   */
  getDropdownOptionAtPoint(x, y) {
    if (!this.showDropdown || this.filteredOptions.length === 0) {
      return null;
    }
    
    const dropdownY = this.y + this.height;
    const itemsToShow = Math.min(this.filteredOptions.length, this.maxDropdownItems);
    const dropdownHeight = itemsToShow * this.dropdownItemHeight;
    
    // Vérifier si le point est dans la zone du dropdown
    if (x >= this.x && 
        x <= this.x + this.width && 
        y >= dropdownY && 
        y <= dropdownY + dropdownHeight) {
      
      const relativeY = y - dropdownY;
      const optionIndex = Math.floor(relativeY / this.dropdownItemHeight);
      
      if (optionIndex >= 0 && optionIndex < itemsToShow) {
        // Retourner l'index réel dans filteredOptions
        return optionIndex;
      }
    }
    
    return null;
  }

  /**
   * Gère le clic
   * @param {number} x - Coordonnée X du clic
   * @param {number} y - Coordonnée Y du clic
   * @returns {boolean} True si le clic a été géré
   */
  onClick(x, y) {
    // Vérifier si on clique sur une option du dropdown
    const optionIndex = this.getDropdownOptionAtPoint(x, y);
    if (optionIndex !== null) {
      this.selectedIndex = optionIndex;
      this.selectCurrentOption();
      return true;
    }
    
    // Vérifier si on clique dans la zone d'input
    if (this.isPointInside(x, y)) {
      this.onFocus();
      return true;
    }
    
    // Clic hors de l'input et du dropdown
    if (this.showDropdown) {
      this.hideDropdown();
    }
    
    return false;
  }

  /**
   * Méthode statique pour détruire tous les inputs HTML
   */
  static removeAllHiddenInputs() {
    for (let input of InputDatalist.allInputs) {
      input.focused = false;
      input.cursorVisible = false;
      input.hideDropdown();
      
      if (input.hiddenInput && input.hiddenInput.parentNode) {
        input.hiddenInput.parentNode.removeChild(input.hiddenInput);
        input.hiddenInput = null;
      }
    }
    
    InputDatalist.activeInput = null;
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
    
    // Style de base de l'input
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
    
    // Texte de l'input
    ctx.fillStyle = this.value ? '#000000' : '#999999';
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const displayText = this.value || this.placeholder;
    const textX = this.x + 10;
    const textY = this.y + this.height / 2;
    
    // Tronquer le texte si trop long
    const maxTextWidth = this.width - 30; // 10px padding + 20px pour l'icône
    let finalDisplayText = displayText;
    const textWidth = ctx.measureText(displayText).width;
    
    if (textWidth > maxTextWidth) {
      // Tronquer avec "..."
      for (let i = displayText.length; i > 0; i--) {
        const truncated = displayText.substring(0, i) + '...';
        if (ctx.measureText(truncated).width <= maxTextWidth) {
          finalDisplayText = truncated;
          break;
        }
      }
    }
    
    ctx.fillText(finalDisplayText, textX, textY);
    
    // Curseur
    if (this.focused && this.cursorVisible && this.value) {
      const cursorTextWidth = ctx.measureText(finalDisplayText).width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(textX + cursorTextWidth, this.y + 10, 2, this.height - 20);
    }
    
    // Icône de dropdown (flèche) seulement si des options existent
    if (this.options.length > 0) {
      this.drawDropdownIcon(ctx);
    }
    
    // Dropdown - TOUJOURS dessiner en dernier pour être au-dessus
    if (this.showDropdown && this.filteredOptions.length > 0) {
      this.drawDropdown(ctx);
    }
    
    ctx.restore();
  }

  /**
   * Dessine l'icône de dropdown
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  drawDropdownIcon(ctx) {
    const iconSize = 12;
    const iconX = this.x + this.width - iconSize - 10;
    const iconY = this.y + this.height / 2 - iconSize / 2;
    
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(iconX, iconY + iconSize / 3);
    ctx.lineTo(iconX + iconSize / 2, iconY + 2 * iconSize / 3);
    ctx.lineTo(iconX + iconSize, iconY + iconSize / 3);
    ctx.stroke();
  }

  /**
   * Dessine le dropdown
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  drawDropdown(ctx) {
    const dropdownY = this.y + this.height;
    const itemsToShow = Math.min(this.filteredOptions.length, this.maxDropdownItems);
    const dropdownHeight = itemsToShow * this.dropdownItemHeight;
    
    // Sauvegarder l'état du contexte
    ctx.save();
    
    // Ombre portée
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Fond du dropdown
    ctx.fillStyle = this.dropdownBackground;
    this.roundRect(ctx, this.x, dropdownY, this.width, dropdownHeight, 4);
    ctx.fill();
    
    // Désactiver l'ombre pour la bordure
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Bordure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.x, dropdownY, this.width, dropdownHeight, 4);
    ctx.stroke();
    
    // Options
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < itemsToShow; i++) {
      const optionY = dropdownY + i * this.dropdownItemHeight;
      const optionHeight = this.dropdownItemHeight;
      
      // Fond de l'option (si survolée/sélectionnée)
      if (i === this.selectedIndex) {
        ctx.fillStyle = this.selectedBackground;
        ctx.fillRect(this.x, optionY, this.width, optionHeight);
      }
      
      // Séparateur (sauf pour le premier élément)
      if (i > 0) {
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, optionY);
        ctx.lineTo(this.x + this.width - 10, optionY);
        ctx.stroke();
      }
      
      // RÉINITIALISER la couleur du texte à chaque itération
      ctx.fillStyle = '#000000';
      
      // Dessiner le texte de l'option
      const optionText = this.filteredOptions[i];
      const textX = this.x + 10;
      const textY = optionY + optionHeight / 2;
      
      // Tronquer le texte si trop long
      const maxOptionWidth = this.width - 20;
      let displayOptionText = optionText;
      const optionTextWidth = ctx.measureText(optionText).width;
      
      if (optionTextWidth > maxOptionWidth) {
        for (let j = optionText.length; j > 0; j--) {
          const truncated = optionText.substring(0, j) + '...';
          if (ctx.measureText(truncated).width <= maxOptionWidth) {
            displayOptionText = truncated;
            break;
          }
        }
      }
      
      // Mettre en évidence la partie correspondante
      if (this.value && this.value.length > 0) {
        const searchLower = this.value.toLowerCase();
        const optionLower = optionText.toLowerCase();
        const matchIndex = optionLower.indexOf(searchLower);
        
        if (matchIndex >= 0 && matchIndex < displayOptionText.length) {
          // Partie avant la correspondance
          const beforeMatch = displayOptionText.substring(0, matchIndex);
          const matchLength = Math.min(this.value.length, displayOptionText.length - matchIndex);
          const matchPart = displayOptionText.substring(matchIndex, matchIndex + matchLength);
          const afterMatch = displayOptionText.substring(matchIndex + matchLength);
          
          // Dessiner partie avant
          ctx.fillStyle = '#666666';
          ctx.fillText(beforeMatch, textX, textY);
          
          // Dessiner partie correspondante
          const beforeWidth = ctx.measureText(beforeMatch).width;
          ctx.fillStyle = '#000000';
          ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
          ctx.fillText(matchPart, textX + beforeWidth, textY);
          
          // Dessiner partie après
          const matchWidth = ctx.measureText(matchPart).width;
          ctx.fillStyle = '#666666';
          ctx.fillText(afterMatch, textX + beforeWidth + matchWidth, textY);
        } else {
          // Pas de correspondance
          ctx.fillStyle = '#666666';
          ctx.fillText(displayOptionText, textX, textY);
        }
      } else {
        // Pas de valeur de recherche
        ctx.fillStyle = '#666666';
        ctx.fillText(displayOptionText, textX, textY);
      }
    }
    
    // Restaurer l'état du contexte
    ctx.restore();
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
   * Nettoie les ressources
   */
  destroy() {
    this.destroyHiddenInput();
    
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
    }
    
    InputDatalist.allInputs.delete(this);
    
    if (InputDatalist.allInputs.size === 0 && InputDatalist.globalClickHandler) {
      document.removeEventListener('click', InputDatalist.globalClickHandler, true);
      document.removeEventListener('touchstart', InputDatalist.globalClickHandler, true);
      InputDatalist.globalClickHandler = null;
    }
    
    super.destroy && super.destroy();
  }
}

export default InputDatalist;