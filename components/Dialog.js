import Component from '../core/Component.js';
/**
 * Boîte de dialogue modale
 * @class
 * @extends Component
 * @property {string} title - Titre du dialog
 * @property {string} message - Message du dialog
 * @property {string[]} buttons - Liste des boutons
 * @property {Function} onButtonClick - Callback au clic sur un bouton
 * @property {number} dialogWidth - Largeur du dialog
 * @property {number} dialogHeight - Hauteur du dialog
 * @property {number} opacity - Opacité pour l'animation
 * @property {Array} buttonRects - Positions des boutons
 * @property {boolean} isVisible - Visibilité
 * @property {number} pressedButtonIndex - Index du bouton pressé
 */
class Dialog extends Component {
  /**
   * Crée une instance de Dialog
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title=''] - Titre
   * @param {string} [options.message=''] - Message
   * @param {string[]} [options.buttons=['OK']] - Boutons
   * @param {Function} [options.onButtonClick] - Callback au clic sur bouton
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: framework.height,
      visible: false
    });
    this.title = options.title || '';
    this.message = options.message || '';
    this.buttons = options.buttons || ['OK'];
    this.onButtonClick = options.onButtonClick;
    this.dialogWidth = Math.min(320, framework.width - 40);
    this.dialogHeight = 200;
    this.opacity = 0;
    this.buttonRects = [];
    this.isVisible = false;
    this.pressedButtonIndex = -1;
    
    // Définir onPress
    this.onPress = this.handlePress.bind(this);
    
    // Pour diviser le message en plusieurs lignes
    this.messageLines = this.wrapText(this.message, this.dialogWidth - 40, '16px -apple-system, sans-serif');
    
    // Ajuster la hauteur du dialog en fonction du message
    if (this.messageLines.length > 2) {
      this.dialogHeight = 150 + (this.messageLines.length - 2) * 20;
    }
  }

  /**
   * Divise le texte en plusieurs lignes
   * @param {string} text - Texte à diviser
   * @param {number} maxWidth - Largeur maximale
   * @param {string} font - Police de caractères
   * @returns {string[]} Tableau de lignes
   * @private
   */
  wrapText(text, maxWidth, font) {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = font;
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    
    ctx.restore();
    return lines;
  }

  /**
   * Dessine le dialog
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (this.opacity <= 0 || !this.isVisible) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Overlay sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    // Dialog box
    const dialogX = (this.framework.width - this.dialogWidth) / 2;
    const dialogY = (this.framework.height - this.dialogHeight) / 2;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    this.roundRect(ctx, dialogX, dialogY, this.dialogWidth, this.dialogHeight, 12);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Titre
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, dialogX + this.dialogWidth / 2, dialogY + 40);
    
    // Message (lignes multiples)
    ctx.fillStyle = '#666666';
    ctx.font = '16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < this.messageLines.length; i++) {
      ctx.fillText(
        this.messageLines[i],
        dialogX + this.dialogWidth / 2,
        dialogY + 80 + (i * 24)
      );
    }
    
    // Divider au-dessus des boutons
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dialogX, dialogY + this.dialogHeight - 60);
    ctx.lineTo(dialogX + this.dialogWidth, dialogY + this.dialogHeight - 60);
    ctx.stroke();
    
    // Boutons
    this.buttonRects = [];
    const buttonHeight = 50;
    const buttonWidth = this.dialogWidth / this.buttons.length;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const btnX = dialogX + i * buttonWidth;
      const btnY = dialogY + this.dialogHeight - buttonHeight;
      
      // Stocker la position du bouton
      this.buttonRects.push({
        x: btnX,
        y: btnY,
        width: buttonWidth,
        height: buttonHeight
      });
      
      // Style du bouton
      const isPrimary = i === this.buttons.length - 1; // Dernier bouton = primaire
      ctx.fillStyle = isPrimary ? '#007AFF' : '#8E8E93';
      ctx.font = 'bold 17px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Effet hover
      if (this.framework.hoveredComponent === this && this.isPointInButton(i, this.lastX, this.lastY)) {
        ctx.globalAlpha = this.opacity * 0.8;
      }
      
      // Effet pressé
      if (this.pressedButtonIndex === i) {
        ctx.globalAlpha = this.opacity * 0.6;
      }
      
      ctx.fillText(this.buttons[i], btnX + buttonWidth / 2, btnY + buttonHeight / 2);
      ctx.globalAlpha = this.opacity;
      
      // Divider entre boutons (sauf pour le dernier)
      if (i < this.buttons.length - 1) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(btnX + buttonWidth, btnY);
        ctx.lineTo(btnX + buttonWidth, btnY + buttonHeight);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans un rectangle
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @param {Object} rect - Rectangle {x, y, width, height}
   * @returns {boolean} True si le point est dans le rectangle
   * @private
   */
  isPointInRect(x, y, rect) {
    return x >= rect.x && 
           x <= rect.x + rect.width && 
           y >= rect.y && 
           y <= rect.y + rect.height;
  }
  
