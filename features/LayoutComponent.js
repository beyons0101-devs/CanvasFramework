import Component from '../core/Component.js';

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

  layout(constraints = makeConstraints(this)) {
    for (const child of this.children) {
      const size = child.measure(constraints);
      child.width = size.width;
      child.height = size.height;

      // layout récursif
      if (child.layout) {
        child.layout({
          minWidth: 0,
          minHeight: 0,
          maxWidth: child.width,
          maxHeight: child.height
        });
      }
    }
  }

  draw(ctx) {}
}

/* ==========================
   Utilitaire pour layout
   ========================== */
export function makeConstraints(component) {
  return {
    minWidth: 0,
    minHeight: 0,
    maxWidth: component.width || Infinity,
    maxHeight: component.height || Infinity
  };
}
