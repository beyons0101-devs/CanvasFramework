import LayoutComponent, { makeConstraints } from './LayoutComponent.js';

class Grid extends LayoutComponent {
  constructor(framework, options = {}) {
    super(framework, options);
    this.columns = options.columns || 2;
  }

  layout() {
    const constraints = makeConstraints(this);
    const cellWidth =
      (constraints.maxWidth - this.spacing * (this.columns - 1)) / this.columns;

    let x = this.x;
    let y = this.y;
    let col = 0;
    let rowHeight = 0;

    for (const child of this.children) {
      // Mesure de l'enfant selon la contrainte de largeur
      const childSize = child.measure({ ...constraints, maxWidth: cellWidth });
      child.width = childSize.width;
      child.height = childSize.height;

      child.x = x;
      child.y = y;

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
  }
}

export default Grid;
