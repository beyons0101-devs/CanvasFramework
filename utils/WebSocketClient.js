/**
 * Client WebSocket avec events et JSON automatique
 * @class
 * @property {string} url - URL du serveur WebSocket
 * @property {WebSocket|null} ws - Instance WebSocket
 * @property {Object<string, Function[]>} listeners - Listeners par event ('open','message','close','error')
 */
class WebSocketClient {
  /**
   * Crée une instance de WebSocketClient
   * @param {string} url - URL du serveur WS
   */
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.listeners = { open: [], message: [], close: [], error: [] };
  }

  /**
   * Connexion au serveur WebSocket
   */
  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = (e) => this.listeners.open.forEach(fn => fn(e));
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.listeners.message.forEach(fn => fn(data));
      } catch {
        this.listeners.message.forEach(fn => fn(e.data));
      }
    };
    this.ws.onclose = (e) => this.listeners.close.forEach(fn => fn(e));
    this.ws.onerror = (e) => this.listeners.error.forEach(fn => fn(e));
  }

  /**
   * Envoie des données
   * @param {any} data - Données JSON ou string
   */
  send(data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    this.ws.send(JSON.stringify(data));
  }

  /**
   * Écoute un event
   * @param {'open'|'message'|'close'|'error'} event - Nom de l'event
   * @param {Function} callback - Callback
   */
  on(event, callback) {
    if (this.listeners[event]) this.listeners[event].push(callback);
  }

  /**
   * Déconnecte le WebSocket
   */
  disconnect() {
    if (this.ws) this.ws.close();
  }
}

export default WebSocketClient;
