import Component from '../core/Component.js';
/**
 * Sélecteur de date iOS (style roue)
 * @class
 * @extends Component
 * @property {Date} selectedDate - Date sélectionnée
 * @property {Function} onChange - Callback au changement
 * @property {number} monthWheel - Mois sélectionné
 * @property {number} dayWheel - Jour sélectionné
 * @property {number} yearWheel - Année sélectionnée
 * @property {number} wheelHeight - Hauteur de la roue
 * @property {number} itemHeight - Hauteur d'un item
 * @property {number} visibleItems - Nombre d'items visibles
 * @property {boolean} dragging - En cours de drag
 * @property {number} dragStartY - Position Y du début du drag
 * @property {number|null} dragWheel - Roue en cours de drag
 * @property {number} lastDeltaY - Dernier delta Y
 * @property {boolean} wasDragging - Drag effectué
 */
class IOSDatePickerWheel extends Component {
  /**
   * Crée une instance de IOSDatePickerWheel
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Date} [options.selectedDate=new Date()] - Date initiale
   * @param {Function} [options.onChange] - Callback au changement
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.selectedDate = options.selectedDate || new Date();
    this.onChange = options.onChange;
    
    // Roues de sélection
    this.monthWheel = this.selectedDate.getMonth();
    this.dayWheel = this.selectedDate.getDate();
    this.yearWheel = this.selectedDate.getFullYear();
    
    this.wheelHeight = 200;
    this.itemHeight = 40;
    this.visibleItems = 5;
  
    // AJOUTER CES LIGNES :
    this.dragging = false;
    this.dragStartY = 0;
    this.dragWheel = null; // 0=mois, 1=jour, 2=année
    this.lastDeltaY = 0; // Pour éviter les micro-déplacements
    this.wasDragging = false; // Pour savoir si on a vraiment déplacé
     
    // CORRECTION : Définir les méthodes de gestion d'événements
    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onRelease = this.handleRelease.bind(this); // Nouveau : pour le relâchement
    
    // CORRECTION : NE PAS REDÉFINIR width et height ici
    // Au lieu de cela, utiliser les options passées ou des valeurs par défaut
    // Les propriétés width et height sont déjà définies par super()
    
    // Si aucune width n'a été passée dans options, on en définit une
    if (!options.width) {
      this.width = framework.width - 40;
    }
    
    // S'assurer que la hauteur correspond à wheelHeight
    if (!options.height) {
      this.height = this.wheelHeight;
    }
  }
  
  /**
   * Gère le relâchement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handleRelease(x, y) {
    if (this.dragging) {
      this.dragging = false;
      this.dragWheel = null;
      this.lastDeltaY = 0;
      this.wasDragging = false;
      
      // IMPORTANT : Réinitialiser le composant actif du framework
      if (this.framework.activeComponent === this) {
        this.framework.activeComponent = null;
      }
    }
  }
  
  /**
   * Gère la pression
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le composant
   * @private
   */
  handlePress(x, y) {
    // Ajuster y avec le scrollOffset
    const adjustedY = y - this.framework.scrollOffset;
    
    // Vérifier si on clique dans le DatePicker
    if (this.isPointInside(x, adjustedY)) {
      this.dragging = true;
      this.dragStartY = adjustedY;
      this.lastDeltaY = 0;
      this.wasDragging = false;
      
      // Déterminer quelle roue est touchée
      const wheelWidth = this.width / 3;
      if (x < this.x + wheelWidth) {
        this.dragWheel = 0; // Mois
      } else if (x < this.x + wheelWidth * 2) {
        this.dragWheel = 1; // Jour
      } else {
        this.dragWheel = 2; // Année
      }
      
      // CRITIQUE : Définir ce composant comme actif dans le framework
      this.framework.activeComponent = this;
      return true;
    }
    return false;
  }
  
