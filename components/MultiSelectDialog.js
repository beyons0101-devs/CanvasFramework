import Modal from '../components/Modal.js';
/**
 * Modal pour la sélection multiple d'options avec checkboxes
 * @class
 * @extends Modal
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {string} [options.title='Sélectionner'] - Titre du modal
 * @param {string[]} [options.options=[]] - Liste des options
 * @param {number[]} [options.selectedIndices=[]] - Indices des options sélectionnées
 * @param {Function} [options.onSelect] - Callback lors de la validation
 * @example
 * const multiSelect = new MultiSelectDialog(framework, {
 *   title: 'Choisir vos intérêts',
 *   options: ['Sport', 'Musique', 'Lecture', 'Voyage'],
 *   selectedIndices: [0, 2],
 *   onSelect: (indices, values) => console.log('Selected:', values)
 * });
 */
class MultiSelectDialog extends Modal {
  /**
   * @constructs MultiSelectDialog
   */
  constructor(framework, options = {}) {
    const optionsCount = options.options?.length || 0;
    const itemHeight = 50;
    const dialogHeight = Math.min(400, Math.max(200, optionsCount * itemHeight + 150));
    
    super(framework, {
      title: options.title || 'Sélectionner',
      width: Math.min(350, framework.width - 40),
      height: dialogHeight,
      showCloseButton: true,
      closeOnOverlayClick: true,
      padding: 0,
      ...options
    });
    
    /** @type {string[]} */
    this.options = options.options || [];
    /** @type {number[]} */
    this.selectedIndices = options.selectedIndices || [];
    /** @type {Function|undefined} */
    this.onSelect = options.onSelect;
    /** @type {number} */
    this.itemHeight = itemHeight;
    
    /** @type {string[]} */
    this.buttons = ['Annuler', 'Valider'];
    // AJOUTER: Définir onPress pour que le framework l'appelle
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Dessine le modal de sélection multiple
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.isVisible) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    
    // Fond du modal
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    ctx.beginPath();
    this.roundRect(ctx, modalX, modalY, this.modalWidth, this.modalHeight, 12);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Titre
    if (this.title) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.title, modalX + this.modalWidth / 2, modalY + 30);
    }
    
    // Options avec checkboxes
    const contentX = modalX + 20;
    const contentY = modalY + 60;
    
    for (let i = 0; i < this.options.length; i++) {
      const optionY = contentY + i * this.itemHeight;
      const isSelected = this.selectedIndices.includes(i);
      
      // Checkbox
      ctx.strokeStyle = isSelected ? '#6200EE' : '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(contentX, optionY + 15, 20, 20);
      
      if (isSelected) {
        ctx.fillStyle = '#6200EE';
        ctx.fillRect(contentX + 4, optionY + 19, 12, 12);
      }
      
      // Texte
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.options[i], contentX + 35, optionY + 25);
    }
    
    // Boutons
    const buttonY = modalY + this.modalHeight - 60;
    const buttonWidth = (this.modalWidth - 60) / 2;
    
    // Bouton Annuler
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Annuler', modalX + buttonWidth / 2 + 10, buttonY);
    
    // Bouton Valider
    ctx.fillStyle = '#007AFF';
    ctx.fillText('Valider', modalX + this.modalWidth - buttonWidth / 2 - 10, buttonY);
    
    ctx.restore();
  }
  
  /**
   * Gère le clic dans le modal de sélection multiple
   * @param {number} x - Position X du clic
   * @param {number} y - Position Y du clic
   */
  handlePress(x, y) {
    // Coordonnées brutes pour les modals fixes
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    const contentX = modalX + 20;
    const contentY = modalY + 60;
    const buttonY = modalY + this.modalHeight - 60;
    const buttonWidth = (this.modalWidth - 60) / 2;
    
    // Vérifier les clics sur les options (coordonnées brutes)
    for (let i = 0; i < this.options.length; i++) {
      const optionY = contentY + i * this.itemHeight;
      
      if (y >= optionY && y <= optionY + this.itemHeight &&
          x >= contentX && x <= modalX + this.modalWidth - 20) {
        
        const index = this.selectedIndices.indexOf(i);
        if (index > -1) {
          this.selectedIndices.splice(index, 1);
        } else {
          this.selectedIndices.push(i);
        }
        return;
      }
    }
    
    // Bouton Annuler (coordonnées brutes)
    if (y >= buttonY - 20 && y <= buttonY + 20 &&
        x >= modalX + 10 && x <= modalX + buttonWidth + 10) {
      this.hide();
      return;
    }
    
    // Bouton Valider (coordonnées brutes)
    if (y >= buttonY - 20 && y <= buttonY + 20 &&
        x >= modalX + this.modalWidth - buttonWidth - 10 && x <= modalX + this.modalWidth - 10) {
      if (this.onSelect) {
        this.onSelect(this.selectedIndices, this.selectedIndices.map(i => this.options[i]));
      }
      this.hide();
      return;
    }
    
    // Overlay ou bouton de fermeture
    super.handlePress(x, y);
  }
  
  /**
   * Vérifie si un point est à l'intérieur du modal
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @returns {boolean} True si le point est à l'intérieur du modal
   */
  isPointInside(x, y) {
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    
    // Les modals sont des composants fixes, donc pas d'ajustement de scroll
    return x >= modalX && 
           x <= modalX + this.modalWidth && 
           y >= modalY && 
           y <= modalY + this.modalHeight;
  }
}

export default MultiSelectDialog;