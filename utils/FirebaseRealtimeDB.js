/**
 * FirebaseRealtimeDB - Utilitaire pour Firebase Realtime Database
 * 
 * @example
 * const realtimeDB = new FirebaseRealtimeDB(firebaseCore);
 * await realtimeDB.set('users/123', { name: 'John', age: 30 });
 * const data = await realtimeDB.get('users/123');
 * realtimeDB.listen('users/123', (snapshot) => console.log(snapshot.val()));
 */
class FirebaseRealtimeDB {
  constructor(firebaseCore) {
    this.core = firebaseCore;
    this.db = null;
    this.listeners = new Map(); // Stocker les listeners pour les nettoyer
  }

  /**
   * Initialiser la base de données
   */
  initialize() {
    if (!this.db) {
      this.db = this.core.getDatabase();
    }
    return this.db;
  }

  /**
   * Obtenir une référence
   */
  ref(path = '') {
    if (!this.db) this.initialize();
    return this.db.ref(path);
  }

  // ==================== OPERATIONS CRUD ====================

  /**
   * Écrire des données (écrase les données existantes)
   */
  async set(path, data) {
    try {
      await this.ref(path).set(data);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur set ${path}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour des données (merge)
   */
  async update(path, updates) {
    try {
      await this.ref(path).update(updates);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur update ${path}:`, error);
      throw error;
    }
  }

  /**
   * Ajouter des données avec une clé auto-générée
   */
  async push(path, data) {
    try {
      const newRef = this.ref(path).push();
      await newRef.set(data);
      return {
        success: true,
        key: newRef.key,
        ref: newRef
      };
    } catch (error) {
      console.error(`❌ Erreur push ${path}:`, error);
      throw error;
    }
  }

  /**
   * Lire des données une fois
   */
  async get(path) {
    try {
      const snapshot = await this.ref(path).once('value');
      return snapshot.val();
    } catch (error) {
      console.error(`❌ Erreur get ${path}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer des données
   */
  async remove(path) {
    try {
      await this.ref(path).remove();
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur remove ${path}:`, error);
      throw error;
    }
  }

  // ==================== LISTENERS EN TEMPS RÉEL ====================

  /**
   * Écouter les changements en temps réel
   */
  listen(path, callback, eventType = 'value') {
    const ref = this.ref(path);
    const listenerId = `${path}_${eventType}_${Date.now()}`;

    const listener = ref.on(eventType, 
      (snapshot) => {
        callback(snapshot, null);
      },
      (error) => {
        console.error(`❌ Erreur listener ${path}:`, error);
        callback(null, error);
      }
    );

    // Stocker le listener pour le nettoyage
    this.listeners.set(listenerId, { ref, eventType, listener });

    // Retourner une fonction pour se désabonner
    return () => this.unlisten(listenerId);
  }

  /**
   * Écouter les ajouts d'enfants
   */
  listenChildAdded(path, callback) {
    return this.listen(path, callback, 'child_added');
  }

  /**
   * Écouter les changements d'enfants
   */
  listenChildChanged(path, callback) {
    return this.listen(path, callback, 'child_changed');
  }

  /**
   * Écouter les suppressions d'enfants
   */
  listenChildRemoved(path, callback) {
    return this.listen(path, callback, 'child_removed');
  }

  /**
   * Arrêter d'écouter
   */
  unlisten(listenerId) {
    const listenerData = this.listeners.get(listenerId);
    if (listenerData) {
      listenerData.ref.off(listenerData.eventType, listenerData.listener);
      this.listeners.delete(listenerId);
    }
  }

  /**
   * Arrêter tous les listeners
   */
  unlistenAll() {
    this.listeners.forEach((listenerData, listenerId) => {
      listenerData.ref.off(listenerData.eventType, listenerData.listener);
    });
    this.listeners.clear();
  }

  // ==================== QUERIES ====================

  /**
   * Requête avec limite
   */
  async queryLimit(path, limit, direction = 'first') {
    try {
      let query;
      if (direction === 'first') {
        query = this.ref(path).limitToFirst(limit);
      } else {
        query = this.ref(path).limitToLast(limit);
      }
      
      const snapshot = await query.once('value');
      return this.snapshotToArray(snapshot);
    } catch (error) {
      console.error(`❌ Erreur queryLimit ${path}:`, error);
      throw error;
    }
  }

  /**
   * Requête avec ordre
   */
  async queryOrderBy(path, orderByChild, options = {}) {
    try {
      let query = this.ref(path).orderByChild(orderByChild);

      // Filtres optionnels
      if (options.equalTo !== undefined) {
        query = query.equalTo(options.equalTo);
      }
      if (options.startAt !== undefined) {
        query = query.startAt(options.startAt);
      }
      if (options.endAt !== undefined) {
        query = query.endAt(options.endAt);
      }
      if (options.limitToFirst) {
        query = query.limitToFirst(options.limitToFirst);
      }
      if (options.limitToLast) {
        query = query.limitToLast(options.limitToLast);
      }

      const snapshot = await query.once('value');
      return this.snapshotToArray(snapshot);
    } catch (error) {
      console.error(`❌ Erreur queryOrderBy ${path}:`, error);
      throw error;
    }
  }

  /**
   * Requête avec ordre par clé
   */
  async queryOrderByKey(path, options = {}) {
    try {
      let query = this.ref(path).orderByKey();

      if (options.startAt) query = query.startAt(options.startAt);
      if (options.endAt) query = query.endAt(options.endAt);
      if (options.limitToFirst) query = query.limitToFirst(options.limitToFirst);
      if (options.limitToLast) query = query.limitToLast(options.limitToLast);

      const snapshot = await query.once('value');
      return this.snapshotToArray(snapshot);
    } catch (error) {
      console.error(`❌ Erreur queryOrderByKey ${path}:`, error);
      throw error;
    }
  }

  /**
   * Requête avec ordre par valeur
   */
  async queryOrderByValue(path, options = {}) {
    try {
      let query = this.ref(path).orderByValue();

      if (options.startAt) query = query.startAt(options.startAt);
      if (options.endAt) query = query.endAt(options.endAt);
      if (options.limitToFirst) query = query.limitToFirst(options.limitToFirst);
      if (options.limitToLast) query = query.limitToLast(options.limitToLast);

      const snapshot = await query.once('value');
      return this.snapshotToArray(snapshot);
    } catch (error) {
      console.error(`❌ Erreur queryOrderByValue ${path}:`, error);
      throw error;
    }
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Transaction (opération atomique)
   */
  async transaction(path, updateFunction) {
    try {
      const result = await this.ref(path).transaction(updateFunction);
      
      if (result.committed) {
        return {
          committed: true,
          snapshot: result.snapshot,
          value: result.snapshot.val()
        };
      } else {
        return {
          committed: false,
          snapshot: result.snapshot
        };
      }
    } catch (error) {
      console.error(`❌ Erreur transaction ${path}:`, error);
      throw error;
    }
  }

  /**
   * Incrémenter une valeur de manière atomique
   */
  async increment(path, amount = 1) {
    return this.transaction(path, (current) => {
      return (current || 0) + amount;
    });
  }

  /**
   * Décrémenter une valeur de manière atomique
   */
  async decrement(path, amount = 1) {
    return this.increment(path, -amount);
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Mise à jour multiple (atomique)
   */
  async batchUpdate(updates) {
    try {
      await this.ref().update(updates);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur batch update:', error);
      throw error;
    }
  }

  /**
   * Suppression multiple
   */
  async batchRemove(paths) {
    const updates = {};
    paths.forEach(path => {
      updates[path] = null;
    });
    return this.batchUpdate(updates);
  }

  // ==================== PRESENCE ====================

  /**
   * Gérer la présence utilisateur (online/offline)
   */
  setupPresence(userId, userData = {}) {
    const userStatusRef = this.ref(`status/${userId}`);
    const connectedRef = this.ref('.info/connected');

    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        // Utilisateur connecté
        userStatusRef.onDisconnect().set({
          state: 'offline',
          last_changed: firebase.database.ServerValue.TIMESTAMP
        });

        userStatusRef.set({
          state: 'online',
          last_changed: firebase.database.ServerValue.TIMESTAMP,
          ...userData
        });
      }
    });

    // Retourner une fonction pour nettoyer
    return () => {
      userStatusRef.set({
        state: 'offline',
        last_changed: firebase.database.ServerValue.TIMESTAMP
      });
      connectedRef.off();
    };
  }

  // ==================== HELPERS ====================

  /**
   * Convertir un snapshot en tableau
   */
  snapshotToArray(snapshot) {
    const array = [];
    snapshot.forEach((childSnapshot) => {
      array.push({
        key: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    return array;
  }

  /**
   * Convertir un snapshot en objet
   */
  snapshotToObject(snapshot) {
    const obj = {};
    snapshot.forEach((childSnapshot) => {
      obj[childSnapshot.key] = childSnapshot.val();
    });
    return obj;
  }

  /**
   * Obtenir une nouvelle clé unique
   */
  generateKey(path = '') {
    return this.ref(path).push().key;
  }

  /**
   * Obtenir le timestamp serveur
   */
  getServerTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
  }

  /**
   * Vérifier si un chemin existe
   */
  async exists(path) {
    const snapshot = await this.ref(path).once('value');
    return snapshot.exists();
  }

  /**
   * Compter les enfants
   */
  async count(path) {
    const snapshot = await this.ref(path).once('value');
    return snapshot.numChildren();
  }

  /**
   * Obtenir la priorité
   */
  async getPriority(path) {
    const snapshot = await this.ref(path).once('value');
    return snapshot.getPriority();
  }

  /**
   * Définir la priorité
   */
  async setPriority(path, priority) {
    try {
      await this.ref(path).setPriority(priority);
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur setPriority ${path}:`, error);
      throw error;
    }
  }

  // ==================== SECURITY ====================

  /**
   * Se connecter de manière anonyme
   */
  async signInAnonymously() {
    try {
      const auth = this.core.getAuth();
      await auth.signInAnonymously();
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur connexion anonyme:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    return this.core.getAuth().currentUser;
  }

  /**
   * Déconnexion
   */
  async signOut() {
    try {
      await this.core.getAuth().signOut();
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      throw error;
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Nettoyer les ressources
   */
  destroy() {
    this.unlistenAll();
    this.db = null;
  }
}

export default FirebaseRealtimeDB;
