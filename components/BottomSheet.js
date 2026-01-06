import Component from '../core/Component.js';
/**
 * Composant BottomSheet (feuille modale depuis le bas) avec drag & drop
 * @class
 * @extends Component
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {number} [options.height=framework.height * 0.6] - Hauteur du bottom sheet
 * @param {boolean} [options.dragHandle=true] - Afficher la poignée de drag
 * @param {boolean} [options.closeOnOverlayClick=true] - Fermer au clic sur l'overlay
 * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
 * @param {number} [options.borderRadius=16] - Rayon des coins arrondis
 * @example
 * const bottomSheet = new BottomSheet(framework, {
 *   height: 400,
 *   bgColor: '#F5F5F5',
 *   borderRadius: 20
 * });
 */
class BottomSheet extends Component {
  /**
   * @constructs BottomSheet
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: framework.height,
      width: framework.width,
      height: options.height || framework.height * 0.6,
      visible: false
    });
    
    /** @type {Component[]} */
    this.children = [];
    /** @type {boolean} */
    this.dragHandle = options.dragHandle !== false;
    /** @type {boolean} */
    this.closeOnOverlayClick = options.closeOnOverlayClick !== false;
    /** @type {string} */
    this.bgColor = options.bgColor || '#FFFFFF';
    /** @type {number} */
    this.borderRadius = options.borderRadius || 16;
    /** @type {number} */
    this.targetY = framework.height;
    /** @type {boolean} */
    this.isOpen = false;
    /** @type {boolean} */
    this.animating = false;
    /** @type {boolean} */
    this.dragging = false;
    /** @type {number} */
    this.dragStartY = 0;
    /** @type {number} */
    this.dragOffset = 0;
    /** @type {number} */
    this.overlayOpacity = 0;
    
    // IMPORTANT: Supprimer les bindings ici et les gérer différemment
    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onRelease = this.handleRelease.bind(this);
    
