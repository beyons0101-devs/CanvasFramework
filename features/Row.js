import LayoutComponent from './LayoutComponent.js';

class Row extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.align = options.align || 'start'; // start | center | end
  }

  layout() {
    let x = this.x;
    let maxHeight = 0;

    for (const child of this.children) {
      child.x = x;

      if (this.align === 'center') {
        child.y = this.y + (this.height - child.height) / 2;
      } else if (this.align === 'end') {
        child.y = this.y + this.height - child.height;
      } else {
        child.y = this.y;
      }

      x += child.width + this.spacing;
      maxHeight = Math.max(maxHeight, child.height);
    }

    this.width = x - this.x - this.spacing;
    if (!this.height) this.height = maxHeight;

    // Layout récursif automatique des enfants
    for (const child of this.children) {
      if (typeof child.layoutRecursive === 'function') {
        child.layoutRecursive();
      }
    }
  }
}

export default Row;
