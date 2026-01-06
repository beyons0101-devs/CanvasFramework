import Component from '../core/Component.js';
/**
 * Barre de navigation inférieure
 * @class
 * @extends Component
 * @property {Array} items - Items de navigation
 * @property {number} selectedIndex - Index sélectionné
 * @property {Function} onChange - Callback au changement
 * @property {string} platform - Plateforme
 * @property {string} bgColor - Couleur de fond
 * @property {string} selectedColor - Couleur sélectionnée
 * @property {string} unselectedColor - Couleur non sélectionnée
 */
class BottomNavigationBar extends Component {
  /**
   * Crée une instance de BottomNavigationBar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.items=[]] - Items [{icon, label}]
   * @param {number} [options.selectedIndex=0] - Index sélectionné
   * @param {Function} [options.onChange] - Callback au changement
   * @param {number} [options.height] - Hauteur (auto selon platform)
   * @param {string} [options.bgColor] - Couleur de fond (auto selon platform)
   * @param {string} [options.selectedColor] - Couleur sélectionnée (auto selon platform)
   * @param {string} [options.unselectedColor='#757575'] - Couleur non sélectionnée
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: framework.height - (options.height || 56),
      width: framework.width,
      height: options.height || 56,
      ...options
    });
    this.items = options.items || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.selectedColor = options.selectedColor || (framework.platform === 'material' ? '#6200EE' : '#007AFF');
    this.unselectedColor = options.unselectedColor || '#757575';
    
    // IMPORTANT: Définir onPress pour que le framework l'appelle
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Dessine la barre de navigation
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre/bordure supérieure
    if (this.platform === 'material') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = -2;
    } else {
      ctx.strokeStyle = '#C6C6C8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y);
      ctx.stroke();
    }
    
    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.shadowColor = 'transparent';
    
    // Items
    const itemWidth = this.width / this.items.length;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const itemX = this.x + i * itemWidth;
      const isSelected = i === this.selectedIndex;
      const color = isSelected ? this.selectedColor : this.unselectedColor;
      
      // Icône
      this.drawIcon(ctx, item.icon, itemX + itemWidth / 2, this.y + 16, color);
      
      // Label
      ctx.fillStyle = color;
      ctx.font = `${isSelected ? 'bold ' : ''}12px -apple-system, Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(item.label, itemX + itemWidth / 2, this.y + 36);
    }
    
    ctx.restore();
  }

  /**
   * Dessine une icône
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {string} icon - Type d'icône
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {string} color - Couleur
   * @private
   */
  drawIcon(ctx, icon, x, y, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch(icon) {
      case 'home':
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10, y + 8);
        ctx.lineTo(x - 10, y + 16);
        ctx.lineTo(x + 10, y + 16);
        ctx.lineTo(x + 10, y + 8);
        ctx.closePath();
        ctx.stroke();
        break;
      
      case 'search':
        ctx.beginPath();
        ctx.arc(x - 2, y + 4, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 9);
        ctx.lineTo(x + 8, y + 14);
        ctx.stroke();
        break;
      
      case 'favorite':
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + 6, y + 14);
        ctx.lineTo(x - 6, y + 14);
        ctx.closePath();
        ctx.beginPath();
        ctx.moveTo(x, y + 14);
        ctx.lineTo(x + 10, y + 6);
        ctx.lineTo(x + 4, y + 6);
        ctx.lineTo(x, y);
        ctx.lineTo(x - 4, y + 6);
        ctx.lineTo(x - 10, y + 6);
        ctx.closePath();
        ctx.fill();
        break;
      
      case 'person':
        ctx.beginPath();
        ctx.arc(x, y + 4, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y + 16, 8, Math.PI, 0, true);
        ctx.stroke();
        break;
      
      case 'settings':
        ctx.beginPath();
        ctx.arc(x, y + 8, 4, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI / 2) - Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * 6, y + 8 + Math.sin(angle) * 6);
          ctx.lineTo(x + Math.cos(angle) * 10, y + 8 + Math.sin(angle) * 10);
          ctx.stroke();
        }
        break;
    }
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans la barre
   */
  isPointInside(x, y) {
     return y >= this.y && y <= this.y + this.height;
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    // Calculer quel item a été cliqué
    const itemWidth = this.width / this.items.length;
    const index = Math.floor(x / itemWidth);
    
    if (index >= 0 && index < this.items.length && index !== this.selectedIndex) {
      this.selectedIndex = index;
      if (this.onChange) {
        this.onChange(index, this.items[index]);
      }
    }
  }
}

export default BottomNavigationBar;