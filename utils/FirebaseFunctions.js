/**
 * FirebaseFunctions - Utilitaire pour Firebase Cloud Functions
 * 
 * @example
 * const functions = new FirebaseFunctions(firebaseCore);
 * const result = await functions.call('addMessage', { text: 'Hello World' });
 */
class FirebaseFunctions {
  constructor(firebaseCore, region = 'us-central1') {
    this.core = firebaseCore;
    this.region = region;
    this.functions = null;
  }

  /**
   * Initialiser Functions
   */
  initialize() {
    if (!this.functions) {
      this.functions = this.core.getFunctions(this.region);
    }
    return this.functions;
  }

  /**
   * Appeler une Cloud Function
   */
  async call(functionName, data = {}) {
    try {
      if (!this.functions) this.initialize();
      
      const callable = this.functions.httpsCallable(functionName);
      const result = await callable(data);
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error(`❌ Erreur call ${functionName}:`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Appeler une fonction avec timeout personnalisé
   */
  async callWithTimeout(functionName, data = {}, timeoutMs = 60000) {
    try {
      if (!this.functions) this.initialize();
      
      const callable = this.functions.httpsCallable(functionName, {
        timeout: timeoutMs
      });
      
      const result = await callable(data);
      
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error(`❌ Erreur callWithTimeout ${functionName}:`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Formater les erreurs
   */
  formatError(error) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      originalError: error
    };
  }

  /**
   * Utiliser l'émulateur local
   */
  useEmulator(host = 'localhost', port = 5001) {
    if (!this.functions) this.initialize();
    
    this.functions.useEmulator(host, port);
  }

  /**
   * Nettoyer les ressources
   */
  destroy() {
    this.functions = null;
  }
}

export default FirebaseFunctions;
