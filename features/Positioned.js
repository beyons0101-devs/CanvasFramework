import Component from '../core/Component.js';

class Positioned extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.child = options.child;
    this.left = options.left;
    this.top = options.top;
    this.right = options.right;
    this.bottom = options.bottom;
  }

  layout() {
    if (!this.child) return;

    // Position selon les contraintes
    if (this.left !== undefined) this.child.x = this.left;
    else if (this.right !== undefined) this.child.x = this.width - this.child.width - this.right;
    else this.child.x = 0;

    if (this.top !== undefined) this.child.y = this.top;
    else if (this.bottom !== undefined) this.child.y = this.height - this.child.height - this.bottom;
    else this.child.y = 0;

    this.child.layout && this.child.layout();
  }

  draw(ctx) {
    this.child && this.child.draw(ctx);
  }
}

export default Positioned;
