import Component from '../core/Component.js';
import ListItem from '../components/ListItem.js';

/**
 * Virtual List : optimise le rendu pour les longues listes
 * @class
 * @extends Component
 */
class VirtualList extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.allItemsData = [];        // Stocke toutes les données des items (mais pas tous les objets)
    this.visibleItems = [];        // Liste des ListItem réellement créés/dessinés
    this.itemHeight = options.itemHeight || 56;
    this.onItemClick = options.onItemClick;
    this.y = options.y || 0;

    this.viewportHeight = options.height || framework.height; // Hauteur visible
    this.scrollOffset = 0; // Position de scroll
  }

  /**
   * Ajoute un item (seule la data est stockée)
   * @param {Object} itemOptions
   */
  addItem(itemOptions) {
    this.allItemsData.push(itemOptions);
    this.updateVisibleItems();
  }

  /**
   * Supprime tous les items
   */
  clear() {
    for (let item of this.visibleItems) {
      this.framework.remove(item);
    }
    this.allItemsData = [];
    this.visibleItems = [];
    this.height = 0;
  }

  /**
   * Met à jour la liste des items visibles selon scrollOffset
   */
  updateVisibleItems() {
    const firstIndex = Math.floor(this.scrollOffset / this.itemHeight);
    const lastIndex = Math.min(this.allItemsData.length - 1, Math.ceil((this.scrollOffset + this.viewportHeight) / this.itemHeight));

    const newVisibleItems = [];

    for (let i = firstIndex; i <= lastIndex; i++) {
      let item = this.visibleItems.find(v => v.__virtualIndex === i);
      if (!item) {
        // Crée un nouvel item si pas existant
        const data = this.allItemsData[i];
        item = new ListItem(this.framework, {
          ...data,
          x: this.x,
          y: this.y + i * this.itemHeight - this.scrollOffset,
          width: this.width,
          height: this.itemHeight,
          onClick: () => {
            if (this.onItemClick) this.onItemClick(i, data);
            if (data.onClick) data.onClick();
          }
        });
        item.__virtualIndex = i;
        this.framework.add(item);
      } else {
        // Met à jour la position Y si déjà existant
        item.y = this.y + i * this.itemHeight - this.scrollOffset;
      }
      newVisibleItems.push(item);
    }

    // Supprime les items qui ne sont plus visibles
    for (let item of this.visibleItems) {
      if (!newVisibleItems.includes(item)) {
        this.framework.remove(item);
      }
    }

    this.visibleItems = newVisibleItems;
    this.height = this.allItemsData.length * this.itemHeight;
  }

  /**
   * Scroll la liste
   * @param {number} deltaY
   */
  scroll(deltaY) {
    this.scrollOffset += deltaY;
    if (this.scrollOffset < 0) this.scrollOffset = 0;
    const maxScroll = Math.max(0, this.height - this.viewportHeight);
    if (this.scrollOffset > maxScroll) this.scrollOffset = maxScroll;

    this.updateVisibleItems();
  }

  /**
   * Dessine les items visibles
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (let item of this.visibleItems) {
      item.draw(ctx);
    }
  }

  /**
   * Toujours false : les ListItems gèrent leurs clics
   */
  isPointInside() {
    return false;
  }
}

export default VirtualList;
