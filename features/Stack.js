import LayoutComponent from './LayoutComponent.js';

class Stack extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
  }

  layoutRecursive() {
    for (const child of this.children) {
      child.layoutRecursive ? child.layoutRecursive() : child.layout?.();
    }
  }

  draw(ctx) {
    for (const child of this.children) {
      child.draw(ctx);
    }
  }
}

export default Stack;
