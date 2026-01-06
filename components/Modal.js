import Component from '../core/Component.js';
/**
 * Fenêtre modale
 * @class
 * @extends Component
 * @property {string} title - Titre
 * @property {Component[]} children - Enfants
 * @property {number} padding - Padding interne
 * @property {string} bgColor - Couleur de fond
 * @property {string} overlayColor - Couleur de l'overlay
 * @property {number} borderRadius - Rayon des coins
 * @property {string} shadowColor - Couleur de l'ombre
 * @property {boolean} showCloseButton - Afficher le bouton fermer
 * @property {boolean} closeOnOverlayClick - Fermer au clic sur l'overlay
 * @property {number} modalWidth - Largeur du modal
 * @property {number} modalHeight - Hauteur du modal
 * @property {number} opacity - Opacité
 * @property {number} scale - Échelle (animation)
 * @property {boolean} isVisible - Visibilité
 * @property {boolean} animating - En cours d'animation
 * @property {number} closeButtonSize - Taille du bouton fermer
 * @property {Object|null} closeButtonRect - Rectangle du bouton fermer
 */
class Modal extends Component {
  /**
   * Crée une instance de Modal
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title=''] - Titre
   * @param {number} [options.width] - Largeur (auto selon framework)
   * @param {number} [options.height] - Hauteur
   * @param {number} [options.padding=20] - Padding interne
   * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
   * @param {string} [options.overlayColor='rgba(0,0,0,0.7)'] - Couleur overlay
   * @param {number} [options.borderRadius=12] - Rayon des coins
   * @param {string} [options.shadowColor='rgba(0,0,0,0.3)'] - Couleur ombre
   * @param {boolean} [options.showCloseButton=true] - Afficher bouton fermer
   * @param {boolean} [options.closeOnOverlayClick=true] - Fermer sur clic overlay
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: framework.height,
      visible: false,
      ...options
    });
    
    this.title = options.title || '';
    this.children = []; // Composants enfants
    this.padding = options.padding || 20;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.overlayColor = options.overlayColor || 'rgba(0, 0, 0, 0.7)';
    this.borderRadius = options.borderRadius || 12;
    this.shadowColor = options.shadowColor || 'rgba(0, 0, 0, 0.3)';
    this.showCloseButton = options.showCloseButton !== false;
    this.closeOnOverlayClick = options.closeOnOverlayClick !== false;
    
    // Dimensions
    this.modalWidth = options.width || Math.min(400, framework.width - 40);
    this.modalHeight = options.height || 300;
    
    // Animation
    this.opacity = 0;
    this.scale = 0.8;
    this.isVisible = false;
    this.animating = false;
    
    // Bouton de fermeture
    this.closeButtonSize = 30;
    this.closeButtonRect = null;
    
    // Définir onPress pour la fermeture
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Ajoute un enfant au modal
   * @param {Component} child - Composant enfant
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    this.children.push(child);
    return child;
  }

  /**
   * Affiche le modal
   */
  show() {
    this.isVisible = true;
    this.visible = true;
    this.animateIn();
  }

  /**
   * Cache le modal
   */
  hide() {
    this.animateOut();
  }

