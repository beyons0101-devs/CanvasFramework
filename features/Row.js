import LayoutComponent, { makeConstraints } from './LayoutComponent.js';

class Row extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.align = options.align || 'start'; // start | center | end | stretch
  }

  layout() {
    const constraints = makeConstraints(this);
    let x = this.x;
    let maxHeight = 0;

    for (const child of this.children) {
      const childSize = child.measure(constraints);
      child.width = childSize.width;
      child.height = childSize.height;

      child.x = x;

      if (this.align === 'center') {
        child.y = this.y + (this.height - child.height) / 2;
      } else if (this.align === 'end') {
        child.y = this.y + this.height - child.height;
      } else if (this.align === 'stretch') {
        child.y = this.y;
        child.height = this.height;
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
