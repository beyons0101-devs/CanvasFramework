/**
 * Gestionnaire de cryptographie pour le Canvas Framework
 * Utilise l'API Web Crypto (SubtleCrypto) pour un chiffrement sécurisé
 * @class
 */
class CryptoManager {
  constructor() {
    // Vérifier la disponibilité de l'API Crypto
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API is not available in this browser');
    }
    
    this.crypto = window.crypto.subtle;
    
    // Algorithme par défaut
    this.algorithm = {
      name: 'AES-GCM',
      length: 256
    };
    
    // Stockage des clés en mémoire (pas dans localStorage !)
    this._keys = new Map();
  }

  /**
   * Génère une clé de chiffrement aléatoire
   * @param {string} keyName - Nom de la clé pour référence ultérieure
   * @returns {Promise<CryptoKey>}
   */
  async generateKey(keyName = 'default') {
    const key = await this.crypto.generateKey(
      {
        name: this.algorithm.name,
        length: this.algorithm.length
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    
    this._keys.set(keyName, key);
    return key;
  }

  /**
   * Importe une clé depuis une chaîne (base64)
   * @param {string} keyString - Clé au format base64
   * @param {string} keyName - Nom de la clé
   * @returns {Promise<CryptoKey>}
   */
  async importKey(keyString, keyName = 'default') {
    const keyBuffer = this._base64ToBuffer(keyString);
    
    const key = await this.crypto.importKey(
      'raw',
      keyBuffer,
      { name: this.algorithm.name },
      true,
      ['encrypt', 'decrypt']
    );
    
    this._keys.set(keyName, key);
    return key;
  }

  /**
   * Exporte une clé au format base64
   * @param {string} keyName - Nom de la clé
   * @returns {Promise<string>}
   */
  async exportKey(keyName = 'default') {
    const key = this._keys.get(keyName);
    if (!key) {
      throw new Error(`Key "${keyName}" not found`);
    }
    
    const exported = await this.crypto.exportKey('raw', key);
    return this._bufferToBase64(exported);
  }

  /**
   * Dérive une clé depuis un mot de passe
   * @param {string} password - Mot de passe
   * @param {string} keyName - Nom de la clé
   * @param {string} salt - Salt (optionnel, généré automatiquement)
   * @returns {Promise<{key: CryptoKey, salt: string}>}
   */
  async deriveKeyFromPassword(password, keyName = 'default', salt = null) {
    // Générer ou utiliser le salt fourni
    const saltBuffer = salt 
      ? this._base64ToBuffer(salt)
      : window.crypto.getRandomValues(new Uint8Array(16));
    
    // Encoder le mot de passe
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Importer le mot de passe comme clé
    const keyMaterial = await this.crypto.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Dériver la clé
    const key = await this.crypto.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm.name, length: this.algorithm.length },
      true,
      ['encrypt', 'decrypt']
    );
    
    this._keys.set(keyName, key);
    
    return {
      key,
      salt: this._bufferToBase64(saltBuffer)
    };
  }

  /**
   * Chiffre des données
   * @param {any} data - Données à chiffrer (sera converti en JSON)
   * @param {string} keyName - Nom de la clé à utiliser
   * @returns {Promise<{encrypted: string, iv: string}>}
   */
  async encrypt(data, keyName = 'default') {
    const key = this._keys.get(keyName);
    if (!key) {
      throw new Error(`Key "${keyName}" not found. Generate or import a key first.`);
    }
    
    // Convertir les données en JSON puis en buffer
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    
    // Générer un IV (Initialization Vector) aléatoire
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Chiffrer
    const encryptedBuffer = await this.crypto.encrypt(
      {
        name: this.algorithm.name,
        iv: iv
      },
      key,
      dataBuffer
    );
    
    return {
      encrypted: this._bufferToBase64(encryptedBuffer),
      iv: this._bufferToBase64(iv)
    };
  }

  /**
   * Déchiffre des données
   * @param {string} encryptedData - Données chiffrées (base64)
   * @param {string} iv - IV utilisé lors du chiffrement (base64)
   * @param {string} keyName - Nom de la clé à utiliser
   * @param {boolean} parseJson - Parser le résultat en JSON (true par défaut)
   * @returns {Promise<any>}
   */
  async decrypt(encryptedData, iv, keyName = 'default', parseJson = true) {
    const key = this._keys.get(keyName);
    if (!key) {
      throw new Error(`Key "${keyName}" not found. Generate or import a key first.`);
    }
    
    // Convertir les chaînes base64 en buffers
    const encryptedBuffer = this._base64ToBuffer(encryptedData);
    const ivBuffer = this._base64ToBuffer(iv);
    
    // Déchiffrer
    const decryptedBuffer = await this.crypto.decrypt(
      {
        name: this.algorithm.name,
        iv: ivBuffer
      },
      key,
      encryptedBuffer
    );
    
    // Convertir le buffer en string
    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);
    
    // Parser en JSON si demandé
    if (parseJson) {
      try {
        return JSON.parse(decryptedString);
      } catch (e) {
        // Si le parsing échoue, retourner la chaîne brute
        return decryptedString;
      }
    }
    
    return decryptedString;
  }

  /**
   * Chiffre et encode en une seule chaîne (pratique pour stockage)
   * @param {any} data - Données à chiffrer
   * @param {string} keyName - Nom de la clé
   * @returns {Promise<string>} - Chaîne contenant données chiffrées + IV
   */
  async encryptToString(data, keyName = 'default') {
    const { encrypted, iv } = await this.encrypt(data, keyName);
    return `${encrypted}.${iv}`;
  }

  /**
   * Déchiffre depuis une chaîne créée par encryptToString
   * @param {string} encryptedString - Chaîne chiffrée
   * @param {string} keyName - Nom de la clé
   * @param {boolean} parseJson - Parser en JSON
   * @returns {Promise<any>}
   */
  async decryptFromString(encryptedString, keyName = 'default', parseJson = true) {
    const [encrypted, iv] = encryptedString.split('.');
    if (!encrypted || !iv) {
      throw new Error('Invalid encrypted string format');
    }
    return this.decrypt(encrypted, iv, keyName, parseJson);
  }

  /**
   * Hash une chaîne (non réversible)
   * @param {string} data - Données à hasher
   * @param {string} algorithm - Algorithme (SHA-256, SHA-384, SHA-512)
   * @returns {Promise<string>} - Hash en base64
   */
  async hash(data, algorithm = 'SHA-256') {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await this.crypto.digest(algorithm, dataBuffer);
    return this._bufferToBase64(hashBuffer);
  }

  /**
   * Génère un token aléatoire sécurisé
   * @param {number} length - Longueur en octets (32 par défaut)
   * @returns {string} - Token en base64
   */
  generateToken(length = 32) {
    const buffer = window.crypto.getRandomValues(new Uint8Array(length));
    return this._bufferToBase64(buffer);
  }

  /**
   * Supprime une clé de la mémoire
   * @param {string} keyName - Nom de la clé
   */
  deleteKey(keyName) {
    this._keys.delete(keyName);
  }

  /**
   * Supprime toutes les clés
   */
  deleteAllKeys() {
    this._keys.clear();
  }

  /**
   * Liste les clés disponibles
   * @returns {string[]}
   */
  listKeys() {
    return Array.from(this._keys.keys());
  }

  // ===== Méthodes utilitaires =====

  _bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default CryptoManager;