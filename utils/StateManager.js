/**
 * Système de gestion d'état avec historique (undo/redo) et observateurs
 * @class
 * @example
 * const state = new StateManager();
 * state.set('user.name', 'John');
 * const unsubscribe = state.subscribe('user.name', (newValue, oldValue) => {
 *   console.log('Name changed:', oldValue, '->', newValue);
 * });
 */
class StateManager {
  /**
   * @constructs StateManager
   */
  constructor() {
    /** @type {Object} */
    this.state = {};
    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
    /** @type {Array<Object>} */
    this.history = [];
    /** @type {number} */
    this.historyIndex = -1;
    /** @type {number} */
    this.maxHistory = 50;
  }

  /**
   * Définir une valeur dans le state
   * @param {string} key - Clé à définir
   * @param {*} value - Valeur à assigner
   * @param {boolean} [saveToHistory=true] - Sauvegarder dans l'historique
   */
  set(key, value, saveToHistory = true) {
    const oldValue = this.state[key];
    
    if (saveToHistory && oldValue !== value) {
      this.addToHistory(key, oldValue, value);
    }
    
    this.state[key] = value;
    this.notify(key, value, oldValue);
  }

  /**
   * Récupérer une valeur du state
   * @param {string} key - Clé à récupérer
   * @param {*} [defaultValue=null] - Valeur par défaut si la clé n'existe pas
   * @returns {*} La valeur de la clé ou la valeur par défaut
   */
  get(key, defaultValue = null) {
    return this.state.hasOwnProperty(key) ? this.state[key] : defaultValue;
  }

  /**
   * Mettre à jour plusieurs valeurs à la fois
   * @param {Object} updates - Objet avec les clés/valeurs à mettre à jour
   * @param {boolean} [saveToHistory=true] - Sauvegarder dans l'historique
   */
  update(updates, saveToHistory = true) {
    Object.keys(updates).forEach(key => {
      this.set(key, updates[key], saveToHistory);
    });
  }

  /**
   * Supprimer une clé du state
   * @param {string} key - Clé à supprimer
   */
  delete(key) {
    const oldValue = this.state[key];
    delete this.state[key];
    this.notify(key, undefined, oldValue);
  }

  /**
   * S'abonner aux changements d'une clé
   * @param {string} key - Clé à observer (ou '*' pour toutes les clés)
   * @param {Function} callback - Fonction appelée lors des changements
   * @returns {Function} Fonction de désabonnement
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    
    // Retourner une fonction de désabonnement
    return () => {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notifier les observateurs d'un changement
   * @param {string} key - Clé qui a changé
   * @param {*} newValue - Nouvelle valeur
   * @param {*} oldValue - Ancienne valeur
   * @private
   */
  notify(key, newValue, oldValue) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        callback(newValue, oldValue);
      });
    }
    
    // Notifier les listeners globaux (*)
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        callback(key, newValue, oldValue);
      });
    }
  }

  /**
   * Ajouter une modification à l'historique
   * @param {string} key - Clé modifiée
   * @param {*} oldValue - Ancienne valeur
   * @param {*} newValue - Nouvelle valeur
   * @private
   */
  addToHistory(key, oldValue, newValue) {
    // Supprimer l'historique après l'index actuel
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    this.history.push({ key, oldValue, newValue, timestamp: Date.now() });
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * Annuler la dernière modification
   * @returns {boolean} True si une opération a été annulée
   */
  undo() {
    if (this.historyIndex >= 0) {
      const { key, oldValue } = this.history[this.historyIndex];
      this.set(key, oldValue, false);
      this.historyIndex--;
      return true;
    }
    return false;
  }

  /**
   * Rétablir la dernière modification annulée
   * @returns {boolean} True si une opération a été rétablie
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const { key, newValue } = this.history[this.historyIndex];
      this.set(key, newValue, false);
      return true;
    }
    return false;
  }

  /**
   * Réinitialiser complètement le state
   */
  reset() {
    const keys = Object.keys(this.state);
    this.state = {};
    keys.forEach(key => this.notify(key, undefined));
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Exporter le state en JSON
   * @returns {string} Le state sérialisé en JSON
   */
  export() {
    return JSON.stringify(this.state);
  }

  /**
   * Importer un state depuis du JSON
   * @param {string} jsonState - State sérialisé en JSON
   * @returns {boolean} True si l'import a réussi
   */
  import(jsonState) {
    try {
      const newState = JSON.parse(jsonState);
      Object.keys(newState).forEach(key => {
        this.set(key, newState[key], false);
      });
      return true;
    } catch (error) {
      console.error('Error importing state:', error);
      return false;
    }
  }
}

export default StateManager;