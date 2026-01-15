// NotificationManager.js
export default class NotificationManager {
  constructor(defaults = {}) {
    this.defaults = {
      icon: defaults.icon || null,
      silent: defaults.silent || false,
      requireInteraction: defaults.requireInteraction || false,
    };

    // Vérifier si l'API est disponible
    this.isSupported = "Notification" in window;
  }

  // Demander la permission si nécessaire
  async requestPermission() {
    if (!this.isSupported) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  // Créer une notification
  async notify(title, options = {}) {
    if (!this.isSupported) {
      console.warn("Notifications API non supportée");
      return null;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;

    const notifOptions = {
      ...this.defaults,
      ...options,
    };

    const notification = new Notification(title, notifOptions);

    // Callbacks
    if (options.onClick) {
      notification.onclick = options.onClick;
    }
    if (options.onClose) {
      notification.onclose = options.onClose;
    }

    // Auto-close après duration (si défini)
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        notification.close();
      }, options.duration);
    }

    return notification;
  }
}
