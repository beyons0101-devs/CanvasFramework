import Component from '../core/Component.js';

/**
 * Tiroir latéral (navigation)
 * @class
 * @extends Component
 * @property {number} targetX - Position X cible
 * @property {Array} items - Items du drawer
 * @property {Object|null} header - En-tête
 * @property {Function} onItemClick - Callback au clic sur item
 * @property {string} platform - Plateforme
 * @property {boolean} animating - En cours d'animation
 * @property {number} hoveredIndex - Index survolé
 */
class Drawer extends Component {
  /**
   * Crée une instance de Drawer
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.items=[]] - Items [{label, icon, divider}]
   * @param {Object} [options.header] - En-tête {title}
   * @param {Function} [options.onItemClick] - Callback au clic sur item
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: -framework.width * 0.8,
      y: 0,
      width: framework.width * 0.8,
      height: framework.height,
      visible: false,
      ...options
    });
    this.targetX = -this.width;
    this.items = options.items || [];
    this.header = options.header || null;
    this.onItemClick = options.onItemClick;
    this.platform = framework.platform;
    this.animating = false;
    this.hoveredIndex = -1;
    
    // Bind des méthodes
    this.handlePress = this.handlePress.bind(this);
    this.handleMove = this.handleMove.bind(this);
    
    // IMPORTANT: Définir les callbacks
    this.onPress = this.handlePress;
    this.onMove = this.handleMove;
	// ✅ Se mettre automatiquement au-dessus de tous les composants
	this.bringToFront();
  }
  
  /**
  * Met le drawer au-dessus de tous les composants
  * @private
  */
  bringToFront() {
    const index = this.framework.components.indexOf(this);
    if (index > -1) {
      this.framework.components.splice(index, 1);
      this.framework.components.push(this);
    }
  }

  /**
   * Ouvre le drawer
   */
  open() {
	this.bringToFront(); // ✅ Se remettre au-dessus à chaque ouverture
    this.visible = true;
    this.targetX = 0;
    this.animate();
  }

  /**
   * Ferme le drawer
   */
  close() {
    this.targetX = -this.width;
    this.animate();
  }

  /**
   * Anime le drawer
   * @private
   */
  animate() {
    if (this.animating) return;
    this.animating = true;
    
    const step = () => {
      const diff = this.targetX - this.x;
      if (Math.abs(diff) < 1) {
        this.x = this.targetX;
        this.animating = false;
        if (this.targetX < 0) {
          this.visible = false;
        }
        return;
      }
      this.x += diff * 0.2;
      requestAnimationFrame(step);
    };
    step();
  }

  /**
   * Vérifie dans quelle zone se trouve un point
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {string|null} Zone ('overlay', 'item', 'drawer', null si en dehors)
   * @private
   */
  getZoneAtPoint(x, y) {
    if (!this.visible) return null;
    
    // Vérifier si le point est dans l'overlay (toute la zone de l'écran)
    // Mais on ne veut pas capturer les clics sur le drawer lui-même pour les items
    if (x >= this.x && x <= this.x + this.width) {
      // Le point est dans le drawer
      const startY = this.header ? 150 : 0;
      const index = Math.floor((y - startY) / 56);
      if (index >= 0 && index < this.items.length) {
        const itemY = startY + index * 56;
        if (y >= itemY && y <= itemY + 56) {
          return 'item';
        }
      }
      return 'drawer';
    }
    
    // Le point est dans l'overlay (zone sombre autour du drawer)
    return 'overlay';
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const zone = this.getZoneAtPoint(x, y);
    
    if (zone === 'overlay') {
      // Clic sur l'overlay - fermer le drawer
      this.close();
      return true; // On a géré le clic
    } else if (zone === 'item') {
      // Clic sur un item
      const startY = this.header ? 150 : 0;
      const index = Math.floor((y - startY) / 56);
      if (index >= 0 && index < this.items.length) {
        if (this.onItemClick) {
          this.onItemClick(index, this.items[index]);
        }
        this.close();
      }
      return true; // On a géré le clic
    }
    
    // Clic sur le drawer (mais pas sur un item) - on ne fait rien mais on capture le clic
    return true;
  }
  
  /**
   * Gère le mouvement (hover)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handleMove(x, y) {
    if (!this.visible) return;
    
    const zone = this.getZoneAtPoint(x, y);
    if (zone === 'item') {
      const startY = this.header ? 150 : 0;
      const index = Math.floor((y - startY) / 56);
      this.hoveredIndex = index;
    } else {
      this.hoveredIndex = -1;
    }
  }

  /**
   * Vérifie si un point est dans les limites du drawer (inclut l'overlay)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le drawer ou l'overlay
   */
  isPointInside(x, y) {
    if (!this.visible) return false;
    
    // Quand le drawer est ouvert, il capture TOUS les clics sur l'écran
    // car il a un overlay qui couvre tout
    return true;
  }

  /**
   * Dessine le drawer
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    
    // Overlay sombre avec opacité progressive
    const overlayOpacity = Math.min(0.5, (this.x + this.width) / this.width * 0.5);
    ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    // Drawer
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Ombre droite
    const gradient = ctx.createLinearGradient(this.x + this.width, 0, this.x + this.width + 10, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x + this.width, 0, 10, this.height);
    
    // Header
    if (this.header) {
      ctx.fillStyle = this.platform === 'material' ? '#6200EE' : '#F8F8F8';
      ctx.fillRect(this.x, this.y, this.width, 150);
      
      ctx.fillStyle = this.platform === 'material' ? '#FFFFFF' : '#000000';
      ctx.font = 'bold 24px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.header.title || '', this.x + 20, this.y + 130);
    }
    
    // Items
    const startY = this.header ? 150 : 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const itemY = this.y + startY + i * 56;
      
      // Hover effect
      if (this.hoveredIndex === i) {
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(this.x, itemY, this.width, 56);
      }
      
      // Icon
      if (item.icon) {
        ctx.fillStyle = '#757575';
        ctx.font = '20px -apple-system, Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, this.x + 20, itemY + 28);
      }
      
      // Label
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, Roboto, sans-serif';
      ctx.fillText(item.label, this.x + (item.icon ? 72 : 20), itemY + 28);
      
      // Divider
      if (item.divider) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, itemY + 56);
        ctx.lineTo(this.x + this.width, itemY + 56);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
}

export default Drawer;
