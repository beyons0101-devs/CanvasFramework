// ==========================================
// 3. ACCESSIBILITY (A11Y)
// ==========================================

class AccessibilityManager {
  constructor(framework) {
    this.framework = framework;
    this.focusedComponent = null;
    this.ariaLiveRegion = null;
    this.setupAccessibility();
  }

  setupAccessibility() {
    // Créer une région ARIA live pour les annonces
    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.setAttribute('role', 'status');
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.style.position = 'absolute';
    this.ariaLiveRegion.style.left = '-10000px';
    this.ariaLiveRegion.style.width = '1px';
    this.ariaLiveRegion.style.height = '1px';
    this.ariaLiveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.ariaLiveRegion);

    // Rendre le canvas accessible au clavier
    this.framework.canvas.setAttribute('tabindex', '0');
    this.framework.canvas.setAttribute('role', 'application');
    this.framework.canvas.setAttribute('aria-label', 'Interactive canvas application');

    // Navigation au clavier
    this.framework.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  announce(message) {
    this.ariaLiveRegion.textContent = message;
    
    // Clear après 100ms pour permettre de ré-annoncer le même message
    setTimeout(() => {
      this.ariaLiveRegion.textContent = '';
    }, 100);
  }

  handleKeyDown(e) {
    const components = this.framework.components.filter(c => c.visible);
    const currentIndex = components.indexOf(this.focusedComponent);

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        const nextIndex = e.shiftKey 
          ? (currentIndex - 1 + components.length) % components.length
          : (currentIndex + 1) % components.length;
        
        this.focusComponent(components[nextIndex]);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this.focusedComponent && this.focusedComponent.onClick) {
          this.focusedComponent.onClick();
          this.announce(`Activated: ${this.getComponentLabel(this.focusedComponent)}`);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.blur();
        break;
    }
  }

  focusComponent(component) {
    if (this.focusedComponent) {
      this.focusedComponent.focused = false;
    }

    this.focusedComponent = component;
    component.focused = true;

    // Annoncer le composant focalisé
    this.announce(`Focused: ${this.getComponentLabel(component)}`);
  }

  blur() {
    if (this.focusedComponent) {
      this.focusedComponent.focused = false;
      this.focusedComponent = null;
    }
  }

  getComponentLabel(component) {
    return component.text || 
           component.label || 
           component.ariaLabel || 
           component.constructor.name;
  }

  destroy() {
    if (this.ariaLiveRegion) {
      this.ariaLiveRegion.remove();
    }
  }
}

export default AccessibilityManager;