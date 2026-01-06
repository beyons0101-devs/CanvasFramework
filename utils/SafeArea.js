/**
 * Gestion des zones sûres (safe area) pour les appareils avec encoches ou barres de navigation
 * @class
 * @static
 * @example
 * SafeArea.detect();
 * SafeArea.applyToComponent(myComponent);
 */
class SafeArea {
  /** @type {number} */
  static top = 0;
  /** @type {number} */
  static bottom = 0;
  /** @type {number} */
  static left = 0;
  /** @type {number} */
  static right = 0;
  
  /**
   * Détecte et définit les marges de safe area en fonction de l'appareil
   * @static
   */
  static detect() {
    // Détecter l'iPhone X et supérieur (notch)
    const isIPhoneX = /iPhone/.test(navigator.userAgent) && window.screen.height >= 812;
    
    if (isIPhoneX) {
      // Portrait
      if (window.innerHeight > window.innerWidth) {
        this.top = 44; // Status bar + notch
        this.bottom = 34; // Home indicator
      } else {
        // Landscape
        this.top = 0;
        this.bottom = 21;
        this.left = 44;
        this.right = 44;
      }
    }
    
    // Détecter Android avec notch via CSS
    if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
      const style = getComputedStyle(document.documentElement);
      this.top = parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0;
      this.bottom = parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0;
      this.left = parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0;
      this.right = parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0;
    }
  }
  
  /**
   * Applique les marges de safe area à un composant
   * @static
   * @param {Component} component - Composant à ajuster
   */
  static applyToComponent(component) {
    component.y += this.top;
    component.x += this.left;
    component.width -= (this.left + this.right);
    component.height -= (this.top + this.bottom);
  }
}

export default SafeArea;