import Component from '../core/Component.js';
/**
 * Onglets de navigation
 * @class
 * @extends Component
 * @property {Array} tabs - Onglets [{label, icon}]
 * @property {number} selectedIndex - Onglet sélectionné
 * @property {Function} onChange - Callback au changement
 * @property {string} platform - Plateforme
 * @property {string} indicatorColor - Couleur de l'indicateur
 * @property {string} textColor - Couleur du texte
 * @property {string} selectedTextColor - Couleur du texte sélectionné
 */
class Tabs extends Component {
  /**
   * Crée une instance de Tabs
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.tabs=[]] - Onglets
   * @param {number} [options.selectedIndex=0] - Onglet sélectionné
   * @param {Function} [options.onChange] - Callback au changement
   * @param {number} [options.height=48] - Hauteur
   * @param {string} [options.indicatorColor] - Couleur indicateur (auto selon platform)
   * @param {string} [options.textColor='#000000'] - Couleur texte
   * @param {string} [options.selectedTextColor] - Couleur texte sélectionné (auto selon indicatorColor)
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.tabs = options.tabs || []; // [{label: 'Tab 1', icon: '📱'}, ...]
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    this.height = options.height || 48;
    this.indicatorColor = options.indicatorColor || (framework.platform === 'material' ? '#6200EE' : '#007AFF');
    this.textColor = options.textColor || '#000000';
    this.selectedTextColor = options.selectedTextColor || this.indicatorColor;
    
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Dessine les onglets
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Bordure inférieure
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.stroke();
    
    const tabWidth = this.width / this.tabs.length;
    
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const tabX = this.x + i * tabWidth;
      const isSelected = i === this.selectedIndex;
      const color = isSelected ? this.selectedTextColor : this.textColor;
      
      // Icône (si présente)
      if (tab.icon) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(tab.icon, tabX + tabWidth / 2, this.y + 16);
      }
      
      // Label
      ctx.font = `${isSelected ? 'bold ' : ''}14px -apple-system, Roboto, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelY = tab.icon ? this.y + 36 : this.y + this.height / 2;
      ctx.fillText(tab.label, tabX + tabWidth / 2, labelY);
      
      // Indicateur (Material uniquement)
      if (isSelected && this.platform === 'material') {
        ctx.fillStyle = this.indicatorColor;
        ctx.fillRect(tabX, this.y + this.height - 2, tabWidth, 2);
      }
    }
    
    ctx.restore();
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const tabWidth = this.width / this.tabs.length;
    const index = Math.floor((x - this.x) / tabWidth);
    
    if (index >= 0 && index < this.tabs.length && index !== this.selectedIndex) {
      this.selectedIndex = index;
      if (this.onChange) {
        this.onChange(index, this.tabs[index]);
      }
    }
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans les onglets
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }
}

export default Tabs;