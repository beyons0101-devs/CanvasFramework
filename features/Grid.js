import LayoutComponent from './LayoutComponent.js';

class Grid extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.columns = options.columns || 2;
  }

  layout() {
    const cellWidth =
      (this.width - this.spacing * (this.columns - 1)) / this.columns;

    let x = this.x;
    let y = this.y;
    let col = 0;
    let rowHeight = 0;

    for (const child of this.children) {
      child.x = x;
      child.y = y;
      child.width = cellWidth;

      rowHeight = Math.max(rowHeight, child.height);

      col++;
      if (col === this.columns) {
        col = 0;
        x = this.x;
        y += rowHeight + this.spacing;
        rowHeight = 0;
      } else {
        x += cellWidth + this.spacing;
      }
    }

    this.height = y - this.y + rowHeight;

    // Layout récursif automatique des enfants
    for (const child of this.children) {
      if (typeof child.layoutRecursive === 'function') {
        child.layoutRecursive();
      }
    }
  }
}

export default Grid;
