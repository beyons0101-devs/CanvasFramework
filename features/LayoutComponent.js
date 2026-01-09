import Component from '../core/Component.js';

export function makeConstraints(component) {
  return {
    minWidth: 0,
    minHeight: 0,
    maxWidth: component.width || Infinity,
    maxHeight: component.height || Infinity
  };
}

class LayoutComponent extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.children = options.children || [];
    this.spacing = options.spacing || 0;
  }

  add(child) {
    this.children.push(child);
    return child;
  }

  layout() {
    // À implémenter par Grid / Row / Column
  }

  // Layout récursif automatique
  layoutRecursive() {
    this.layout(); // calcul des positions/taille des enfants directs
    for (const child of this.children) {
      if (typeof child.layoutRecursive === 'function') {
        child.layoutRecursive(); // appel récursif
      }
    }
  }

  draw(ctx) {
    // Ne dessine rien par défaut, chaque enfant dessinera le sien
  }
}

export default LayoutComponent;
