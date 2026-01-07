// ==========================================
// 5. SECURITY
// ==========================================

class SecurityManager {
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Échapper les caractères HTML dangereux
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static validateUrl(url) {
    try {
      const parsed = new URL(url);
      // Autoriser seulement http(s)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return true;
    } catch {
      return false;
    }
  }

  static rateLimit(fn, limit = 100, window = 1000) {
    const calls = [];
    
    return function(...args) {
      const now = Date.now();
      
      // Nettoyer les appels trop anciens
      while (calls.length && calls[0] < now - window) {
        calls.shift();
      }

      if (calls.length >= limit) {
        console.warn('⚠️ Rate limit exceeded');
        return null;
      }

      calls.push(now);
      return fn.apply(this, args);
    };
  }
}

export default SecurityManager;