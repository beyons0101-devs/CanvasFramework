/**
 * Système de stockage sécurisé avec chiffrement AES-GCM
 * @class
 * @example
 * const storage = new SecureStorage('myapp_');
 * await storage.init('password123');
 * await storage.setSecure('token', 'secret-token');
 * const token = await storage.getSecure('token');
 */
class SecureStorage {
  /**
   * @constructs SecureStorage
   * @param {string} [prefix='app_'] - Préfixe pour les clés localStorage
   */
  constructor(prefix = 'app_') {
    /** @type {string} */
    this.prefix = prefix;
    /** @type {CryptoKey|null} */
    this.encryptionKey = null;
    /** @type {Map<string, any>} */
    this.memoryCache = new Map();
  }

  /**
   * Initialiser avec une clé de chiffrement
   * @param {string} password - Mot de passe pour générer la clé de chiffrement
   * @returns {Promise<boolean>} True si l'initialisation a réussi
   */
  async init(password) {
    try {
      // Générer une clé de chiffrement à partir du password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      
      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      
      return true;
    } catch (error) {
      console.error('Failed to initialize SecureStorage:', error);
      return false;
    }
  }

  /**
   * Chiffrer des données
   * @param {*} data - Données à chiffrer
   * @returns {Promise<string>} Données chiffrées en base64
   * @throws {Error} Si SecureStorage n'est pas initialisé
   * @private
   */
  async encrypt(data) {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized. Call init() first.');
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      
      // Générer un IV aléatoire
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Chiffrer
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        dataBuffer
      );
      
      // Combiner IV et données chiffrées
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Convertir en base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Déchiffrer des données
   * @param {string} encryptedData - Données chiffrées en base64
   * @returns {Promise<*>} Données déchiffrées
   * @throws {Error} Si SecureStorage n'est pas initialisé
   * @private
   */
  async decrypt(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized. Call init() first.');
    }

    try {
      // Décoder base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extraire IV et données
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      // Déchiffrer
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );
      
      // Décoder et parser
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder une valeur de manière sécurisée (chiffrée)
   * @param {string} key - Clé de stockage
   * @param {*} value - Valeur à sauvegarder
   * @returns {Promise<boolean>} True si la sauvegarde a réussi
   */
  async setSecure(key, value) {
    try {
      const encrypted = await this.encrypt(value);
      localStorage.setItem(this.prefix + key, encrypted);
      this.memoryCache.set(key, value);
      return true;
    } catch (error) {
      console.error('Failed to save secure data:', error);
      return false;
    }
  }

  /**
   * Récupérer une valeur de manière sécurisée (déchiffrée)
   * @param {string} key - Clé de stockage
   * @param {*} [defaultValue=null] - Valeur par défaut si la clé n'existe pas
   * @returns {Promise<*>} Valeur déchiffrée ou valeur par défaut
   */
  async getSecure(key, defaultValue = null) {
    try {
      // Vérifier le cache mémoire
      if (this.memoryCache.has(key)) {
        return this.memoryCache.get(key);
      }
      
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) {
        return defaultValue;
      }
      
      const value = await this.decrypt(encrypted);
      this.memoryCache.set(key, value);
      return value;
    } catch (error) {
      console.error('Failed to get secure data:', error);
      return defaultValue;
    }
  }

  /**
   * Sauvegarder une valeur en clair (pour données non sensibles)
   * @param {string} key - Clé de stockage
   * @param {*} value - Valeur à sauvegarder
   * @returns {boolean} True si la sauvegarde a réussi
   */
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  /**
   * Récupérer une valeur en clair
   * @param {string} key - Clé de stockage
   * @param {*} [defaultValue=null] - Valeur par défaut si la clé n'existe pas
   * @returns {*} Valeur ou valeur par défaut
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to get data:', error);
      return defaultValue;
    }
  }

  /**
   * Supprimer une clé
   * @param {string} key - Clé à supprimer
   */
  remove(key) {
    localStorage.removeItem(this.prefix + key);
    this.memoryCache.delete(key);
  }

  /**
   * Vérifier si une clé existe
   * @param {string} key - Clé à vérifier
   * @returns {boolean} True si la clé existe
   */
  has(key) {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  /**
   * Vider le cache mémoire
   */
  clearCache() {
    this.memoryCache.clear();
  }

  /**
   * Tout supprimer (données avec le préfixe)
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
    this.clearCache();
  }

  /**
   * Obtenir toutes les clés
   * @returns {string[]} Liste des clés (sans le préfixe)
   */
  keys() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.substring(this.prefix.length));
  }

  /**
   * Exporter toutes les données de manière sécurisée
   * @returns {Promise<string>} Données chiffrées contenant toutes les clés/valeurs
   */
  async exportSecure() {
    const data = {};
    const keys = this.keys();
    
    for (const key of keys) {
      data[key] = await this.getSecure(key);
    }
    
    return await this.encrypt(data);
  }

  /**
   * Importer des données de manière sécurisée
   * @param {string} encryptedData - Données chiffrées exportées
   * @returns {Promise<boolean>} True si l'import a réussi
   */
  async importSecure(encryptedData) {
    try {
      const data = await this.decrypt(encryptedData);
      
      for (const [key, value] of Object.entries(data)) {
        await this.setSecure(key, value);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

export default SecureStorage;