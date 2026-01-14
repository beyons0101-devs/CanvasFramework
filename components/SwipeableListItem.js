import Component from '../core/Component.js';

/**
 * Élément de liste avec support swipe et actions
 * @class
 * @extends Component
 */
class SwipeableListItem extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.title = options.title || '';
    this.subtitle = options.subtitle || '';
    this.height = options.height || (this.subtitle ? 72 : 56);
    this.width = options.width || framework.width;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.platform = framework.platform;

    this.leftActions = options.leftActions || [];
    this.rightActions = options.rightActions || [];

    this.dragOffset = 0;
    this.dragging = false;
    this.startX = 0;
    this.startY = 0;
    this.hasMoved = false;

    this.ripples = [];
    this.animationFrame = null;
    this.lastAnimationTime = 0;

    // 🔹 Binding des handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    console.log('🏗️ SwipeableListItem créé', {
      hasCanvas: !!this.framework.canvas,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    });

    // 🔹 Enregistrer les événements
    this.setupEventListeners();
  }

  /**
   * Configure les écouteurs d'événements
   * @private
   */
  setupEventListeners() {
    if (!this.framework.canvas) {
      console.error('❌ Pas de canvas trouvé dans le framework');
      return;
    }

    const canvas = this.framework.canvas;
    console.log('📡 Configuration des événements sur le canvas');

    // Événements souris
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);

    // Événements tactiles
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd);

    console.log('✅ Événements configurés');
  }

  /**
   * Nettoyer les événements lors de la destruction
   */
  destroy() {
    if (this.framework.canvas) {
      const canvas = this.framework.canvas;
      canvas.removeEventListener('mousedown', this.handleMouseDown);
      canvas.removeEventListener('mousemove', this.handleMouseMove);
      canvas.removeEventListener('mouseup', this.handleMouseUp);
      canvas.removeEventListener('touchstart', this.handleTouchStart);
      canvas.removeEventListener('touchmove', this.handleTouchMove);
      canvas.removeEventListener('touchend', this.handleTouchEnd);
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (super.destroy) {
      super.destroy();
    }
  }

  /**
   * Obtenir les coordonnées depuis un événement
   * @private
   */
  getCoordinates(event) {
    const rect = this.framework.canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  /**
   * Handler mousedown
   * @private
   */
  handleMouseDown(event) {
    const coords = this.getCoordinates(event);
    console.log('🖱️ MouseDown', coords, 'isInside:', this.isPointInside(coords.x, coords.y));
    this.onDragStart(coords.x, coords.y);
  }

  /**
   * Handler mousemove
   * @private
   */
  handleMouseMove(event) {
    if (!this.dragging) return;
    const coords = this.getCoordinates(event);
    console.log('🖱️ MouseMove', coords, 'dragging:', this.dragging);
    this.onDragMove(coords.x, coords.y);
    this.requestRender();
  }

  /**
   * Handler mouseup
   * @private
   */
  handleMouseUp(event) {
    if (!this.dragging) return;
    console.log('🖱️ MouseUp');
    this.onDragEnd();
    this.requestRender();
  }

  /**
   * Handler touchstart
   * @private
   */
  handleTouchStart(event) {
    const coords = this.getCoordinates(event);
    console.log('👆 TouchStart', coords, 'isInside:', this.isPointInside(coords.x, coords.y));
    if (this.isPointInside(coords.x, coords.y)) {
      event.preventDefault();
      this.onDragStart(coords.x, coords.y);
    }
  }

  /**
   * Handler touchmove
   * @private
   */
  handleTouchMove(event) {
    if (!this.dragging) return;
    event.preventDefault();
    const coords = this.getCoordinates(event);
    console.log('👆 TouchMove', coords);
    this.onDragMove(coords.x, coords.y);
    this.requestRender();
  }

  /**
   * Handler touchend
   * @private
   */
  handleTouchEnd(event) {
    if (!this.dragging) return;
    event.preventDefault();
    console.log('👆 TouchEnd');
    this.onDragEnd();
    this.requestRender();
  }

  /**
   * Demander un redessin
   * @private
   */
  requestRender() {
    if (this.framework && this.framework.requestRender) {
      this.framework.requestRender();
    }
  }

  /**
   * Début du swipe
   * @param {number} x
   * @param {number} y
   */
  onDragStart(x, y) {
    const inside = this.isPointInside(x, y);
    console.log('🟢 onDragStart', { x, y, inside, bounds: { x: this.x, y: this.y, w: this.width, h: this.height } });
    
    if (inside) {
      this.dragging = true;
      this.startX = x;
      this.startY = y;
      this.hasMoved = false;
      console.log('✅ Swipe démarré');
    } else {
      console.log('❌ Point en dehors des limites');
    }
  }

  /**
   * Déplacement pendant swipe
   * @param {number} x
   * @param {number} y
   */
  onDragMove(x, y) {
    if (this.dragging) {
      const deltaX = x - this.startX;
      const deltaY = Math.abs(y - this.startY);

      console.log('🔄 onDragMove', { deltaX, deltaY, hasMoved: this.hasMoved });

      // Swipe horizontal seulement si déplacement > 5px
      if (Math.abs(deltaX) > 5 || this.hasMoved) {
        this.hasMoved = true;
        this.dragOffset = deltaX;

        // Limiter le déplacement
        const maxOffset = Math.max(
          this.leftActions.length * 80,
          this.rightActions.length * 80
        );
        this.dragOffset = Math.min(Math.max(this.dragOffset, -maxOffset), maxOffset);

        console.log('↔️ Offset mis à jour:', this.dragOffset);
      }
    }
  }

  /**
   * Fin du swipe
   */
  onDragEnd() {
    if (this.dragging) {
      console.log('🔴 onDragEnd', { offset: this.dragOffset, hasMoved: this.hasMoved });

      if (this.hasMoved) {
        if (this.dragOffset > 80 && this.leftActions[0]) {
          console.log('✅ Action gauche déclenchée');
          this.leftActions[0].onClick?.();
        } else if (this.dragOffset < -80 && this.rightActions[0]) {
          console.log('✅ Action droite déclenchée');
          this.rightActions[0].onClick?.();
        }
      }

      this.dragOffset = 0;
      this.dragging = false;
      this.hasMoved = false;
    }
  }

  /**
   * Dessine l'item
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();

    // Actions swipe (arrière-plan)
    if (this.dragOffset > 0 && this.leftActions[0]) {
      ctx.fillStyle = this.leftActions[0].color || '#388E3C';
      ctx.fillRect(this.x, this.y, this.dragOffset, this.height);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.leftActions[0].text, this.x + this.dragOffset / 2, this.y + this.height / 2);
    } else if (this.dragOffset < 0 && this.rightActions[0]) {
      const offset = -this.dragOffset;
      ctx.fillStyle = this.rightActions[0].color || '#D32F2F';
      ctx.fillRect(this.x + this.width - offset, this.y, offset, this.height);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.rightActions[0].text, this.x + this.width - offset / 2, this.y + this.height / 2);
    }

    // Déplacement du contenu principal
    ctx.translate(this.dragOffset, 0);

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Texte principal
    ctx.fillStyle = '#000';
    ctx.font = '16px -apple-system, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = this.subtitle ? 'top' : 'middle';
    const titleY = this.subtitle ? this.y + 16 : this.y + this.height / 2;
    ctx.fillText(this.title, this.x + 16, titleY);

    // Sous-titre
    if (this.subtitle) {
      ctx.fillStyle = '#757575';
      ctx.font = '14px -apple-system, Roboto, sans-serif';
      ctx.fillText(this.subtitle, this.x + 16, this.y + 38);
    }

    // Bordure inférieure
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.stroke();

    ctx.restore();
  }

 isPointInside(x, y) {
  const inside = x >= this.x && x <= this.x + this.width &&
                 y >= this.y && y <= this.y + this.height;
  
  console.log('🎯 isPointInside check', {
    point: { x, y },
    bounds: { x: this.x, y: this.y, width: this.width, height: this.height },
    inside
  });
  
  return inside;
}
}

export default SwipeableListItem;