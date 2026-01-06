import Component from '../core/Component.js';

/**
 * Champ de saisie texte
 * @class
 * @extends Component
 * @property {string} placeholder - Texte d'indication
 * @property {string} value - Valeur
 * @property {number} fontSize - Taille de police
 * @property {boolean} focused - Focus actif
 * @property {string} platform - Plateforme
 * @property {boolean} cursorVisible - Curseur visible
 * @property {number} cursorPosition - Position du curseur
 * @property {HTMLInputElement} hiddenInput - Input HTML caché
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
   * @param {number} [options.fontSize=16] - Taille de police
   * @param {Function} [options.onFocus] - Callback au focus
   * @param {Function} [options.onBlur] - Callback au blur
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.placeholder = options.placeholder || '';
    this.value = options.value || '';
    this.fontSize = options.fontSize || 16;
    this.focused = false;
    this.platform = framework.platform;
    this.cursorVisible = true;
    this.cursorPosition = this.value.length;
    
    // Gestion du focus
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    
    // Enregistrer cet input
    Input.allInputs.add(this);
    
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
    // On crée un gestionnaire unique pour tous les inputs
    if (!Input.globalClickHandler) {
      Input.globalClickHandler = (e) => {
        // Vérifier si on a cliqué en dehors de TOUS les inputs
        let clickedOnInput = false;
        
        for (let input of Input.allInputs) {
          if (input.hiddenInput && e.target === input.hiddenInput) {
            clickedOnInput = true;
            break;
          }
        }
        
        // Si on n'a pas cliqué sur un input, détruire tous les inputs HTML
        if (!clickedOnInput) {
          Input.removeAllHiddenInputs();
        }
      };
      
      // Attacher l'écouteur avec capture pour qu'il se déclenche tôt
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
    
    // Créer un input HTML caché unique pour cette instance
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
    
    this.hiddenInput.addEventListener('blur', () => {
      this.focused = false;
      this.cursorVisible = false;
      
      // Détruire l'input HTML après un court délai
      setTimeout(() => {
        this.destroyHiddenInput();
      }, 100);
    });
  }

  /**
   * Gère le focus
   */
  onFocus() {
    // Si c'est déjà l'input actif, ne rien faire
    if (Input.activeInput === this) {
      return;
    }
    
    // D'abord, détruire TOUS les autres inputs HTML
    Input.removeAllHiddenInputs();
    
    // Désactiver tous les autres inputs visuellement
    for (let input of Input.allInputs) {
      if (input !== this) {
        input.focused = false;
        input.cursorVisible = false;
      }
    }
    
    // Activer celui-ci
    this.focused = true;
    this.cursorVisible = true;
    Input.activeInput = this;
    
    // Créer l'input HTML si nécessaire
    this.setupHiddenInput();
    
    if (this.hiddenInput) {
      this.hiddenInput.value = this.value;
      // Positionner l'input au bon endroit pour le scroll du clavier
      const adjustedY = this.y + this.framework.scrollOffset;
      this.hiddenInput.style.top = `${adjustedY}px`;
      
      // Focus avec un petit délai
      setTimeout(() => {
        if (this.hiddenInput && this.focused) {
          this.hiddenInput.focus();
          // Positionner le curseur à la fin
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
   * Méthode statique pour détruire tous les inputs HTML
   */
  static removeAllHiddenInputs() {
    // Désactiver tous les inputs visuels
    for (let input of Input.allInputs) {
      input.focused = false;
      input.cursorVisible = false;
      
      // Détruire l'input HTML
      if (input.hiddenInput && input.hiddenInput.parentNode) {
        input.hiddenInput.parentNode.removeChild(input.hiddenInput);
        input.hiddenInput = null;
      }
    }
    
    Input.activeInput = null;
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
      // Material Design Input
      ctx.strokeStyle = this.focused ? '#6200EE' : '#CCCCCC';
      ctx.lineWidth = this.focused ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
    } else {
      // Cupertino Input
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
    const displayText = this.value || this.placeholder;
    ctx.fillText(displayText, this.x + 10, this.y + this.height / 2);
    
    // Curseur
    if (this.focused && this.cursorVisible && this.value) {
      const textWidth = ctx.measureText(this.value).width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x + 10 + textWidth, this.y + 10, 2, this.height - 20);
    }
    
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
    
    Input.allInputs.delete(this);
    
    // Si c'était le dernier input, retirer le gestionnaire global
    if (Input.allInputs.size === 0 && Input.globalClickHandler) {
      document.removeEventListener('click', Input.globalClickHandler, true);
      document.removeEventListener('touchstart', Input.globalClickHandler, true);
      Input.globalClickHandler = null;
    }
    
    super.destroy && super.destroy();
  }
}

export default Input;