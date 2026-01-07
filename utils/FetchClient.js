/**
 * Client HTTP avec cache interne TTL
 * @class
 * @property {Map<string, {data:any, expiresAt:number}>} cache - Cache interne
 * @property {Object} defaultHeaders - Headers par défaut
 * @property {number} defaultTTL - TTL par défaut pour le cache (ms)
 */
class FetchClient {
  /**
   * Crée une instance de FetchClient
   * @param {Object} [options={}]
   * @param {Object} [options.defaultHeaders] - Headers par défaut
   * @param {number} [options.defaultTTL=0] - TTL par défaut en ms (0 = pas de cache)
   */
  constructor(options = {}) {
    this.defaultHeaders = options.defaultHeaders || { 'Content-Type': 'application/json' };
    this.defaultTTL = options.defaultTTL || 0;
    this.cache = new Map();
  }

  /**
   * GET avec cache TTL optionnel
   * @param {string} url - URL de la requête
   * @param {Object} [options] - Options supplémentaires
   * @param {number} [options.ttl] - TTL pour cette requête (ms)
   * @returns {Promise<any>} - Données JSON
   */
  async get(url, options = {}) {
    const ttl = options.ttl ?? this.defaultTTL;

    const cached = this.cache.get(url);
    if (cached && (ttl === 0 || cached.expiresAt > Date.now())) {
      return cached.data;
    }

    const res = await fetch(url, { method: 'GET', headers: this.defaultHeaders });
    if (!res.ok) throw new Error(`Fetch error ${res.status}: ${res.statusText}`);

    const data = await res.json();

    if (ttl > 0) {
      this.cache.set(url, { data, expiresAt: Date.now() + ttl });
    }

    return data;
  }

  /**
   * POST
   * @param {string} url - URL
   * @param {Object} body - Corps de la requête
   * @param {Object} [options] - Options supplémentaires
   * @param {Object} [options.headers] - Headers supplémentaires
   * @returns {Promise<any>} - Données JSON
   */
  async post(url, body, options = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...this.defaultHeaders, ...(options.headers || {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Fetch error ${res.status}: ${res.statusText}`);
    return res.json();
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default FetchClient;
