import Component from '../core/Component.js';

/**
 * Champ de saisie de tags avec gestion de tags multiples
 * @class
 * @extends Component
 * @property {string} placeholder - Texte d'indication
 * @property {string} value - Valeur en cours de saisie
 * @property {Array} tags - Liste des tags
 * @property {number} fontSize - Taille de police
 * @property {boolean} focused - Focus actif
 * @property {string} platform - Plateforme
 * @property {boolean} cursorVisible - Curseur visible
 * @property {number} cursorPosition - Position du curseur
 * @property {HTMLInputElement} hiddenInput - Input HTML caché
 * @property {number} tagPadding - Padding interne des tags
 * @property {number} tagSpacing - Espacement entre les tags
 * @property {string} tagColor - Couleur des tags
 * @property {string} tagTextColor - Couleur du texte des tags
 * @property {string} deleteButtonColor - Couleur du bouton de suppression
 */
class InputTags extends Component {
  static activeInput = null;
  static allInputs = new Set();
  static globalClickHandler = null;
  
  /**
   * Crée une instance de InputTags
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.placeholder=''] - Texte d'indication
   * @param {Array} [options.tags=[]] - Tags initiaux
   * @param {string} [options.value=''] - Valeur initiale
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {Function} [options.onFocus] - Callback au focus
   * @param {Function} [options.onBlur] - Callback au blur
   * @param {Function} [options.onTagAdd] - Callback quand un tag est ajouté
   * @param {Function} [options.onTagRemove] - Callback quand un tag est supprimé
   * @param {number} [options.tagPadding=8] - Padding interne des tags
   * @param {number} [options.tagSpacing=6] - Espacement entre les tags
   * @param {string} [options.tagColor='#E0E0E0'] - Couleur des tags
   * @param {string} [options.tagTextColor='#333333'] - Couleur du texte des tags
   * @param {string} [options.deleteButtonColor='#666666'] - Couleur du bouton de suppression
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.placeholder = options.placeholder || 'Ajouter des tags...';
    this.value = options.value || '';
    this.tags = Array.isArray(options.tags) ? [...options.tags] : [];
    this.fontSize = options.fontSize || 16;
    this.focused = false;
    this.platform = framework.platform;
    this.cursorVisible = true;
    this.cursorPosition = this.value.length;
    
    // Configuration des tags
    this.tagPadding = options.tagPadding || 8;
    this.tagSpacing = options.tagSpacing || 6;
    this.tagColor = options.tagColor || '#E0E0E0';
    this.tagTextColor = options.tagTextColor || '#333333';
    this.deleteButtonColor = options.deleteButtonColor || '#666666';
    
    // Callbacks
    this.onTagAdd = options.onTagAdd || (() => {});
    this.onTagRemove = options.onTagRemove || (() => {});
    
    // Calculs de layout
    this.tagHeight = this.fontSize + this.tagPadding * 2;
    this.deleteButtonSize = this.fontSize * 0.8;
    
    // Gestion du focus
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    
    // Enregistrer cet input
    InputTags.allInputs.add(this);
    
    // Animation du curseur
    this.cursorInterval = setInterval(() => {
      if (this.focused) this.cursorVisible = !this.cursorVisible;
    }, 500);
    
    // Écouter les clics partout pour détecter quand on clique ailleurs
    this.setupGlobalClickHandler();
  }

  /**
   * Écoute les clics globaux pour détecter les clics hors input
   */
  setupGlobalClickHandler() {
    if (!InputTags.globalClickHandler) {
      InputTags.globalClickHandler = (e) => {
        let clickedOnInput = false;
        
        for (let input of InputTags.allInputs) {
          if (input.hiddenInput && e.target === input.hiddenInput) {
            clickedOnInput = true;
            break;
          }
        }
        
        if (!clickedOnInput) {
          InputTags.removeAllHiddenInputs();
        }
      };
      
      document.addEventListener('click', InputTags.globalClickHandler, true);
      document.addEventListener('touchstart', InputTags.globalClickHandler, true);
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
      if (this.focused) {
        this.value = e.target.value;
        this.cursorPosition = this.value.length;
      }
    });
    
