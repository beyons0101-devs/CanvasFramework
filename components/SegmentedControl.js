import Component from '../core/Component.js';

/**
 * Segmented Control (Material + Cupertino)
 * @class
 * @extends Component
 * @param {CanvasFramework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {Array<{text: string, onClick?: Function}>} [options.buttons] - Liste des segments
 * @param {number} [options.selectedIndex=0] - Segment sélectionné par défaut
 * @param {number} [options.height=40] - Hauteur du contrôle
 * @param {number} [options.spacing=1] - Espacement entre les segments
 */
class SegmentedControl extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    /**
     * Plateforme : "material" ou "cupertino"
     * @type {string}
     */
    this.platform = framework.platform;

    /**
     * Liste des boutons
     * @type {Array<{text: string, onClick?: Function}>}
     */
    this.buttons = options.buttons || [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }];

    /**
     * Index du segment sélectionné
     * @type {number}
     */
    this.selectedIndex = options.selectedIndex || 0;

    /**
     * Hauteur du contrôle
     * @type {number}
     */
    this.height = options.height || 40;

    /**
     * Espacement entre segments
     * @type {number}
     */
    this.spacing = options.spacing || 1;

    /**
     * Ripples Material
     * @type {Array<{x: number, y: number, index: number, radius: number, maxRadius: number, opacity: number}>}
     */
    this.ripples = [];

    /**
     * Index temporaire pressé pour Cupertino
     * @type {number|null}
     */
    this.pressedIndex = null;
  }

  /**
   * Gère la pression sur un segment
   * @param {number} x - Coordonnée X du clic
   * @param {number} y - Coordonnée Y du clic
   */
  handlePress(x, y) {
    const index = this.getButtonIndexAt(x, y);
    if (index !== null) {
      if (this.platform === 'material') {
        const btnWidth = (this.width - this.spacing * (this.buttons.length - 1)) / this.buttons.length;
        const btnX = this.x + index * (btnWidth + this.spacing);
        this.ripples.push({
          x: x - btnX,
          y: y - this.y,
          index: index,
          radius: 0,
          maxRadius: Math.max(btnWidth, this.height) * 1.5,
          opacity: 1
        });
        this.animateRipple();
      } else {
        this.pressedIndex = index;
        setTimeout(() => this.pressedIndex = null, 150);
      }

      this.selectedIndex = index;
      if (this.buttons[index].onClick) this.buttons[index].onClick(index);
    }
  }

  /**
   * Anime les ripples Material
   * @private
   */
  animateRipple() {
    const animate = () => {
      let active = false;
      for (let ripple of this.ripples) {
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += ripple.maxRadius / 15;
          active = true;
        }
        if (ripple.radius >= ripple.maxRadius * 0.5) ripple.opacity -= 0.05;
      }
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      if (active) requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Retourne l'index du bouton sous un point donné
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {number|null} Index du segment ou null
   * @private
   */
  getButtonIndexAt(x, y) {
    const btnWidth = (this.width - this.spacing * (this.buttons.length - 1)) / this.buttons.length;
    if (y < this.y || y > this.y + this.height) return null;
    for (let i = 0; i < this.buttons.length; i++) {
      const btnX = this.x + i * (btnWidth + this.spacing);
      if (x >= btnX && x <= btnX + btnWidth) return i;
    }
    return null;
  }

  /**
   * Dessine le SegmentedControl
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    const btnWidth = (this.width - this.spacing * (this.buttons.length - 1)) / this.buttons.length;

    this.buttons.forEach((btn, i) => {
      const btnX = this.x + i * (btnWidth + this.spacing);

      // Background
      if (this.platform === 'material') {
        ctx.fillStyle = this.selectedIndex === i ? '#6200EE' : '#E0E0E0';
      } else {
        ctx.fillStyle = this.selectedIndex === i ? '#007AFF' : '#F0F0F0';
        if (this.pressedIndex === i) ctx.fillStyle = '#D9D9D9';
      }

      const radius = this.height / 2;
      ctx.beginPath();
      if (i === 0) {
        ctx.moveTo(btnX + radius, this.y);
        ctx.lineTo(btnX + btnWidth, this.y);
        ctx.lineTo(btnX + btnWidth, this.y + this.height);
        ctx.lineTo(btnX + radius, this.y + this.height);
        ctx.quadraticCurveTo(btnX, this.y + this.height, btnX, this.y + this.height - radius);
        ctx.lineTo(btnX, this.y + radius);
        ctx.quadraticCurveTo(btnX, this.y, btnX + radius, this.y);
      } else if (i === this.buttons.length - 1) {
        ctx.moveTo(btnX, this.y);
        ctx.lineTo(btnX + btnWidth - radius, this.y);
        ctx.quadraticCurveTo(btnX + btnWidth, this.y, btnX + btnWidth, this.y + radius);
        ctx.lineTo(btnX + btnWidth, this.y + this.height - radius);
        ctx.quadraticCurveTo(btnX + btnWidth, this.y + this.height, btnX + btnWidth - radius, this.y + this.height);
        ctx.lineTo(btnX, this.y + this.height);
      } else {
        ctx.rect(btnX, this.y, btnWidth, this.height);
      }
      ctx.fill();

      // Texte
      ctx.fillStyle = this.platform === 'material'
        ? (this.selectedIndex === i ? '#FFF' : '#000')
        : (this.selectedIndex === i ? '#FFF' : '#000');
      ctx.font = `${this.height / 2}px -apple-system, Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text || `Button ${i + 1}`, btnX + btnWidth / 2, this.y + this.height / 2);
    });

    // Ripples Material
    if (this.platform === 'material' && this.ripples.length) {
      ctx.save();
      this.ripples.forEach(r => {
        const btnX = this.x + r.index * (btnWidth + this.spacing);
        ctx.beginPath();
        ctx.arc(btnX + r.x, this.y + r.y, r.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${r.opacity})`;
        ctx.fill();
      });
      ctx.restore();
    }
  }

  /**
   * Vérifie si un point est dans le contrôle
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si un segment est touché
   */
  isPointInside(x, y) {
    return this.getButtonIndexAt(x, y) !== null;
  }
}

export default SegmentedControl;
