/**
 * Bus d'événements pour communication entre composants
 * Pattern: Publish/Subscribe (Pub/Sub)
 * @class
 * @property {Map} events - Événements enregistrés
 * @property {Array} history - Historique des événements
 * @property {boolean} enableHistory - Activer l'historique
 * @property {number} maxHistory - Taille max de l'historique
 */
class EventBus {
  /**
   * Crée une instance de EventBus
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.enableHistory=false] - Activer l'historique
   * @param {number} [options.maxHistory=100] - Taille max historique
   * @param {boolean} [options.enableWildcard=true] - Activer wildcards
   */
  constructor(options = {}) {
    this.events = new Map();
    this.history = [];
    this.enableHistory = options.enableHistory || false;
    this.maxHistory = options.maxHistory || 100;
    this.enableWildcard = options.enableWildcard !== false;
    this.middlewares = [];
  }

  /**
   * Souscrit à un événement
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction callback
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.once=false] - Exécuter une seule fois
   * @param {number} [options.priority=0] - Priorité (plus haut = exécuté avant)
   * @returns {Function} Fonction de désinscription
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: this.generateId()
    };

    const listeners = this.events.get(event);
    listeners.push(listener);
    
    // Trier par priorité (descendant)
    listeners.sort((a, b) => b.priority - a.priority);

    // Retourner une fonction de désinscription
    return () => this.off(event, listener.id);
  }

  /**
   * Souscrit à un événement (une seule fois)
   * @param {string} event - Nom de l'événement
   * @param {Function} callback - Fonction callback
   * @param {Object} [options={}] - Options
   * @returns {Function} Fonction de désinscription
   */
  once(event, callback, options = {}) {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * Se désinscrit d'un événement
   * @param {string} event - Nom de l'événement
   * @param {string|Function} [callbackOrId] - Callback ou ID du listener
   * @returns {boolean} True si désabonné
   */
  off(event, callbackOrId) {
    const listeners = this.events.get(event);
    
    if (!listeners) return false;

    if (!callbackOrId) {
      // Supprimer tous les listeners de cet événement
      this.events.delete(event);
      return true;
    }

    const index = listeners.findIndex(listener => 
      listener.callback === callbackOrId || listener.id === callbackOrId
    );

    if (index > -1) {
      listeners.splice(index, 1);
      
      // Supprimer l'événement s'il n'y a plus de listeners
      if (listeners.length === 0) {
        this.events.delete(event);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Émet un événement
   * @param {string} event - Nom de l'événement
   * @param {...*} args - Arguments à passer
   * @returns {number} Nombre de listeners exécutés
   */
  emit(event, ...args) {
    // Historique
    if (this.enableHistory) {
      this.addToHistory(event, args);
    }

    // Middlewares
    let shouldContinue = true;
    for (let middleware of this.middlewares) {
      const result = middleware(event, args);
      if (result === false) {
        shouldContinue = false;
        break;
      }
    }

    if (!shouldContinue) return 0;

    let count = 0;

    // Listeners exacts
    const listeners = this.events.get(event);
    if (listeners) {
      count += this.executeListeners(listeners, event, args);
    }

    // Wildcards (si activé)
    if (this.enableWildcard) {
      count += this.emitWildcard(event, args);
    }

    return count;
  }

  /**
   * Émet un événement avec wildcard
   * @param {string} event - Nom de l'événement
   * @param {Array} args - Arguments
   * @returns {number} Nombre de listeners exécutés
   * @private
   */
  emitWildcard(event, args) {
    let count = 0;
    
    for (let [eventPattern, listeners] of this.events.entries()) {
      if (eventPattern.includes('*')) {
        if (this.matchWildcard(event, eventPattern)) {
          count += this.executeListeners(listeners, event, args);
        }
      }
    }
    
    return count;
  }

  /**
   * Vérifie si un événement match un pattern wildcard
   * @param {string} event - Événement
   * @param {string} pattern - Pattern avec *
   * @returns {boolean} True si match
   * @private
   */
  matchWildcard(event, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(event);
  }

  /**
   * Exécute les listeners
   * @param {Array} listeners - Liste des listeners
   * @param {string} event - Nom de l'événement
   * @param {Array} args - Arguments
   * @returns {number} Nombre de listeners exécutés
   * @private
   */
  executeListeners(listeners, event, args) {
    let count = 0;
    const toRemove = [];

    for (let listener of listeners) {
      try {
        listener.callback(...args);
        count++;

        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }

    // Supprimer les listeners "once"
    for (let id of toRemove) {
      this.off(event, id);
    }

    return count;
  }

  /**
   * Émet un événement de manière asynchrone
   * @param {string} event - Nom de l'événement
   * @param {...*} args - Arguments
   * @returns {Promise<number>} Nombre de listeners exécutés
   */
  async emitAsync(event, ...args) {
    if (this.enableHistory) {
      this.addToHistory(event, args);
    }

    let count = 0;
    const listeners = this.events.get(event);

    if (listeners) {
      for (let listener of listeners) {
        try {
          await listener.callback(...args);
          count++;

          if (listener.once) {
            this.off(event, listener.id);
          }
        } catch (error) {
          console.error(`Error in async event listener for "${event}":`, error);
        }
      }
    }

    return count;
  }

  /**
   * Attend qu'un événement soit émis
   * @param {string} event - Nom de l'événement
   * @param {number} [timeout=0] - Timeout en ms (0 = infini)
   * @returns {Promise} Promise qui se résout avec les args
   */
  waitFor(event, timeout = 0) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      
      const unsubscribe = this.once(event, (...args) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(args);
      });

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event "${event}"`));
        }, timeout);
      }
    });
  }

  /**
   * Ajoute un middleware
   * @param {Function} middleware - Fonction middleware (event, args) => boolean
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
  }

  /**
   * Supprime un middleware
   * @param {Function} middleware - Middleware à supprimer
   */
  removeMiddleware(middleware) {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
    }
  }

  /**
   * Obtient tous les événements enregistrés
   * @returns {Array<string>} Liste des événements
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Obtient le nombre de listeners pour un événement
   * @param {string} event - Nom de l'événement
   * @returns {number} Nombre de listeners
   */
  listenerCount(event) {
    const listeners = this.events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Supprime tous les listeners
   */
  clear() {
    this.events.clear();
  }

  /**
   * Ajoute à l'historique
   * @param {string} event - Événement
   * @param {Array} args - Arguments
   * @private
   */
  addToHistory(event, args) {
    this.history.push({
      event,
      args,
      timestamp: Date.now()
    });

    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Obtient l'historique
   * @param {string} [event] - Filtrer par événement
   * @returns {Array} Historique
   */
  getHistory(event) {
    if (event) {
      return this.history.filter(item => item.event === event);
    }
    return this.history;
  }

  /**
   * Vide l'historique
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Rejoue l'historique
   * @param {string} [event] - Filtrer par événement
   */
  replay(event) {
    const items = this.getHistory(event);
    
    for (let item of items) {
      this.emit(item.event, ...item.args);
    }
  }

  /**
   * Génère un ID unique
   * @returns {string} ID
   * @private
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debug: affiche tous les listeners
   */
  debug() {
    console.log('EventBus Debug:');
    console.log('Events:', this.eventNames());
    
    for (let [event, listeners] of this.events.entries()) {
      console.log(`  ${event}: ${listeners.length} listener(s)`);
      listeners.forEach((listener, i) => {
        console.log(`    [${i}] Priority: ${listener.priority}, Once: ${listener.once}`);
      });
    }
    
    if (this.enableHistory) {
      console.log('History:', this.history.length, 'events');
    }
  }
}

// Instance globale par défaut
EventBus.global = new EventBus();

// Raccourcis globaux
EventBus.on = (...args) => EventBus.global.on(...args);
EventBus.once = (...args) => EventBus.global.once(...args);
EventBus.off = (...args) => EventBus.global.off(...args);
EventBus.emit = (...args) => EventBus.global.emit(...args);
EventBus.emitAsync = (...args) => EventBus.global.emitAsync(...args);
EventBus.waitFor = (...args) => EventBus.global.waitFor(...args);

export default EventBus;