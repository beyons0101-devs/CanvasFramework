/**
 * Cache local avec TTL (Time To Live) et gestion avancée
 * @class
 * @property {Map} store - Stockage interne
 * @property {number} defaultTTL - TTL par défaut en ms
 * @property {number} maxSize - Taille max du cache
 * @property {Object} stats - Statistiques du cache
 */
class DataStore {
  /**
   * Crée une instance de DataStore
   * @param {Object} [options={}] - Options
   * @param {number} [options.defaultTTL=3600000] - TTL par défaut (1h)
   * @param {number} [options.maxSize=100] - Taille max du cache
   * @param {boolean} [options.enableStats=true] - Activer les stats
   */
  constructor(options = {}) {
    this.store = new Map();
    this.defaultTTL = options.defaultTTL || 3600000; // 1 heure par défaut
    this.maxSize = options.maxSize || 100;
    this.enableStats = options.enableStats !== false;
    
    // Statistiques
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Nettoyage périodique
    this.startCleanupInterval();
  }

  /**
   * Stocke une valeur avec TTL
   * @param {string} key - Clé
   * @param {*} value - Valeur
   * @param {number} [ttl] - TTL en ms (optionnel)
   * @returns {DataStore} Instance pour chaînage
   */
  set(key, value, ttl) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    // Si le cache est plein, supprimer l'élément le plus ancien
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }
    
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    if (this.enableStats) this.stats.sets++;
    
    return this;
  }

  /**
   * Récupère une valeur
   * @param {string} key - Clé
   * @param {*} [defaultValue=null] - Valeur par défaut
   * @returns {*} Valeur ou null
   */
  get(key, defaultValue = null) {
    const item = this.store.get(key);
    
    if (!item) {
      if (this.enableStats) this.stats.misses++;
      return defaultValue;
    }
    
    // Vérifier l'expiration
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      if (this.enableStats) this.stats.misses++;
      return defaultValue;
    }
    
    // Mettre à jour les stats d'accès
    item.accessCount++;
    
    if (this.enableStats) this.stats.hits++;
    
    return item.value;
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   * @param {string} key - Clé
   * @returns {boolean} True si existe et valide
   */
  has(key) {
    const item = this.store.get(key);
    
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Supprime une entrée
   * @param {string} key - Clé
   * @returns {boolean} True si supprimé
   */
  delete(key) {
    const deleted = this.store.delete(key);
    if (deleted && this.enableStats) this.stats.deletes++;
    return deleted;
  }

  /**
   * Vide tout le cache
   */
  clear() {
    this.store.clear();
    if (this.enableStats) {
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0
      };
    }
  }

  /**
   * Récupère ou calcule une valeur (memoization)
   * @param {string} key - Clé
   * @param {Function} factory - Fonction qui retourne la valeur
   * @param {number} [ttl] - TTL optionnel
   * @returns {Promise<*>} Valeur
   */
  async getOrSet(key, factory, ttl) {
    if (this.has(key)) {
      return this.get(key);
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Récupère plusieurs valeurs
   * @param {Array<string>} keys - Clés
   * @returns {Object} Objet clé-valeur
   */
  getMany(keys) {
    const result = {};
    
    for (let key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Stocke plusieurs valeurs
   * @param {Object} items - Objet clé-valeur
   * @param {number} [ttl] - TTL optionnel
   * @returns {DataStore} Instance pour chaînage
   */
  setMany(items, ttl) {
    for (let key in items) {
      this.set(key, items[key], ttl);
    }
    return this;
  }

  /**
   * Supprime plusieurs entrées
   * @param {Array<string>} keys - Clés
   * @returns {number} Nombre de suppressions
   */
  deleteMany(keys) {
    let count = 0;
    for (let key of keys) {
      if (this.delete(key)) count++;
    }
    return count;
  }

  /**
   * Met à jour le TTL d'une entrée
   * @param {string} key - Clé
   * @param {number} ttl - Nouveau TTL en ms
   * @returns {boolean} True si mis à jour
   */
  touch(key, ttl) {
    const item = this.store.get(key);
    
    if (!item) return false;
    
    item.expiresAt = Date.now() + (ttl || this.defaultTTL);
    return true;
  }

  /**
   * Obtient le TTL restant
   * @param {string} key - Clé
   * @returns {number} TTL en ms, ou -1 si n'existe pas
   */
  ttl(key) {
    const item = this.store.get(key);
    
    if (!item) return -1;
    
    const remaining = item.expiresAt - Date.now();
    return remaining > 0 ? remaining : -1;
  }

  /**
   * Évince l'élément le plus ancien (LRU)
   * @private
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (let [key, item] of this.store.entries()) {
      // Utiliser l'accès le moins récent comme critère
      const priority = item.createdAt - (item.accessCount * 1000);
      
      if (priority < oldestTime) {
        oldestTime = priority;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
      if (this.enableStats) this.stats.evictions++;
    }
  }

  /**
   * Nettoie les entrées expirées
   * @returns {number} Nombre d'entrées nettoyées
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (let [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Démarre le nettoyage automatique
   * @param {number} [interval=60000] - Intervalle en ms (1 minute)
   * @private
   */
  startCleanupInterval(interval = 60000) {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);
  }

  /**
   * Arrête le nettoyage automatique
   */
  stopCleanupInterval() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Obtient toutes les clés
   * @param {boolean} [includeExpired=false] - Inclure les expirées
   * @returns {Array<string>} Liste des clés
   */
  keys(includeExpired = false) {
    const keys = [];
    const now = Date.now();
    
    for (let [key, item] of this.store.entries()) {
      if (includeExpired || now <= item.expiresAt) {
        keys.push(key);
      }
    }
    
    return keys;
  }

  /**
   * Obtient la taille du cache
   * @returns {number} Nombre d'entrées
   */
  size() {
    return this.store.size;
  }

  /**
   * Obtient les statistiques
   * @returns {Object} Statistiques
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      size: this.store.size,
      hitRate: `${hitRate}%`,
      maxSize: this.maxSize
    };
  }

  /**
   * Réinitialise les statistiques
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Exporte le cache en JSON
   * @returns {string} JSON
   */
  export() {
    const data = {};
    
    for (let [key, item] of this.store.entries()) {
      data[key] = {
        value: item.value,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt
      };
    }
    
    return JSON.stringify(data);
  }

  /**
   * Importe un cache depuis JSON
   * @param {string} json - JSON
   */
  import(json) {
    const data = JSON.parse(json);
    const now = Date.now();
    
    for (let key in data) {
      const item = data[key];
      
      // Ne pas importer les entrées expirées
      if (item.expiresAt > now) {
        this.store.set(key, {
          value: item.value,
          expiresAt: item.expiresAt,
          createdAt: item.createdAt,
          accessCount: 0
        });
      }
    }
  }

  /**
   * Détruit le store
   */
  destroy() {
    this.stopCleanupInterval();
    this.clear();
  }
}

// Instance globale par défaut
DataStore.global = new DataStore();

export default DataStore;