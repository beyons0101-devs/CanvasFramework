import LayoutComponent from './LayoutComponent.js';
import { makeConstraints } from './LayoutComponent.js';

class Row extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.align = options.align || 'start';
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
  }
}

export default Row;
