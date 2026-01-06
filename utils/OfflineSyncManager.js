/**
 * Gestionnaire de synchronisation hors ligne
 * Queue les opérations offline et les sync quand online
 * @class
 * @property {Array} queue - File d'attente des opérations
 * @property {boolean} isOnline - État de connexion
 * @property {Map} syncHandlers - Handlers de sync par type
 */
class OfflineSyncManager {
  /**
   * Crée une instance de OfflineSyncManager
   * @param {Object} [options={}] - Options
   * @param {string} [options.storageKey='offline_queue'] - Clé de stockage
   * @param {number} [options.retryDelay=5000] - Délai entre tentatives (ms)
   * @param {number} [options.maxRetries=3] - Tentatives max
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'offline_queue';
    this.retryDelay = options.retryDelay || 5000;
    this.maxRetries = options.maxRetries || 3;
    
    this.queue = [];
    this.isOnline = navigator.onLine;
    this.syncHandlers = new Map();
    this.isSyncing = false;
    
    // Charger la queue sauvegardée
    this.loadQueue();
    
    // Écouter les changements de connexion
    this.setupConnectionListeners();
  }

  /**
   * Configure les listeners de connexion
   * @private
   */
  setupConnectionListeners() {
    window.addEventListener('online', () => {
      console.log('🟢 Connection restored');
      this.isOnline = true;
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 Connection lost');
      this.isOnline = false;
    });
  }

  /**
   * Enregistre un handler de sync
   * @param {string} type - Type d'opération
   * @param {Function} handler - Handler async (operation) => Promise
   */
  registerSyncHandler(type, handler) {
    this.syncHandlers.set(type, handler);
  }

  /**
   * Ajoute une opération à la queue
   * @param {string} type - Type d'opération
   * @param {Object} data - Données
   * @param {Object} [options={}] - Options
   * @returns {Promise<*>} Résultat
   */
  async queue(type, data, options = {}) {
    const operation = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      ...options
    };

    // Si online, essayer d'exécuter directement
    if (this.isOnline && !options.forceQueue) {
      try {
        const result = await this.executeOperation(operation);
        return result;
      } catch (error) {
        console.warn('Failed to execute immediately, queuing...', error);
        // Continuer pour ajouter à la queue
      }
    }

    // Ajouter à la queue
    this.queue.push(operation);
    this.saveQueue();

    console.log(`📋 Operation queued: ${type}`, operation.id);

    // Essayer de sync immédiatement si online
    if (this.isOnline) {
      this.syncAll();
    }

    return operation;
  }

  /**
   * Exécute une opération
   * @param {Object} operation - Opération
   * @returns {Promise<*>} Résultat
   * @private
   */
  async executeOperation(operation) {
    const handler = this.syncHandlers.get(operation.type);

    if (!handler) {
      throw new Error(`No sync handler for type: ${operation.type}`);
    }

    return await handler(operation.data);
  }

  /**
   * Synchronise toutes les opérations en attente
   * @returns {Promise<Object>} Résultats
   */
  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    console.log('🔄 Starting sync...', this.queue.length, 'operations');

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Trier par timestamp (FIFO)
    this.queue.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < this.queue.length; i++) {
      const operation = this.queue[i];

      if (operation.status === 'success') {
        results.skipped.push(operation);
        continue;
      }

      try {
        console.log(`⏳ Syncing: ${operation.type}`, operation.id);
        
        const result = await this.executeOperation(operation);
        
        operation.status = 'success';
        operation.result = result;
        operation.syncedAt = Date.now();
        
        results.success.push(operation);
        console.log(`✅ Synced: ${operation.type}`, operation.id);

      } catch (error) {
        operation.retries++;
        operation.lastError = error.message;

        if (operation.retries >= this.maxRetries) {
          operation.status = 'failed';
          results.failed.push(operation);
          console.error(`❌ Failed permanently: ${operation.type}`, operation.id);
        } else {
          operation.status = 'pending';
          console.warn(`⚠️ Retry ${operation.retries}/${this.maxRetries}:`, operation.type);
        }
      }
    }

    // Supprimer les opérations réussies de la queue
    this.queue = this.queue.filter(op => op.status !== 'success');
    this.saveQueue();

    this.isSyncing = false;
    
    console.log('✅ Sync complete:', results);
    
    // Réessayer les échecs après un délai
    if (results.failed.length > 0 || this.queue.length > 0) {
      setTimeout(() => this.syncAll(), this.retryDelay);
    }

    return results;
  }

  /**
   * Synchronise un type spécifique
   * @param {string} type - Type d'opération
   * @returns {Promise<Object>} Résultats
   */
  async syncType(type) {
    const operations = this.queue.filter(op => op.type === type && op.status !== 'success');
    
    const results = {
      success: [],
      failed: []
    };

    for (let operation of operations) {
      try {
        const result = await this.executeOperation(operation);
        operation.status = 'success';
        operation.result = result;
        results.success.push(operation);
      } catch (error) {
        operation.retries++;
        operation.lastError = error.message;
        
        if (operation.retries >= this.maxRetries) {
          operation.status = 'failed';
          results.failed.push(operation);
        }
      }
    }

    this.queue = this.queue.filter(op => op.status !== 'success');
    this.saveQueue();

    return results;
  }

  /**
   * Obtient les opérations en attente
   * @param {string} [type] - Filtrer par type
   * @returns {Array} Opérations
   */
  getPending(type) {
    if (type) {
      return this.queue.filter(op => op.type === type && op.status === 'pending');
    }
    return this.queue.filter(op => op.status === 'pending');
  }

  /**
   * Obtient les opérations échouées
   * @returns {Array} Opérations
   */
  getFailed() {
    return this.queue.filter(op => op.status === 'failed');
  }

  /**
   * Supprime une opération
   * @param {string} id - ID de l'opération
   * @returns {boolean} True si supprimé
   */
  remove(id) {
    const index = this.queue.findIndex(op => op.id === id);
    
    if (index > -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    
    return false;
  }

  /**
   * Réinitialise une opération échouée
   * @param {string} id - ID de l'opération
   */
  retry(id) {
    const operation = this.queue.find(op => op.id === id);
    
    if (operation) {
      operation.status = 'pending';
      operation.retries = 0;
      operation.lastError = null;
      this.saveQueue();
      
      if (this.isOnline) {
        this.syncAll();
      }
    }
  }

  /**
   * Vide la queue
   */
  clear() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Sauvegarde la queue
   * @private
   */
  saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  /**
   * Charge la queue
   * @private
   */
  loadQueue() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.queue = JSON.parse(saved);
        console.log('📋 Loaded queue:', this.queue.length, 'operations');
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
      this.queue = [];
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
   * Obtient les statistiques
   * @returns {Object} Stats
   */
  getStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(op => op.status === 'pending').length,
      failed: this.queue.filter(op => op.status === 'failed').length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing
    };
  }
}

export default OfflineSyncManager;