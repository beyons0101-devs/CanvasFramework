import AppBar from './AppBar.js';

/**
 * FixedContainers — comme AppBar mais sans titre ni icônes,
 * accepte des enfants librement positionnés comme Cards.
 * @class
 * @extends AppBar
 */
class FixedContainers extends AppBar {
  constructor(framework, options = {}, children = []) {
    // On passe à AppBar les options de base mais sans titre ni icônes
    super(framework, {
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: options.width ?? framework.width,
      height: options.height ?? 60,
      bgColor: options.bgColor ?? 'transparent',
      elevation: options.elevation ?? 0,
      // Désactiver tout ce qui est AppBar
      title: '',
      leftIcon: null,
      rightIcon: null,
      platform: 'material', // pour éviter le séparateur iOS
      ...options,
    });

    // Surcharger bgColor car AppBar force une couleur par défaut
    this.bgColor = options.bgColor ?? 'transparent';
	this.borderRadius = options.borderRadius ?? 0;  // ← ajouter cette ligne
    // Système d'enfants comme Cards
    this.children = [];
    this.padding = options.padding ?? 0;
    this.childRelativePositions = new Map();

    if (children && children.length > 0) {
      this.addChildren(children);
    }
  }

  // ── Système d'enfants (copié de Cards) ──────────────────────

  addChildren(children) {
    for (const child of children) {
      this.add(child);
    }
  }

  add(child) {
    this.children.push(child);

    // Retirer du framework si ajouté par le builder
    // (le builder fait framework.add() sur tous les enfants)
    if (this.framework && this.framework.components) {
        const idx = this.framework.components.indexOf(child);
        if (idx > -1) {
            this.framework.components.splice(idx, 1);
        }
    }

    if (child.x !== undefined && child.y !== undefined) {
        this.childRelativePositions.set(child, {
            relativeX: child.x,
            relativeY: child.y
        });
        this.updateChildPosition(child);
    }

    return child;
  }
  
  _handlePress(x, y) {
	  for (const child of this.children) {
		if (!child.visible) continue;
		if (typeof child.isPointInside === 'function' && child.isPointInside(x, y)) {
		  if (typeof child.onPress === 'function' && child.onPress(x, y)) {
			return true;
		  }
		  child.onClick?.();
		  return true;
		}
	  }
	  return false;
  }

  updateChildPosition(child) {
    const relativePos = this.childRelativePositions.get(child);
    if (relativePos) {
      child.x = this.x + this.padding + relativePos.relativeX;
      child.y = this.y + this.padding + relativePos.relativeY;
    }
  }

  setPosition(x, y) {
    super.setPosition(x, y);
    for (const child of this.children) {
      this.updateChildPosition(child);
    }
  }

  setChildPosition(child, relativeX, relativeY) {
    this.childRelativePositions.set(child, { relativeX, relativeY });
    this.updateChildPosition(child);
  }

  // ── Dessin : fond + ombre (AppBar) + enfants (Cards) ────────

  draw(ctx) {
    ctx.save();

    // Ombre via AppBar
    if (this.elevation > 0) {
      ctx.shadowColor   = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur    = this.elevation * 2;
      ctx.shadowOffsetY = this.elevation / 2;
    }

    // Fond
    if (this.bgColor !== 'transparent') {
      ctx.fillStyle = this.bgColor;
      if (this.borderRadius > 0) {
        ctx.beginPath();
        this._roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }

    ctx.shadowColor   = 'transparent';
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    // Enfants
    for (const child of this.children) {
      if (child.visible) child.draw(ctx);
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  isPointInside(x, y) {
    return x >= this.x &&
           x <= this.x + this.width &&
           y >= this.y &&
           y <= this.y + this.height;
  }
}

export default FixedContainers;