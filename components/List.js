import Component from '../core/Component.js';
import ListItem from '../components/ListItem.js';
/**
 * Conteneur pour les éléments de liste (ListItems) avec défilement automatique
 * @class
 * @extends Component
 * @param {Framework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {number} [options.itemHeight=56] - Hauteur de chaque item en pixels
 * @param {Function} [options.onItemClick] - Callback appelé lors du clic sur un item
 * @param {number} [options.y=0] - Position Y de départ
 * @example
 * const list = new List(framework, {
 *   itemHeight: 64,
 *   onItemClick: (index, itemOptions) => console.log('Item clicked:', index)
 * });
 */
class List extends Component {
  /**
   * @constructs List
   */
  constructor(framework, options = {}) {
    super(framework, options);
    /** @type {ListItem[]} */
    this.items = [];
    /** @type {number} */
    this.itemHeight = options.itemHeight || 56;
    /** @type {Function|undefined} */
    this.onItemClick = options.onItemClick;
    /** @type {number} */
    this.y = options.y || 0; // Position Y de départ
  }
  
  /**
   * Ajoute un item à la liste
   * @param {Object} itemOptions - Options pour l'item
   * @param {string} itemOptions.text - Texte à afficher
   * @param {Function} [itemOptions.onClick] - Callback spécifique à l'item
   * @param {Object} [itemOptions.style] - Style optionnel pour l'item
   * @returns {ListItem} L'item créé
   */
  addItem(itemOptions) {
    const item = new ListItem(this.framework, {
      ...itemOptions,
      x: this.x,
      y: this.y + (this.items.length * this.itemHeight),
      width: this.width,
      height: this.itemHeight, // IMPORTANT: définir la hauteur
      onClick: () => {
        if (this.onItemClick) {
          this.onItemClick(this.items.length, itemOptions);
        }
        if (itemOptions.onClick) {
          itemOptions.onClick();
        }
      }
    });
    
    this.items.push(item);
    this.framework.add(item); // Ajouter chaque item au framework
    this.height = this.items.length * this.itemHeight; // Mettre à jour la hauteur totale
    
    return item;
  }
  
  /**
   * Vide la liste et supprime tous les items du framework
   */
  clear() {
    for (let item of this.items) {
      this.framework.remove(item);
    }
    this.items = [];
    this.height = 0;
  }
  
  /**
   * Dessine le composant (les items se dessinent eux-mêmes)
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    // Les items se dessinent eux-mêmes
  }
  
  /**
   * Vérifie si un point est à l'intérieur du composant
   * @returns {boolean} Toujours false (les ListItems gèrent leurs propres clics)
   */
  isPointInside() {
    return false; // Les ListItems gèrent leurs propres clics
  }
}

export default List;