import Component from '../core/Component.js';
/**
 * Barre d'application supérieure
 * @class
 * @extends Component
 * @property {string} title - Titre
 * @property {string|null} leftIcon - Icône gauche ('menu' ou 'back')
 * @property {string|null} rightIcon - Icône droite ('search' ou 'more')
 * @property {Function} onLeftClick - Callback au clic gauche
 * @property {Function} onRightClick - Callback au clic droit
 * @property {string} platform - Plateforme
 * @property {string} bgColor - Couleur de fond
 * @property {string} textColor - Couleur du texte
 * @property {number} elevation - Élévation (ombre)
 */
class AppBar extends Component {
  /**
   * Crée une instance de AppBar
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.title=''] - Titre
   * @param {string} [options.leftIcon] - Icône gauche
   * @param {string} [options.rightIcon] - Icône droite
   * @param {Function} [options.onLeftClick] - Callback gauche
   * @param {Function} [options.onRightClick] - Callback droit
   * @param {number} [options.height] - Hauteur (auto selon platform)
   * @param {string} [options.bgColor] - Couleur de fond (auto selon platform)
   * @param {string} [options.textColor] - Couleur du texte (auto selon platform)
   * @param {number} [options.elevation=4] - Élévation (Material)
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: options.height || (framework.platform === 'material' ? 56 : 44),
      ...options
    });
    this.title = options.title || '';
    this.leftIcon = options.leftIcon || null;
    this.rightIcon = options.rightIcon || null;
    this.onLeftClick = options.onLeftClick;
    this.onRightClick = options.onRightClick;
    this.platform = framework.platform;
    this.bgColor = options.bgColor || (framework.platform === 'material' ? '#6200EE' : '#F8F8F8');
    this.textColor = options.textColor || (framework.platform === 'material' ? '#FFFFFF' : '#000000');
    this.elevation = options.elevation !== undefined ? options.elevation : 4;
    
    // IMPORTANT: Définir onPress pour que le framework appelle handlePress
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Dessine l'AppBar
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Ombre (Material uniquement)
    if (this.platform === 'material' && this.elevation > 0) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = this.elevation * 2;
      ctx.shadowOffsetY = this.elevation / 2;
    }
    
    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.shadowColor = 'transparent';
    
    // Bordure inférieure (iOS uniquement)
    if (this.platform === 'cupertino') {
      ctx.strokeStyle = '#C6C6C8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.stroke();
    }
    
    // Titre
    ctx.fillStyle = this.textColor;
    ctx.font = `${this.platform === 'material' ? 'bold ' : ''}20px -apple-system, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, this.width / 2, this.y + this.height / 2);
    
    // Icône gauche (hamburger menu ou back)
    if (this.leftIcon === 'menu') {
      this.drawMenuIcon(ctx, 16, this.y + this.height / 2);
    } else if (this.leftIcon === 'back') {
      this.drawBackIcon(ctx, 16, this.y + this.height / 2);
    }
    
    // Icône droite
    if (this.rightIcon === 'search') {
      this.drawSearchIcon(ctx, this.width - 36, this.y + this.height / 2);
    } else if (this.rightIcon === 'more') {
      this.drawMoreIcon(ctx, this.width - 36, this.y + this.height / 2);
    }
    
    ctx.restore();
  }

  /**
   * Dessine l'icône menu
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @private
   */
  drawMenuIcon(ctx, x, y) {
    ctx.strokeStyle = this.textColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 8 + i * 8);
      ctx.lineTo(x + 24, y - 8 + i * 8);
      ctx.stroke();
    }
  }

  /**
   * Dessine l'icône retour
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @private
   */
  drawBackIcon(ctx, x, y) {
    ctx.strokeStyle = this.textColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 10);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x + 16, y + 10);
    ctx.stroke();
  }

  /**
   * Dessine l'icône recherche
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @private
   */
  drawSearchIcon(ctx, x, y) {
    ctx.strokeStyle = this.textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 8, y - 2, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 4);
    ctx.lineTo(x + 20, y + 10);
    ctx.stroke();
  }

  /**
   * Dessine l'icône plus
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @private
   */
  drawMoreIcon(ctx, x, y) {
    ctx.fillStyle = this.textColor;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + 12, y - 10 + i * 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Vérifie si un point est dans les zones cliquables
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans une zone cliquable
   */
  isPointInside(x, y) {
    // Zones cliquables pour les icônes
    if (y >= this.y && y <= this.y + this.height) {
      if (this.leftIcon && x >= 0 && x <= 56) {
        return true;
      }
      if (this.rightIcon && x >= this.width - 56 && x <= this.width) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si un clic a été traité
   * @private
   */
  handlePress(x, y) {
    // Ajuster y avec le scrollOffset si nécessaire
    const adjustedY = y;
    
    // Détecter quelle zone a été cliquée
    if (adjustedY >= this.y && adjustedY <= this.y + this.height) {
      if (this.leftIcon && x >= 0 && x <= 56) {
        if (this.onLeftClick) this.onLeftClick();
        return true;
      }
      if (this.rightIcon && x >= this.width - 56 && x <= this.width) {
        if (this.onRightClick) this.onRightClick();
        return true;
      }
    }
    return false;
  }
}

export default AppBar;