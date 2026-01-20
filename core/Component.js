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
	
	// Système de listeners
    this._listeners = new Map();
  }

  /**
   * Ajoute un listener pour un événement
   * @param {string} event - Nom de l'événement
   * @param {Function} handler - Fonction callback
   * @returns {Component} - Pour le chaînage
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(handler);
    return this;
  }

  /**
   * Retire un listener
   * @param {string} event - Nom de l'événement
   * @param {Function} handler - Fonction à retirer
   * @returns {Component}
   */
  off(event, handler) {
    if (!this._listeners.has(event)) return this;
    
    const handlers = this._listeners.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
    return this;
  }

  /**
   * Ajoute un listener qui s'exécute une seule fois
   * @param {string} event - Nom de l'événement
   * @param {Function} handler - Fonction callback
   * @returns {Component}
   */
  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /**
   * Émet un événement
   * @param {string} event - Nom de l'événement
   * @param {...any} args - Arguments à passer aux handlers
   * @returns {Component}
   */
  emit(event, ...args) {
    if (!this._listeners.has(event)) return this;
    
    const handlers = this._listeners.get(event);
    for (let handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    }
    return this;
  }

  /**
   * Retire tous les listeners d'un événement (ou tous)
   * @param {string} [event] - Nom de l'événement (optionnel)
   * @returns {Component}
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  /**
   * Retourne le nombre de listeners pour un événement
   * @param {string} event - Nom de l'événement
   * @returns {number}
   */
  listenerCount(event) {
    return this._listeners.has(event) ? this._listeners.get(event).length : 0;
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

  measure(constraints) {
    return {
      width: this.width,
      height: this.height
    };
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






