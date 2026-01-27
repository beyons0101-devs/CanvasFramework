/**
 * FirebaseCore - Classe de base pour initialiser Firebase
 * 
 * @example
 * const firebase = new FirebaseCore({
 *   apiKey: "YOUR_API_KEY",
 *   authDomain: "YOUR_PROJECT.firebaseapp.com",
 *   projectId: "YOUR_PROJECT_ID",
 *   storageBucket: "YOUR_PROJECT.appspot.com",
 *   messagingSenderId: "YOUR_SENDER_ID",
 *   appId: "YOUR_APP_ID"
 * });
 * await firebase.initialize();
 */
class FirebaseCore {
  constructor(config) {
    this.config = config;
    this.app = null;
    this.isInitialized = false;
    
    // Options
    this.enablePersistence = config.enablePersistence !== false;
    this.enableAnalytics = config.enableAnalytics !== false;
    
    // Références aux services
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.functions = null;
    this.messaging = null;
    this.analytics = null;
  }

  /**
   * Initialiser Firebase
   */
  async initialize() {
    if (this.isInitialized) {
      return this.app;
    }

    try {
      // Charger les scripts Firebase
      await this.loadFirebaseScripts();

      // Initialiser l'app Firebase
      this.app = firebase.initializeApp(this.config);

      // Initialiser Analytics si activé
      if (this.enableAnalytics && firebase.analytics) {
        this.analytics = firebase.analytics();
      }

      this.isInitialized = true;

      return this.app;

    } catch (error) {
      console.error('❌ Erreur initialisation Firebase:', error);
      throw error;
    }
  }

  /**
   * Charger les scripts Firebase depuis le CDN
   */
  async loadFirebaseScripts() {
    const version = '9.23.0'; // Version Firebase

    const scripts = [
      `https://www.gstatic.com/firebasejs/${version}/firebase-app-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-auth-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-database-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-firestore-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-storage-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-functions-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-messaging-compat.js`,
      `https://www.gstatic.com/firebasejs/${version}/firebase-analytics-compat.js`
    ];

    // Charger tous les scripts en parallèle
    await Promise.all(scripts.map(src => this.loadScript(src)));
  }

  /**
   * Charger un script
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Vérifier si le script est déjà chargé
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Échec du chargement: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Obtenir l'instance Firebase
   */
  getApp() {
    if (!this.isInitialized) {
      throw new Error('Firebase non initialisé. Appelez initialize() d\'abord.');
    }
    return this.app;
  }

  /**
   * Obtenir un service Firebase
   */
  getAuth() {
    if (!this.auth) {
      this.auth = firebase.auth();
    }
    return this.auth;
  }

  getDatabase() {
    if (!this.db) {
      this.db = firebase.database();
    }
    return this.db;
  }

  getFirestore() {
    if (!this.firestore) {
      this.firestore = firebase.firestore();
      
      // Activer la persistance si demandé
      if (this.enablePersistence) {
        this.firestore.enablePersistence({ synchronizeTabs: true })
          .catch(err => {
            if (err.code === 'failed-precondition') {
              console.warn('⚠️ Persistance: plusieurs onglets ouverts');
            } else if (err.code === 'unimplemented') {
              console.warn('⚠️ Persistance non supportée par ce navigateur');
            }
          });
      }
    }
    return this.firestore;
  }

  getStorage() {
    if (!this.storage) {
      this.storage = firebase.storage();
    }
    return this.storage;
  }

  getFunctions(region = 'us-central1') {
    if (!this.functions) {
      this.functions = firebase.functions(region);
    }
    return this.functions;
  }

  getMessaging() {
    if (!this.messaging) {
      this.messaging = firebase.messaging();
    }
    return this.messaging;
  }

  getAnalytics() {
    if (!this.analytics) {
      this.analytics = firebase.analytics();
    }
    return this.analytics;
  }

  /**
   * Obtenir le timestamp serveur
   */
  getServerTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
  }

  /**
   * Obtenir le timestamp Firestore serveur
   */
  getFirestoreServerTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Logger un événement Analytics
   */
  logEvent(eventName, eventParams = {}) {
    if (this.analytics) {
      this.analytics.logEvent(eventName, eventParams);
    }
  }

  /**
   * Définir l'utilisateur pour Analytics
   */
  setUserId(userId) {
    if (this.analytics) {
      this.analytics.setUserId(userId);
    }
  }

  /**
   * Définir une propriété utilisateur
   */
  setUserProperty(name, value) {
    if (this.analytics) {
      this.analytics.setUserProperties({ [name]: value });
    }
  }

  /**
   * Vérifier si Firebase est initialisé
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Nettoyer les ressources
   */
  destroy() {
    if (this.app) {
      this.app.delete();
      this.app = null;
    }
    
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.functions = null;
    this.messaging = null;
    this.analytics = null;
    this.isInitialized = false;
  }
}

export default FirebaseCore;
