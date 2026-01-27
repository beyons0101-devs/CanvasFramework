/**
 * FirebaseFirestore - Utilitaire pour Firebase Firestore
 * 
 * @example
 * const firestore = new FirebaseFirestore(firebaseCore);
 * await firestore.add('users', { name: 'John', age: 30 });
 * const users = await firestore.getCollection('users');
 * firestore.listenDocument('users/123', (doc) => console.log(doc.data()));
 */
class FirebaseFirestore {
  constructor(firebaseCore) {
    this.core = firebaseCore;
    this.db = null;
    this.listeners = new Map();
  }

  /**
   * Initialiser Firestore
   */
  initialize() {
    if (!this.db) {
      this.db = this.core.getFirestore();
    }
    return this.db;
  }

  /**
   * Obtenir une référence de collection
   */
  collection(path) {
    if (!this.db) this.initialize();
    return this.db.collection(path);
  }

  /**
   * Obtenir une référence de document
   */
  doc(path) {
    if (!this.db) this.initialize();
    return this.db.doc(path);
  }

  // ==================== OPERATIONS CRUD ====================

  /**
   * Ajouter un document avec ID auto-généré
   */
  async add(collectionPath, data) {
    try {
      const docRef = await this.collection(collectionPath).add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        id: docRef.id,
        ref: docRef
      };
    } catch (error) {
      console.error(`❌ Erreur add ${collectionPath}:`, error);
      throw error;
    }
  }

  /**
   * Créer/Écraser un document avec ID spécifique
   */
  async set(documentPath, data, options = {}) {
    try {
      await this.doc(documentPath).set({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, options);
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur set ${documentPath}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour un document (merge)
   */
  async update(documentPath, data) {
    try {
      await this.doc(documentPath).update({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur update ${documentPath}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un document
   */
  async get(documentPath) {
    try {
      const doc = await this.doc(documentPath).get();
      
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data(),
          ref: doc.ref
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ Erreur get ${documentPath}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer une collection
   */
  async getCollection(collectionPath, options = {}) {
    try {
      let query = this.collection(collectionPath);

      // Appliquer les filtres
      if (options.where) {
        options.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value);
        });
      }

      // Tri
      if (options.orderBy) {
        const [field, direction = 'asc'] = Array.isArray(options.orderBy) 
          ? options.orderBy 
          : [options.orderBy];
        query = query.orderBy(field, direction);
      }

      // Limite
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Pagination
      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }
      if (options.startAt) {
        query = query.startAt(options.startAt);
      }
      if (options.endBefore) {
        query = query.endBefore(options.endBefore);
      }
      if (options.endAt) {
        query = query.endAt(options.endAt);
      }

      const snapshot = await query.get();
      
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        ref: doc.ref
      }));

      return {
        docs,
        size: snapshot.size,
        empty: snapshot.empty,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error(`❌ Erreur getCollection ${collectionPath}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un document
   */
  async delete(documentPath) {
    try {
      await this.doc(documentPath).delete();
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur delete ${documentPath}:`, error);
      throw error;
    }
  }

  // ==================== LISTENERS EN TEMPS RÉEL ====================

  /**
   * Écouter un document en temps réel
   */
  listenDocument(documentPath, callback, onError = null) {
    const listenerId = `doc_${documentPath}_${Date.now()}`;

    const unsubscribe = this.doc(documentPath).onSnapshot(
      (doc) => {
        if (doc.exists) {
          callback({
            id: doc.id,
            ...doc.data(),
            ref: doc.ref
          }, null);
        } else {
          callback(null, null);
        }
      },
      (error) => {
        console.error(`❌ Erreur listener ${documentPath}:`, error);
        if (onError) onError(error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);

    return () => this.unlisten(listenerId);
  }

  /**
   * Écouter une collection en temps réel
   */
  listenCollection(collectionPath, callback, options = {}, onError = null) {
    const listenerId = `col_${collectionPath}_${Date.now()}`;

    let query = this.collection(collectionPath);

    // Appliquer les filtres
    if (options.where) {
      options.where.forEach(([field, operator, value]) => {
        query = query.where(field, operator, value);
      });
    }

    if (options.orderBy) {
      const [field, direction = 'asc'] = Array.isArray(options.orderBy) 
        ? options.orderBy 
        : [options.orderBy];
      query = query.orderBy(field, direction);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          ref: doc.ref
        }));

        // Détecter les changements
        const changes = snapshot.docChanges().map(change => ({
          type: change.type, // 'added', 'modified', 'removed'
          doc: {
            id: change.doc.id,
            ...change.doc.data()
          },
          oldIndex: change.oldIndex,
          newIndex: change.newIndex
        }));

        callback({
          docs,
          changes,
          size: snapshot.size,
          empty: snapshot.empty
        }, null);
      },
      (error) => {
        console.error(`❌ Erreur listener ${collectionPath}:`, error);
        if (onError) onError(error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);

    return () => this.unlisten(listenerId);
  }

  /**
   * Arrêter un listener
   */
  unlisten(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  /**
   * Arrêter tous les listeners
   */
  unlistenAll() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  // ==================== QUERIES AVANCÉES ====================

  /**
   * Requête simple
   */
  async query(collectionPath, field, operator, value, options = {}) {
    return this.getCollection(collectionPath, {
      where: [[field, operator, value]],
      ...options
    });
  }

  /**
   * Requête avec multiples conditions
   */
  async queryMultiple(collectionPath, conditions, options = {}) {
    return this.getCollection(collectionPath, {
      where: conditions,
      ...options
    });
  }

  /**
   * Recherche plein texte (simple)
   */
  async searchByPrefix(collectionPath, field, prefix, options = {}) {
    const end = prefix.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
    
    return this.getCollection(collectionPath, {
      where: [
        [field, '>=', prefix],
        [field, '<', end]
      ],
      ...options
    });
  }

  /**
   * Pagination (récupérer la page suivante)
   */
  async getNextPage(collectionPath, lastDoc, pageSize = 10, options = {}) {
    return this.getCollection(collectionPath, {
      ...options,
      limit: pageSize,
      startAfter: lastDoc
    });
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Opération batch (max 500 opérations)
   */
  batch() {
    if (!this.db) this.initialize();
    return this.db.batch();
  }

  /**
   * Écriture batch
   */
  async batchWrite(operations) {
    try {
      const batch = this.batch();

      operations.forEach(({ type, path, data }) => {
        const docRef = this.doc(path);
        
        switch (type) {
          case 'set':
            batch.set(docRef, {
              ...data,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...data,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur batch write:', error);
      throw error;
    }
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Transaction
   */
  async transaction(updateFunction) {
    try {
      if (!this.db) this.initialize();
      
      const result = await this.db.runTransaction(updateFunction);
      return result;
    } catch (error) {
      console.error('❌ Erreur transaction:', error);
      throw error;
    }
  }

  /**
   * Incrémenter un champ
   */
  async increment(documentPath, field, amount = 1) {
    try {
      await this.update(documentPath, {
        [field]: firebase.firestore.FieldValue.increment(amount)
      });
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur increment ${documentPath}:`, error);
      throw error;
    }
  }

  /**
   * Ajouter à un array
   */
  async arrayUnion(documentPath, field, values) {
    try {
      await this.update(documentPath, {
        [field]: firebase.firestore.FieldValue.arrayUnion(...values)
      });
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur arrayUnion ${documentPath}:`, error);
      throw error;
    }
  }

  /**
   * Retirer d'un array
   */
  async arrayRemove(documentPath, field, values) {
    try {
      await this.update(documentPath, {
        [field]: firebase.firestore.FieldValue.arrayRemove(...values)
      });
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur arrayRemove ${documentPath}:`, error);
      throw error;
    }
  }

  // ==================== HELPERS ====================

  /**
   * Générer un ID unique
   */
  generateId() {
    if (!this.db) this.initialize();
    return this.db.collection('_').doc().id;
  }

  /**
   * Obtenir le timestamp serveur
   */
  getServerTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Supprimer un champ
   */
  getDeleteField() {
    return firebase.firestore.FieldValue.delete();
  }

  /**
   * Vérifier si un document existe
   */
  async exists(documentPath) {
    const doc = await this.doc(documentPath).get();
    return doc.exists;
  }

  /**
   * Compter les documents d'une collection
   */
  async count(collectionPath, options = {}) {
    const result = await this.getCollection(collectionPath, options);
    return result.size;
  }

  /**
   * Créer un index composé (helper pour les logs)
   */
  logCompositeIndexUrl(collectionPath, fields) {
    console.log(`📋 Index composé recommandé pour ${collectionPath}:`);
    console.log(`Champs: ${fields.join(', ')}`);
    console.log('Créez cet index dans la console Firebase Firestore');
  }

  // ==================== OFFLINE ====================

  /**
   * Activer la persistance locale
   */
  async enablePersistence(options = {}) {
    try {
      if (!this.db) this.initialize();
      
      await this.db.enablePersistence({
        synchronizeTabs: options.synchronizeTabs !== false
      });
      return { success: true };
    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Persistance: plusieurs onglets ouverts');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Persistance non supportée');
      }
      throw error;
    }
  }

  /**
   * Désactiver le réseau (mode offline)
   */
  async disableNetwork() {
    try {
      if (!this.db) this.initialize();
      await this.db.disableNetwork();
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur disableNetwork:', error);
      throw error;
    }
  }

  /**
   * Réactiver le réseau
   */
  async enableNetwork() {
    try {
      if (!this.db) this.initialize();
      await this.db.enableNetwork();
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur enableNetwork:', error);
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

export default FirebaseFirestore;
