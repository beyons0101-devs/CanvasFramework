import Modal from '../components/Modal.js';
/**
 * Modal pour la sélection d'une option parmi une liste
 * @class
 * @extends Modal
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {string} [options.title='Sélectionner une option'] - Titre du modal
 * @param {string[]} [options.options=[]] - Liste des options
 * @param {number} [options.selectedIndex=0] - Index de l'option sélectionnée par défaut
 * @param {Function} [options.onSelect] - Callback lors de la sélection
 * @example
 * const dialog = new SelectDialog(framework, {
 *   title: 'Choisir une couleur',
 *   options: ['Rouge', 'Vert', 'Bleu'],
 *   selectedIndex: 1,
 *   onSelect: (index, value) => console.log('Selected:', value)
 * });
 */
class SelectDialog extends Modal {
  /**
   * @constructs SelectDialog
   */
  constructor(framework, options = {}) {
    // Calculer la hauteur en fonction du nombre d'options
    const optionsCount = options.options?.length || 0;
    const itemHeight = 50;
    const dialogHeight = Math.min(
      400, // Hauteur max
      Math.max(200, optionsCount * itemHeight + 100) // Hauteur min + espace pour titre
    );
    
    // Appeler le constructeur parent
    super(framework, {
      title: options.title || 'Sélectionner une option',
      width: Math.min(350, framework.width - 40),
      height: dialogHeight,
      showCloseButton: true,
      closeOnOverlayClick: true,
      padding: 0, // Pas de padding, on gère nous-même
      ...options
    });
    
    /** @type {string[]} */
    this.options = options.options || [];
    /** @type {number} */
    this.selectedIndex = options.selectedIndex || 0;
    /** @type {Function|undefined} */
    this.onSelect = options.onSelect;
    /** @type {number} */
    this.itemHeight = itemHeight;
    /** @type {number} */
    this.hoveredIndex = -1;
    
    // Désactiver les animations
    this.opacity = 1;
    this.scale = 1;
    this.isVisible = true;
    this.visible = true;
    
    // AJOUTER: Définir onPress et onMove pour que le framework les appelle
    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
  }
  
  /**
   * Dessine le modal de sélection
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.isVisible) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Overlay sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    // Calculer la position du modal (centré)
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
      
      // Ligne de séparation sous le titre
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(modalX, modalY + 50);
      ctx.lineTo(modalX + this.modalWidth, modalY + 50);
      ctx.stroke();
    }
    
    // Zone de contenu (avec scroll si nécessaire)
    const contentX = modalX;
    const contentY = modalY + 55; // Après le titre et la ligne
    const contentHeight = this.modalHeight - 55;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, this.modalWidth, contentHeight);
    ctx.clip();
    
    // Options
    for (let i = 0; i < this.options.length; i++) {
      const optionY = contentY + i * this.itemHeight;
      
      // Si l'option est en dehors de la zone visible, passer à la suivante
      if (optionY + this.itemHeight < contentY || optionY > contentY + contentHeight) {
        continue;
      }
      
      // Option sélectionnée
      if (i === this.selectedIndex) {
        ctx.fillStyle = this.framework.platform === 'material' ? 'rgba(98, 0, 238, 0.1)' : 'rgba(0, 122, 255, 0.1)';
        ctx.fillRect(contentX, optionY, this.modalWidth, this.itemHeight);
      }
      
      // Effet hover
      if (this.hoveredIndex === i) {
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(contentX, optionY, this.modalWidth, this.itemHeight);
      }
      
      // Texte de l'option
      ctx.fillStyle = i === this.selectedIndex ? 
        (this.framework.platform === 'material' ? '#6200EE' : '#007AFF') : 
        '#000000';
      ctx.font = i === this.selectedIndex ? 'bold 16px -apple-system, sans-serif' : '16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.options[i], contentX + 20, optionY + this.itemHeight / 2);
      
      // Divider entre les options
      if (i < this.options.length - 1) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(contentX + 20, optionY + this.itemHeight);
        ctx.lineTo(contentX + this.modalWidth - 20, optionY + this.itemHeight);
        ctx.stroke();
      }
    }
    
    ctx.restore();
    ctx.restore();
  }
  
  /**
   * Gère le clic dans le modal
   * @param {number} x - Position X du clic
   * @param {number} y - Position Y du clic
   */
  handlePress(x, y) {
    // POUR LES MODALS: utiliser les coordonnées brutes car le modal est un composant FIXE
    // Les modals ne sont pas affectés par le scroll
    
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    const contentY = modalY + 55;
    
    // Vérifier si une option a été cliquée
    for (let i = 0; i < this.options.length; i++) {
      const optionY = contentY + i * this.itemHeight;
      
      // IMPORTANT: Pas d'ajustement de scroll pour les modals
      if (y >= optionY && y <= optionY + this.itemHeight &&
          x >= modalX && x <= modalX + this.modalWidth) {
        
        this.selectedIndex = i;
        if (this.onSelect) {
          this.onSelect(i, this.options[i]);
        }
        this.hide();
        return;
      }
    }
    
    // Sinon, laisser le parent gérer (bouton de fermeture, overlay)
    super.handlePress(x, y);
  }
  
  /**
   * Gère le survol dans le modal
   * @param {number} x - Position X actuelle
   * @param {number} y - Position Y actuelle
   */
  handleMove(x, y) {
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    const contentY = modalY + 55;
    
    this.hoveredIndex = -1;
    
    // Vérifier si on survole une option
    for (let i = 0; i < this.options.length; i++) {
      const optionY = contentY + i * this.itemHeight;
      
      // IMPORTANT: Pas d'ajustement de scroll pour les modals
      if (y >= optionY && y <= optionY + this.itemHeight &&
          x >= modalX && x <= modalX + this.modalWidth) {
        this.hoveredIndex = i;
        break;
      }
    }
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
  
  /**
   * Affiche le modal
   */
  show() {
    this.isVisible = true;
    this.visible = true;
    this.opacity = 1;
    this.scale = 1;
  }
}

export default SelectDialog;