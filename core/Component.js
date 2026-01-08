/**
 * Classe de base pour tous les composants
 * @class
 * @abstract
 * @property {CanvasFramework} framework - Référence au framework parent
 * @property {number} x - Position X
 * @property {number} y - Position Y
 * @property {number} width - Largeur
 * @property {number} height - Hauteur
 * @property {boolean} visible - Visibilité du composant
 * @property {boolean} pressed - État pressé
 * @property {boolean} hovered - État survolé
 * @property {Function} onClick - Callback au clic
 * @property {Function} onPress - Callback à la pression
 */
class Component {
  /**
   * Crée une instance de Component
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.x=0] - Position X
   * @param {number} [options.y=0] - Position Y
   * @param {number} [options.width=100] - Largeur
   * @param {number} [options.height=50] - Hauteur
   * @param {boolean} [options.visible=true] - Visibilité
   * @param {Function} [options.onClick] - Callback au clic
   * @param {Function} [options.onPress] - Callback à la pression
   */
  constructor(framework, options = {}) {
    this.framework = framework;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 100;
    this.height = options.height || 50;
    this.visible = options.visible !== false;
    this.pressed = false;
    this.hovered = false;
    this.onClick = options.onClick;
    this.onPress = options.onPress;
    
    // Système dirty simple (optionnel)
    this._dirty = true;
  }

  /**
   * Vérifie si le composant est visible à l'écran (en tenant compte du scroll)
   * @returns {boolean}
   */
  isVisibleOnScreen() {
    const yPos = this.framework.isFixedComponent(this) ? this.y : this.y + this.framework.scrollOffset;
    const xPos = this.x;
    return (
      yPos + this.height > 0 && yPos < this.framework.height &&
      xPos + this.width > 0 && xPos < this.framework.width &&
      this.visible
    );
  }

  /**
   * Marque le composant pour redessin
   * Appelez cette méthode après avoir modifié une propriété
   */
  markDirty() {
    this._dirty = true;
    if (this.framework && this.framework.markComponentDirty) {
      this.framework.markComponentDirty(this);
    }
  }

  /**
   * Marque le composant comme propre (appelé automatiquement après draw)
   */
  markClean() {
    this._dirty = false;
  }

  /**
   * Vérifie si le composant est dirty
   */
  isDirty() {
    return this._dirty;
  }

  /**
   * Vérifie si un point est dans les limites du composant
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * Méthode de dessin (à implémenter par les sous-classes)
   */
  draw(ctx) {
    // À implémenter par les sous-classes
  }
}


export default Component;
