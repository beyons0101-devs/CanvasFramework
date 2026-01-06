/**
 * Gestionnaire IndexedDB pour stockage de grandes quantités de données
 * @class
 * @property {string} dbName - Nom de la base
 * @property {number} version - Version
 * @property {IDBDatabase} db - Instance DB
 */
class IndexedDBManager {
  /**
   * Crée une instance de IndexedDBManager
   * @param {string} dbName - Nom de la base
   * @param {number} [version=1] - Version
   */
  constructor(dbName, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.stores = new Map();
  }

  /**
   * Initialise la base de données
   * @param {Object} schema - Schéma {storeName: {keyPath, indexes}}
   * @returns {Promise<IndexedDBManager>} Instance
   */
  async init(schema) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        for (let storeName in schema) {
          const config = schema[storeName];
          
          // Créer l'object store s'il n'existe pas
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath || 'id',
              autoIncrement: config.autoIncrement || false
            });

            // Créer les indexes
            if (config.indexes) {
              for (let indexName in config.indexes) {
                const indexConfig = config.indexes[indexName];
                store.createIndex(
                  indexName,
                  indexConfig.keyPath || indexName,
                  { unique: indexConfig.unique || false }
                );
              }
            }
          }
        }
      };
    });
  }

  /**
   * Ajoute un élément
   * @param {string} storeName - Nom du store
   * @param {*} item - Élément à ajouter
   * @returns {Promise<*>} Clé générée
   */
  async add(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Met à jour un élément
   * @param {string} storeName - Nom du store
   * @param {*} item - Élément à mettre à jour
   * @returns {Promise<*>} Clé
   */
  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère un élément par sa clé
   * @param {string} storeName - Nom du store
   * @param {*} key - Clé
   * @returns {Promise<*>} Élément
   */
  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère tous les éléments
   * @param {string} storeName - Nom du store
   * @returns {Promise<Array>} Liste des éléments
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cherche par index
   * @param {string} storeName - Nom du store
   * @param {string} indexName - Nom de l'index
   * @param {*} value - Valeur à chercher
   * @returns {Promise<Array>} Résultats
   */
  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Query avec filtre
   * @param {string} storeName - Nom du store
   * @param {Function} predicate - Fonction de filtre
   * @returns {Promise<Array>} Résultats
   */
  async query(storeName, predicate) {
    const all = await this.getAll(storeName);
    return all.filter(predicate);
  }

  /**
   * Supprime un élément
   * @param {string} storeName - Nom du store
   * @param {*} key - Clé
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Vide un store
   * @param {string} storeName - Nom du store
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Compte les éléments
   * @param {string} storeName - Nom du store
   * @returns {Promise<number>} Nombre d'éléments
   */
  async count(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ajoute plusieurs éléments (batch)
   * @param {string} storeName - Nom du store
   * @param {Array} items - Éléments
   * @returns {Promise<void>}
   */
  async bulkAdd(storeName, items) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => store.add(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Supprime plusieurs éléments
   * @param {string} storeName - Nom du store
   * @param {Array} keys - Clés
   * @returns {Promise<void>}
   */
  async bulkDelete(storeName, keys) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      keys.forEach(key => store.delete(key));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Ferme la connexion
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Supprime la base de données
   * @returns {Promise<void>}
   */
  async destroy() {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export default IndexedDBManager;