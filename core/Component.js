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
    
    // Lifecycle
    this._mounted = false;

    // Pour détecter les updates
    this._prevProps = { ...options };
  }

  /* =======================
     LIFECYCLE HOOKS
     ======================= */

  onMount() {}
  onUnmount() {}
  onUpdate(prevProps) {}
  onResize(width, height) {}

  /* ======================= */

  _mount() {
    if (!this._mounted) {
      this._mounted = true;
      this.onMount();
    }
  }

  _unmount() {
    if (this._mounted) {
      this.onUnmount();
      this._mounted = false;
    }
  }

  _update(newProps) {
    this.onUpdate(this._prevProps);
    this._prevProps = { ...newProps };
    this.markDirty();
  }

  _resize(width, height) {
    this.onResize(width, height);
    this.markDirty();
  }

  setProps(newProps = {}) {
    const changed = Object.keys(newProps).some(
      key => this[key] !== newProps[key]
    );

    if (!changed) return;

    Object.assign(this, newProps);
    this._update(newProps);
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