    this.hiddenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        this.addCurrentTag();
      } else if (e.key === 'Backspace' && this.value === '' && this.tags.length > 0) {
        this.removeLastTag();
      }
    });
    
    this.hiddenInput.addEventListener('blur', () => {
      // Ajouter le tag en cours si non vide
      if (this.value.trim() !== '') {
        this.addCurrentTag();
      }
      
      this.focused = false;
      this.cursorVisible = false;
      
      setTimeout(() => {
        this.destroyHiddenInput();
      }, 100);
    });
  }

  /**
   * Ajoute le tag en cours de saisie
   */
  addCurrentTag() {
    const tag = this.value.trim();
    if (tag !== '' && !this.tags.includes(tag)) {
      this.tags.push(tag);
      this.value = '';
      this.cursorPosition = 0;
      
      if (this.hiddenInput) {
        this.hiddenInput.value = '';
      }
      
      this.onTagAdd(tag, this.tags);
    }
  }

  /**
   * Ajoute un tag spécifique
   * @param {string} tag - Tag à ajouter
   */
  addTag(tag) {
    const trimmedTag = tag.trim();
    if (trimmedTag !== '' && !this.tags.includes(trimmedTag)) {
      this.tags.push(trimmedTag);
      this.onTagAdd(trimmedTag, this.tags);
    }
  }

  /**
   * Supprime un tag par son index
   * @param {number} index - Index du tag à supprimer
   */
  removeTag(index) {
    if (index >= 0 && index < this.tags.length) {
      const removedTag = this.tags[index];
      this.tags.splice(index, 1);
      this.onTagRemove(removedTag, this.tags);
    }
  }

  /**
   * Supprime le dernier tag
   */
  removeLastTag() {
    if (this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
    }
  }

  /**
   * Supprime tous les tags
   */
  clearTags() {
    const oldTags = [...this.tags];
    this.tags = [];
    oldTags.forEach(tag => this.onTagRemove(tag, this.tags));
  }

  /**
   * Vérifie si un point est sur le bouton de suppression d'un tag
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {number|null} Index du tag ou null
   */
  getTagIndexAtPoint(x, y) {
    let currentX = this.x + 10;
    const tagY = this.y + 10;
    
    for (let i = 0; i < this.tags.length; i++) {
      const tag = this.tags[i];
      const tagWidth = this.measureTagWidth(tag);
      
      // Vérifier si le point est dans le tag
      if (x >= currentX && x <= currentX + tagWidth &&
          y >= tagY && y <= tagY + this.tagHeight) {
        return i;
      }
      
      currentX += tagWidth + this.tagSpacing;
    }
    
    return null;
  }

  /**
   * Vérifie si un point est sur le bouton de suppression d'un tag
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {number|null} Index du tag ou null
   */
  getDeleteButtonIndexAtPoint(x, y) {
    let currentX = this.x + 10;
    const tagY = this.y + 10;
    
    for (let i = 0; i < this.tags.length; i++) {
      const tag = this.tags[i];
      const tagWidth = this.measureTagWidth(tag);
      const deleteButtonX = currentX + tagWidth - this.deleteButtonSize - this.tagPadding / 2;
      const deleteButtonY = tagY + (this.tagHeight - this.deleteButtonSize) / 2;
      
      // Vérifier si le point est sur le bouton de suppression
      if (x >= deleteButtonX && x <= deleteButtonX + this.deleteButtonSize &&
          y >= deleteButtonY && y <= deleteButtonY + this.deleteButtonSize) {
        return i;
      }
      
      currentX += tagWidth + this.tagSpacing;
    }
    
    return null;
  }

  /**
   * Mesure la largeur d'un tag
   * @param {string} tag - Tag à mesurer
   * @returns {number} Largeur du tag
   */
  measureTagWidth(tag) {
    // Approximation de la largeur du texte
    const textWidth = tag.length * (this.fontSize * 0.6);
    return textWidth + this.tagPadding * 2 + this.deleteButtonSize + this.tagPadding / 2;
  }

  /**
   * Gère le focus
   */
  onFocus() {
    if (InputTags.activeInput === this) {
      return;
    }
    
    InputTags.removeAllHiddenInputs();
    
    for (let input of InputTags.allInputs) {
      if (input !== this) {
        input.focused = false;
        input.cursorVisible = false;
      }
    }
    
    this.focused = true;
    this.cursorVisible = true;
    InputTags.activeInput = this;
    
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
   * @param {number} x - Coordonnée X du clic
   * @param {number} y - Coordonnée Y du clic
   * @returns {boolean} True si le clic a été géré
   */
  onClick(x, y) {
    // Vérifier si on clique sur un bouton de suppression
    const deleteIndex = this.getDeleteButtonIndexAtPoint(x, y);
    if (deleteIndex !== null) {
      this.removeTag(deleteIndex);
      return true;
    }
    
    // Vérifier si on clique sur un tag (pour focus l'input)
    const tagIndex = this.getTagIndexAtPoint(x, y);
    if (tagIndex !== null) {
      this.onFocus();
      return true;
    }
    
    // Vérifier si on clique dans la zone d'input
    if (this.isPointInside(x, y)) {
      this.onFocus();
      return true;
    }
    
    return false;
  }

  /**
   * Méthode statique pour détruire tous les inputs HTML
   */
  static removeAllHiddenInputs() {
    for (let input of InputTags.allInputs) {
      input.focused = false;
      input.cursorVisible = false;
      
      if (input.hiddenInput && input.hiddenInput.parentNode) {
        input.hiddenInput.parentNode.removeChild(input.hiddenInput);
        input.hiddenInput = null;
      }
    }
    
    InputTags.activeInput = null;
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
   * Calcule la position X du curseur
   * @returns {number} Position X du curseur
   */
  getCursorXPosition() {
    let cursorX = this.x + 10;
    
    // Ajouter la largeur de tous les tags
    for (let tag of this.tags) {
      cursorX += this.measureTagWidth(tag) + this.tagSpacing;
    }
    
    // Ajouter la largeur du texte en cours
    const textWidth = this.value.length * (this.fontSize * 0.6);
    cursorX += textWidth;
    
    return cursorX;
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
    
    // Position de départ pour dessiner les tags
    let currentX = this.x + 10;
    const tagY = this.y + 10;
    
    // Dessiner les tags
    for (let i = 0; i < this.tags.length; i++) {
      this.drawTag(ctx, this.tags[i], currentX, tagY);
      const tagWidth = this.measureTagWidth(this.tags[i]);
      currentX += tagWidth + this.tagSpacing;
    }
    
    // Dessiner le texte en cours
    if (this.value || (this.focused && this.tags.length === 0)) {
      ctx.fillStyle = this.value ? '#000000' : '#999999';
      ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const displayText = this.value || this.placeholder;
      const textY = this.y + this.height / 2;
      
      ctx.fillText(displayText, currentX, textY);
      
      // Curseur
      if (this.focused && this.cursorVisible) {
        const textWidth = ctx.measureText(this.value).width;
        ctx.fillStyle = '#000000';
        ctx.fillRect(currentX + textWidth, textY - this.fontSize / 2, 2, this.fontSize);
      }
    }
    
    ctx.restore();
  }

  /**
   * Dessine un tag
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {string} tag - Texte du tag
   * @param {number} x - Position X
   * @param {number} y - Position Y
   */
  drawTag(ctx, tag, x, y) {
    const tagWidth = this.measureTagWidth(tag);
    
    // Fond du tag
    ctx.fillStyle = this.tagColor;
    this.roundRect(ctx, x, y, tagWidth, this.tagHeight, this.tagHeight / 2);
    ctx.fill();
    
    // Texte du tag
    ctx.fillStyle = this.tagTextColor;
    ctx.font = `${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const textX = x + this.tagPadding;
    const textY = y + this.tagHeight / 2;
    
    // Tronquer le texte si trop long
    const maxTextWidth = tagWidth - this.tagPadding * 2 - this.deleteButtonSize - this.tagPadding / 2;
    let displayTag = tag;
    let textWidth = ctx.measureText(tag).width;
    
    if (textWidth > maxTextWidth) {
      // Tronquer le texte avec "..."
      for (let i = tag.length; i > 0; i--) {
        const truncated = tag.substring(0, i) + '...';
        if (ctx.measureText(truncated).width <= maxTextWidth) {
          displayTag = truncated;
          break;
        }
      }
    }
    
    ctx.fillText(displayTag, textX, textY);
    
    // Bouton de suppression (×)
    const deleteButtonX = x + tagWidth - this.deleteButtonSize - this.tagPadding / 2;
    const deleteButtonY = y + (this.tagHeight - this.deleteButtonSize) / 2;
    
    ctx.strokeStyle = this.deleteButtonColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Croix
    const centerX = deleteButtonX + this.deleteButtonSize / 2;
    const centerY = deleteButtonY + this.deleteButtonSize / 2;
    const crossSize = this.deleteButtonSize / 3;
    
    ctx.moveTo(centerX - crossSize, centerY - crossSize);
    ctx.lineTo(centerX + crossSize, centerY + crossSize);
    ctx.moveTo(centerX + crossSize, centerY - crossSize);
    ctx.lineTo(centerX - crossSize, centerY + crossSize);
    ctx.stroke();
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
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
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
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.destroyHiddenInput();
    
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
    }
    
    InputTags.allInputs.delete(this);
    
    if (InputTags.allInputs.size === 0 && InputTags.globalClickHandler) {
      document.removeEventListener('click', InputTags.globalClickHandler, true);
      document.removeEventListener('touchstart', InputTags.globalClickHandler, true);
      InputTags.globalClickHandler = null;
    }
    
    super.destroy && super.destroy();
  }
}

export default InputTags;