  /**
   * Gère le mouvement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handleMove(x, y) {
    if (!this.dragging) return;
    
    const adjustedY = y - this.framework.scrollOffset;
    const deltaY = adjustedY - this.dragStartY;
    
    // Seuil de mouvement pour éviter les micro-déplacements
    if (Math.abs(deltaY - this.lastDeltaY) > 2) {
      this.wasDragging = true;
      const steps = Math.round((deltaY - this.lastDeltaY) / this.itemHeight);
      
      if (steps !== 0) {
        if (this.dragWheel === 0) {
          // Mois
          this.monthWheel = Math.max(0, Math.min(11, this.monthWheel - steps));
        } else if (this.dragWheel === 1) {
          // Jour
          this.dayWheel = Math.max(1, Math.min(31, this.dayWheel - steps));
        } else if (this.dragWheel === 2) {
          // Année
          this.yearWheel = Math.max(1900, Math.min(2100, this.yearWheel - steps));
        }
        
        // Mettre à jour la date
        this.selectedDate = new Date(this.yearWheel, this.monthWheel, this.dayWheel);
        if (this.onChange) this.onChange(this.selectedDate);
        
        this.lastDeltaY = deltaY;
      }
    }
  }
  
  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le composant
   */
  isPointInside(x, y) {
    // Ajuster y avec le scrollOffset pour la détection
    const adjustedY = y - this.framework.scrollOffset;
    return x >= this.x && 
           x <= this.x + this.width && 
           adjustedY >= this.y && 
           adjustedY <= this.y + this.wheelHeight;
  }
  
  /**
   * Dessine le sélecteur de date
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const wheelWidth = this.width / 3;
    
    // Fond
    ctx.fillStyle = '#F9F9F9';
    ctx.fillRect(this.x, this.y, this.width, this.wheelHeight);
    
    // Bande de sélection
    const selectionY = this.y + this.wheelHeight / 2 - this.itemHeight / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(this.x, selectionY, this.width, this.itemHeight);
    
    // Lignes de séparation
    ctx.strokeStyle = '#C7C7CC';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(this.x, selectionY);
    ctx.lineTo(this.x + this.width, selectionY);
    ctx.moveTo(this.x, selectionY + this.itemHeight);
    ctx.lineTo(this.x + this.width, selectionY + this.itemHeight);
    ctx.stroke();
    
    // Dividers verticaux
    ctx.beginPath();
    ctx.moveTo(this.x + wheelWidth, this.y);
    ctx.lineTo(this.x + wheelWidth, this.y + this.wheelHeight);
    ctx.moveTo(this.x + wheelWidth * 2, this.y);
    ctx.lineTo(this.x + wheelWidth * 2, this.y + this.wheelHeight);
    ctx.stroke();
    
    // Mois
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    this.drawWheel(ctx, this.x, monthNames, this.monthWheel);
    
    // Jour
    const days = Array.from({length: 31}, (_, i) => (i + 1).toString());
    this.drawWheel(ctx, this.x + wheelWidth, days, this.dayWheel - 1);
    
    // Année
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 100}, (_, i) => (currentYear - 50 + i).toString());
    const yearIndex = this.yearWheel - (currentYear - 50);
    this.drawWheel(ctx, this.x + wheelWidth * 2, years, yearIndex);
    
    ctx.restore();
  }
  
  /**
   * Dessine une roue de sélection
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {string[]} items - Items à afficher
   * @param {number} selectedIndex - Index sélectionné
   * @private
   */
  drawWheel(ctx, x, items, selectedIndex) {
    const wheelWidth = this.width / 3;
    const centerY = this.y + this.wheelHeight / 2;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, this.y, wheelWidth, this.wheelHeight);
    ctx.clip();
    
    for (let i = -2; i <= 2; i++) {
      const index = selectedIndex + i;
      if (index >= 0 && index < items.length) {
        const itemY = centerY + i * this.itemHeight;
        const distance = Math.abs(itemY - centerY);
        const scale = 1 - (distance / this.wheelHeight);
        const opacity = Math.max(0.3, scale);
        
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.font = `${i === 0 ? 'bold ' : ''}${18 + scale * 2}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[index], x + wheelWidth / 2, itemY);
      }
    }
    
    ctx.restore();
  }
}

export default IOSDatePickerWheel;