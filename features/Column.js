import LayoutComponent, { makeConstraints } from './LayoutComponent.js';

class Column extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.align = options.align || 'start'; // start | center | end | stretch
  }

  layout() {
    const constraints = makeConstraints(this);
    let y = this.y;
    let maxWidth = 0;

    for (const child of this.children) {
      const childSize = child.measure(constraints);
      child.width = childSize.width;
      child.height = childSize.height;

      child.y = y;

      if (this.align === 'center') {
        child.x = this.x + (this.width - child.width) / 2;
      } else if (this.align === 'end') {
        child.x = this.x + this.width - child.width;
      } else if (this.align === 'stretch') {
        child.x = this.x;
        child.width = this.width;
      } else {
        child.x = this.x;
      }

      y += child.height + this.spacing;
      maxWidth = Math.max(maxWidth, child.width);
    }

    this.height = y - this.y - this.spacing;
    if (!this.width) this.width = maxWidth;
  }
}

export default Column;
