import Component from './Component.js';

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
    // À implémenter par Row / Column / Grid
  }

  draw(ctx) {
    // Ne dessine rien
  }
}

export default LayoutComponent;