    // Pour suivre le dernier clic
    /** @type {number} */
    this.lastClickTime = 0;
  }
  
  /**
   * Ajoute un enfant au bottom sheet
   * @param {Component} child - Composant enfant à ajouter
   * @returns {Component} L'enfant ajouté
   */
  add(child) {
    this.children.push(child);
    return child;
  }
  
  /**
   * Ouvre le bottom sheet avec animation
   */
  open() {
    this.visible = true;
    this.isOpen = true;
    this.targetY = this.framework.height - this.height;
    this.animate();
  }
  
  /**
   * Ferme le bottom sheet avec animation
   */
  close() {
    this.isOpen = false;
    this.targetY = this.framework.height;
    this.animate(() => {
      this.visible = false;
    });
  }
  
  /**
   * Anime le bottom sheet vers sa position cible
   * @param {Function} [callback] - Callback appelé à la fin de l'animation
   * @private
   */
  animate(callback) {
    if (this.animating) return;
    this.animating = true;
    
    const step = () => {
      const diff = this.targetY - this.y;
      
      if (Math.abs(diff) < 1) {
        this.y = this.targetY;
        this.overlayOpacity = this.isOpen ? 0.5 : 0;
        this.animating = false;
        if (callback) callback();
        return;
      }
      
      this.y += diff * 0.2;
      
      // Animer l'opacité de l'overlay
      const progress = 1 - ((this.y - (this.framework.height - this.height)) / this.height);
      this.overlayOpacity = Math.max(0, Math.min(0.5, progress * 0.5));
      
      requestAnimationFrame(step);
    };
    
    step();
  }
  
  /**
   * Gère le clic/touch sur le bottom sheet
   * @param {number} x - Position X du clic
   * @param {number} y - Position Y du clic
   */
  handlePress(x, y) {
    // Empêcher les doubles clics rapides
    const now = Date.now();
    if (now - this.lastClickTime < 300) return;
    this.lastClickTime = now;
    
    // Calculer les coordonnées dans le sheet (sans scrollOffset car le sheet est fixe)
    const adjustedY = y; // Pas d'ajustement de scroll pour le BottomSheet
    
    // Clic sur l'overlay (zone sombre)
    if (adjustedY < this.y && this.closeOnOverlayClick) {
      this.close();
      return;
    }
    
    // Début du drag sur la poignée
    if (this.dragHandle && adjustedY >= this.y && adjustedY <= this.y + 40) {
      this.dragging = true;
      this.dragStartY = adjustedY;
      this.dragOffset = 0;
      this.framework.activeComponent = this;
      return;
    }
    
    // Vérifier les clics sur les enfants
    const contentY = this.y + (this.dragHandle ? 40 : 16);
    
    // Parcourir les enfants dans l'ordre inverse (du dernier au premier)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      
      if (!child.visible) continue;
      
      // Calculer les coordonnées absolues de l'enfant
      const childAbsX = this.x + 16 + child.x;
      const childAbsY = contentY + child.y;
      
      // Vérifier si le clic est dans l'enfant
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
          // Calculer les coordonnées relatives pour l'enfant
          const relativeX = x - childAbsX;
          const relativeY = adjustedY - childAbsY;
          child.onPress(relativeX, relativeY);
          return;
        }
        
        // Marquer l'enfant comme pressé pour l'effet visuel
        child.pressed = true;
        
        // Si c'est un bouton, déclencher son onClick après un délai
        if (child instanceof Button || child instanceof FAB) {
          setTimeout(() => {
            if (child.onClick) child.onClick();
            child.pressed = false;
          }, 150);
        }
        return;
      }
    }
  }
  
  /**
   * Gère le déplacement pendant le drag
   * @param {number} x - Position X actuelle
   * @param {number} y - Position Y actuelle
   */
  handleMove(x, y) {
    if (this.dragging) {
      const adjustedY = y; // Pas d'ajustement de scroll
      this.dragOffset = adjustedY - this.dragStartY;
      
      // Limiter le drag vers le haut
      const newY = (this.framework.height - this.height) + this.dragOffset;
      if (newY >= this.framework.height - this.height) {
        this.y = newY;
        
        // Mettre à jour l'opacité de l'overlay
        const progress = 1 - ((this.y - (this.framework.height - this.height)) / this.height);
        this.overlayOpacity = Math.max(0, Math.min(0.5, progress * 0.5));
      }
    }
  }
  
  /**
   * Gère le relâchement après un drag
   * @param {number} x - Position X du relâchement
   * @param {number} y - Position Y du relâchement
   */
  handleRelease(x, y) {
    if (this.dragging) {
      this.dragging = false;
      this.framework.activeComponent = null;
      
      // Si on a dragué plus de 30% vers le bas, fermer
      if (this.dragOffset > this.height * 0.3) {
        this.close();
      } else {
        // Sinon, revenir à la position ouverte
        this.targetY = this.framework.height - this.height;
        this.animate();
      }
    }
    
    // Réinitialiser l'état pressed pour tous les enfants
    for (let child of this.children) {
      child.pressed = false;
    }
  }
  
  /**
   * Dessine le bottom sheet
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    
    // Overlay sombre
    ctx.fillStyle = `rgba(0, 0, 0, ${this.overlayOpacity})`;
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    // BottomSheet
    ctx.fillStyle = this.bgColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = -5;
    
    ctx.beginPath();
    this.roundRectTop(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Drag Handle
    if (this.dragHandle) {
      ctx.fillStyle = '#CCCCCC';
      ctx.beginPath();
      this.roundRect(ctx, this.width / 2 - 20, this.y + 12, 40, 4, 2);
      ctx.fill();
    }
    
    // Contenu (avec clipping)
    const contentY = this.y + (this.dragHandle ? 40 : 16);
    const contentHeight = this.height - (this.dragHandle ? 40 : 16);
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, contentY, this.width, contentHeight);
    ctx.clip();
    
    // Dessiner les enfants
    for (let child of this.children) {
      if (child.visible) {
        const originalX = child.x;
        const originalY = child.y;
        
        child.x = this.x + 16 + originalX;
        child.y = contentY + originalY;
        
        child.draw(ctx);
        
        child.x = originalX;
        child.y = originalY;
      }
    }
    
    ctx.restore();
    ctx.restore();
  }
  
  /**
   * Dessine un rectangle avec seulement les coins supérieurs arrondis
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} width - Largeur
   * @param {number} height - Hauteur
   * @param {number} radius - Rayon des coins
   * @private
   */
  roundRectTop(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  
  /**
   * Dessine un rectangle avec des coins arrondis
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
   * Vérifie si un point est à l'intérieur du composant
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @returns {boolean} Toujours true si visible (le composant occupe tout l'écran)
   */
  isPointInside(x, y) {
    return this.visible;
  }
}

export default BottomSheet;