  /**
   * Vérifie si un point est dans un bouton spécifique
   * @param {number} index - Index du bouton
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le bouton
   * @private
   */
  isPointInButton(index, x, y) {
    if (index < 0 || index >= this.buttonRects.length) return false;
    return this.isPointInRect(x, y, this.buttonRects[index]);
  }
  
  /**
   * Vérifie si un point est dans le dialog
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le dialog
   * @private
   */
  isPointInDialog(x, y) {
    const dialogX = (this.framework.width - this.dialogWidth) / 2;
    const dialogY = (this.framework.height - this.dialogHeight) / 2;
    
    return x >= dialogX && 
           x <= dialogX + this.dialogWidth && 
           y >= dialogY && 
           y <= dialogY + this.dialogHeight;
  }

  /**
   * Affiche le dialog
   */
  show() {
    this.isVisible = true;
    this.visible = true;
    
    // Réajuster la taille si nécessaire
    this.messageLines = this.wrapText(this.message, this.dialogWidth - 40, '16px -apple-system, sans-serif');
    if (this.messageLines.length > 2) {
      this.dialogHeight = 150 + (this.messageLines.length - 2) * 20;
    }
    
    // Animation d'apparition
    const fadeIn = () => {
      this.opacity += 0.1;
      if (this.opacity < 1) {
        requestAnimationFrame(fadeIn);
      }
    };
    fadeIn();
  }

  /**
   * Cache le dialog
   */
  hide() {
    const fadeOut = () => {
      this.opacity -= 0.1;
      if (this.opacity > 0) {
        requestAnimationFrame(fadeOut);
      } else {
        this.isVisible = false;
        this.visible = false;
        this.framework.remove(this);
      }
    };
    fadeOut();
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    // Stocker les dernières coordonnées pour le hover
    this.lastX = x;
    this.lastY = y;
    
    // Vérifier si un bouton a été cliqué
    for (let i = 0; i < this.buttonRects.length; i++) {
      if (this.isPointInButton(i, x, y)) {
        // Effet visuel du bouton pressé
        this.pressedButtonIndex = i;
        
        // Appeler le callback après un court délai pour l'effet visuel
        setTimeout(() => {
          if (this.onButtonClick) {
            this.onButtonClick(i, this.buttons[i]);
          }
          this.hide();
        }, 150);
        return;
      }
    }
    
    // Si on clique en dehors de la boîte de dialogue, fermer
    if (!this.isPointInDialog(x, y)) {
      this.hide();
    }
  }
  
  /**
   * Gère le mouvement (hover)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handleMove(x, y) {
    // Stocker pour le hover effect
    this.lastX = x;
    this.lastY = y;
    
    // Mettre à jour le hoveredComponent
    if (this.isPointInDialog(x, y)) {
      this.framework.hoveredComponent = this;
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
   * Vérifie si un point est dans les limites
   * @returns {boolean} True si visible (capture tous les clics)
   */
  isPointInside() {
    // Le dialog capture tous les clics quand il est visible
    return this.isVisible;
  }
}

export default Dialog;