  /**
   * Anime l'entrée
   * @private
   */
  animateIn() {
    if (this.animating) return;
    this.animating = true;
    
    const animate = () => {
      this.opacity += 0.1;
      this.scale += 0.04;
      
      if (this.opacity >= 1) {
        this.opacity = 1;
        this.scale = 1;
        this.animating = false;
        return;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Anime la sortie
   * @private
   */
  animateOut() {
    if (this.animating) return;
    this.animating = true;
    
    const animate = () => {
      this.opacity -= 0.1;
      this.scale -= 0.04;
      
      if (this.opacity <= 0) {
        this.opacity = 0;
        this.scale = 0.8;
        this.isVisible = false;
        this.visible = false;
        this.animating = false;
        this.framework.remove(this);
        return;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Dessine le modal
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.isVisible || this.opacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Overlay
    ctx.fillStyle = this.overlayColor;
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    // Calculer la position du modal
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    
    // Appliquer l'animation de scale
    ctx.translate(modalX + this.modalWidth / 2, modalY + this.modalHeight / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-modalX - this.modalWidth / 2, -modalY - this.modalHeight / 2);
    
    // Fond du modal
    ctx.fillStyle = this.bgColor;
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    ctx.beginPath();
    this.roundRect(ctx, modalX, modalY, this.modalWidth, this.modalHeight, this.borderRadius);
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
    
    // Bouton de fermeture
    if (this.showCloseButton) {
      const closeX = modalX + this.modalWidth - this.closeButtonSize - 10;
      const closeY = modalY + 10;
      
      this.closeButtonRect = {
        x: closeX,
        y: closeY,
        width: this.closeButtonSize,
        height: this.closeButtonSize
      };
      
      // Cercle du bouton
      ctx.fillStyle = '#F0F0F0';
      ctx.beginPath();
      ctx.arc(closeX + this.closeButtonSize/2, closeY + this.closeButtonSize/2, 
              this.closeButtonSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Croix (X)
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(closeX + 8, closeY + 8);
      ctx.lineTo(closeX + this.closeButtonSize - 8, closeY + this.closeButtonSize - 8);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(closeX + this.closeButtonSize - 8, closeY + 8);
      ctx.lineTo(closeX + 8, closeY + this.closeButtonSize - 8);
      ctx.stroke();
    }
    
    // Zone de contenu (clipping)
    const contentX = modalX + this.padding;
    const contentY = modalY + (this.title ? 50 : this.padding);
    const contentWidth = this.modalWidth - (this.padding * 2);
    const contentHeight = this.modalHeight - contentY + modalY - this.padding;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentWidth, contentHeight);
    ctx.clip();
    
    // Dessiner les enfants
    for (let child of this.children) {
      if (child.visible) {
        // Sauvegarder les coordonnées originales
        const originalX = child.x;
        const originalY = child.y;
        
        // Ajuster pour la position du modal
        child.x = contentX + originalX;
        child.y = contentY + originalY;
        
        child.draw(ctx);
        
        // Restaurer les coordonnées
        child.x = originalX;
        child.y = originalY;
      }
    }
    
    ctx.restore();
    
    ctx.restore();
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    
    // Vérifier le bouton de fermeture
    if (this.showCloseButton && this.closeButtonRect) {
      if (adjustedY >= this.closeButtonRect.y && 
          adjustedY <= this.closeButtonRect.y + this.closeButtonRect.height &&
          x >= this.closeButtonRect.x && 
          x <= this.closeButtonRect.x + this.closeButtonRect.width) {
        this.hide();
        return;
      }
    }
    
    // Vérifier si on clique en dehors du modal (overlay)
    if (this.closeOnOverlayClick) {
      const isInModal = x >= modalX && x <= modalX + this.modalWidth &&
                       adjustedY >= modalY && adjustedY <= modalY + this.modalHeight;
      
      if (!isInModal) {
        this.hide();
        return;
      }
    }
    
    // Vérifier les clics sur les enfants
    const contentX = modalX + this.padding;
    const contentY = modalY + (this.title ? 50 : this.padding);
    
    for (let child of this.children) {
      const childAbsX = contentX + child.x;
      const childAbsY = contentY + child.y;
      
      if (adjustedY >= childAbsY && 
          adjustedY <= childAbsY + child.height &&
          x >= childAbsX && 
          x <= childAbsX + child.width) {
        
        // Si l'enfant a un onClick, le déclencher
        if (child.onClick) {
          child.onClick();
          return;
        }
        
        // Si l'enfant a un onPress, le déclencher
        if (child.onPress) {
          child.onPress(x - childAbsX, adjustedY - childAbsY);
          return;
        }
      }
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
   * @returns {boolean} True si visible
   */
  isPointInside(x, y) {
    return this.isVisible;
  }
}

export default Modal;