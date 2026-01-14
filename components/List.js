import Component from '../core/Component.js';
import ListItem from '../components/ListItem.js';

/**
 * Conteneur pour les éléments de liste (ListItems) avec défilement automatique
 * @class
 * @extends Component
 */
class List extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    /** @type {ListItem[]} */
    this.items = [];
    /** @type {number} */
    this.itemHeight = options.itemHeight || 56;
    /** @type {Function|undefined} */
    this.onItemClick = options.onItemClick;
    /** @type {number} */
    this.y = options.y || 0;
  }
  
  /**
   * Ajoute un item à la liste
   * @param {Object|Component} itemOptions - Options pour l'item OU instance de Component (ex: SwipeableListItem)
   * @returns {ListItem|Component} L'item créé ou passé
   */
  addItem(itemOptions) {
    let item;
    
    // 🔹 Vérifier si c'est déjà un composant instancié (SwipeableListItem)
    if (itemOptions instanceof Component) {
      item = itemOptions;
      
      // 🔹 CRITIQUE : Définir la position et taille de l'item
      item.x = this.x;
      item.y = this.y + (this.items.length * this.itemHeight);
      item.width = this.width;
      item.height = this.itemHeight;
      
      console.log(`📦 SwipeableListItem positionné à y=${item.y}`);
    } else {
      // Créer un ListItem standard
      item = new ListItem(this.framework, {
        ...itemOptions,
        x: this.x,
        y: this.y + (this.items.length * this.itemHeight),
        width: this.width,
        height: this.itemHeight,
        onClick: () => {
          if (this.onItemClick) {
            this.onItemClick(this.items.length, itemOptions);
          }
          if (itemOptions.onClick) {
            itemOptions.onClick();
          }
        }
      });
    }
    
    this.items.push(item);
    this.framework.add(item);
    this.height = this.items.length * this.itemHeight;
    
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