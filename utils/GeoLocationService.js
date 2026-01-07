/**
 * Service de géolocalisation (point ou suivi continu)
 * @class
 * @property {number|null} watchId - ID du watch geolocation
 */
class GeoLocationService {
  constructor() {
    this.watchId = null;
  }

  /**
   * Obtient la position actuelle
   * @param {PositionOptions} [options] - Options de geolocation
   * @returns {Promise<{latitude:number, longitude:number, accuracy:number}>}
   */
  getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        reject,
        options
      );
    });
  }

  /**
   * Suivi de position en continu
   * @param {Function} callback - Callback appelé à chaque mise à jour
   * @param {PositionOptions} [options] - Options de geolocation
   */
  watchPosition(callback, options = {}) {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => callback({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      (err) => console.error("Geolocation error:", err),
      options
    );
  }

  /**
   * Arrête le suivi continu
   */
  clearWatch() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export default GeoLocationService;
