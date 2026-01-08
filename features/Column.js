import LayoutComponent from './LayoutComponent.js';

class Column extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.align = options.align || 'start'; 
    // start | center | end | stretch
  }

  layout() {
    let y = this.y;
    let maxWidth = 0;

    for (const child of this.children) {
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
