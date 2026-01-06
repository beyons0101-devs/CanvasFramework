import Component from '../core/Component.js';
/**
 * Accordéon (section extensible)
 * @class
 * @extends Component
 * @property {string} title - Titre
 * @property {string} content - Contenu
 * @property {string|null} icon - Icône
 * @property {boolean} expanded - Déplié
 * @property {string} platform - Plateforme
 * @property {number} headerHeight - Hauteur de l'en-tête
 * @property {number} contentPadding - Padding du contenu
 * @property {string} bgColor - Couleur de fond
 * @property {string} borderColor - Couleur de la bordure
 * @property {Function} onToggle - Callback au toggle
 * @property {boolean} animating - En cours d'animation
 * @property {number} animProgress - Progression de l'animation
 * @property {number} contentHeight - Hauteur du contenu
 */
class Accordion extends Component {
  /**
   * Crée une instance de Accordion
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title=''] - Titre
   * @param {string} [options.content=''] - Contenu
   * @param {string} [options.icon] - Icône
   * @param {boolean} [options.expanded=false] - Déplié initialement
   * @param {Function} [options.onToggle] - Callback au toggle
   * @param {string} [options.bgColor='#FFFFFF'] - Couleur de fond
   * @param {string} [options.borderColor='#E0E0E0'] - Couleur de bordure
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.title = options.title || '';
    this.content = options.content || '';
    this.icon = options.icon || null;
    this.expanded = options.expanded || false;
    this.platform = framework.platform;
    this.headerHeight = 56;
    this.contentPadding = 16;
    this.bgColor = options.bgColor || '#FFFFFF';
    this.borderColor = options.borderColor || '#E0E0E0';
    this.onToggle = options.onToggle;
    this.animating = false;
    this.animProgress = this.expanded ? 1 : 0;
    
    // Calculer la hauteur du contenu
    this.calculateContentHeight();
    this.height = this.headerHeight + (this.expanded ? this.contentHeight : 0);
    
    // CORRECTION: Bloquer les clics pendant l'animation
    this.onClick = () => {
      // Ignorer les clics pendant l'animation
      if (this.animating) {
        return;
      }
      this.toggle();
    };
  }
  
  /**
   * Calcule la hauteur du contenu
   * @private
   */
  calculateContentHeight() {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = '14px -apple-system, sans-serif';
    
    // Diviser le contenu en lignes
    const maxWidth = this.width - (this.contentPadding * 2);
    const lines = this.wrapText(ctx, this.content, maxWidth);
    const lineHeight = 20;
    
    ctx.restore();
    this.contentHeight = lines.length * lineHeight + (this.contentPadding * 2);
  }
  
  /**
   * Divise le texte en lignes
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {string} text - Texte
   * @param {number} maxWidth - Largeur maximale
   * @returns {string[]} Tableau de lignes
   * @private
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
  
  /**
   * Alterne l'état déplié/replié
   */
  toggle() {
    // Empêcher les toggles multiples pendant l'animation
    if (this.animating) return;
    
    this.expanded = !this.expanded;
    if (this.onToggle) this.onToggle(this.expanded);
    this.animate();
  }
  
  /**
   * Anime le toggle
   * @private
   */
  animate() {
    if (this.animating) return;
    this.animating = true;
    
    const target = this.expanded ? 1 : 0;
    const step = 0.1;
    
    const doAnimate = () => {
      if (Math.abs(this.animProgress - target) < 0.01) {
        this.animProgress = target;
        this.height = this.headerHeight + (this.contentHeight * this.animProgress);
        this.animating = false;
        return;
      }
      
      this.animProgress += this.animProgress < target ? step : -step;
      this.height = this.headerHeight + (this.contentHeight * this.animProgress);
      requestAnimationFrame(doAnimate);
    };
    
    doAnimate();
  }
  
  /**
   * Dessine l'accordéon
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Bordure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Header
    // Icône (si présente)
    if (this.icon) {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.icon, this.x + 16, this.y + this.headerHeight / 2);
    }
    
    // Titre
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleX = this.x + (this.icon ? 56 : 16);
    ctx.fillText(this.title, titleX, this.y + this.headerHeight / 2);
    
    // Chevron (flèche)
    const chevronX = this.x + this.width - 30;
    const chevronY = this.y + this.headerHeight / 2;
    const chevronRotation = this.animProgress * Math.PI;
    
    ctx.save();
    ctx.translate(chevronX, chevronY);
    ctx.rotate(chevronRotation);
    
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(0, 3);
    ctx.lineTo(6, -3);
    ctx.stroke();
    
    ctx.restore();
    
    // Contenu (si expanded ou en train d'animer)
    if (this.animProgress > 0) {
      ctx.save();
      
      // Clipping pour l'animation
      ctx.beginPath();
      ctx.rect(this.x, this.y + this.headerHeight, this.width, this.contentHeight * this.animProgress);
      ctx.clip();
      
      // Divider
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.headerHeight);
      ctx.lineTo(this.x + this.width, this.y + this.headerHeight);
      ctx.stroke();
      
      // Texte du contenu
      ctx.fillStyle = '#666666';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const contentX = this.x + this.contentPadding;
      const contentY = this.y + this.headerHeight + this.contentPadding;
      const maxWidth = this.width - (this.contentPadding * 2);
      const lines = this.wrapText(ctx, this.content, maxWidth);
      const lineHeight = 20;
      
      lines.forEach((line, index) => {
        ctx.fillText(line, contentX, contentY + (index * lineHeight));
      });
      
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans l'en-tête
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.headerHeight;
  }
}

export default Accordion;