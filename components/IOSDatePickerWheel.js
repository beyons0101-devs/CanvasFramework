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
  
    // État interne
    this.dragging = false;
    this.dragStartY = 0;
    this.dragWheel = null;
    this.lastY = 0;
    
    // Configuration des limites
    this._setupLimits();
    
    // Setup des handlers
    this._setupEventHandlers();
    
    // Dimensions
    if (!options.width) {
      this.width = framework.width - 40;
    }
    
    if (!options.height) {
      this.height = this.wheelHeight;
    }
  }
  
  /**
   * Configure les limites pour chaque roue
   * @private
   */
  _setupLimits() {
    // Mois: 0-11 (Janvier à Décembre)
    this.monthMin = 0;
    this.monthMax = 11;
    
    // Jour: 1-31 (selon le mois et l'année, on ajustera dynamiquement)
    this.dayMin = 1;
    this.dayMax = 31;
    
    // Année: 1900-2100 par défaut
    this.yearMin = 1900;
    this.yearMax = 2100;
    
    // Mettre à jour les limites du jour en fonction du mois et de l'année
    this._updateDayLimits();
  }
  
  /**
   * Met à jour les limites du jour en fonction du mois et de l'année
   * @private
   */
  _updateDayLimits() {
    // Nombre de jours dans le mois actuel
    const daysInMonth = new Date(this.yearWheel, this.monthWheel + 1, 0).getDate();
    this.dayMax = daysInMonth;
    
    // Ajuster le jour sélectionné si nécessaire
    if (this.dayWheel > daysInMonth) {
      this.dayWheel = daysInMonth;
      this._updateSelectedDate();
    }
  }
  
  /**
   * Configure les gestionnaires d'événements
   * @private
   */
  _setupEventHandlers() {
    // Handler press
    this.onPress = (x, y) => {
      // Vérifier si dans le composant
      const inside = (x >= this.x && x <= this.x + this.width && 
                     y >= this.y && y <= this.y + this.wheelHeight);
      
      if (!inside) {
        return false;
      }
      
      // Activer le drag
      this.dragging = true;
      this.dragStartY = y;
      this.lastY = y;
      
      // Déterminer la roue
      const wheelWidth = this.width / 3;
      if (x < this.x + wheelWidth) {
        this.dragWheel = 0; // Mois
      } else if (x < this.x + wheelWidth * 2) {
        this.dragWheel = 1; // Jour
      } else {
        this.dragWheel = 2; // Année
      }
      
      // Prendre le contrôle
      this.framework.activeComponent = this;
      
      // Ajouter l'écouteur global pour les mouvements
      this._addGlobalMoveListener();
      
      // Forcer le redessin
      this._requestRedraw();
      
      return true;
    };
    
    // Handler release
    this.onRelease = (x, y) => {
      if (this.dragging) {
        this.dragging = false;
        this.dragWheel = null;
        
        // Retirer l'écouteur global
        this._removeGlobalMoveListener();
        
        // Relâcher le contrôle
        if (this.framework.activeComponent === this) {
          this.framework.activeComponent = null;
        }
        
        this._requestRedraw();
      }
    };
    
    // Handler move du framework
    this.onMove = (x, y) => {
      // Laissé vide, on utilise l'écouteur global
    };
  }
  
  /**
   * Ajoute un écouteur global pour les mouvements
   * @private
   */
  _addGlobalMoveListener() {
    const canvas = this.framework.canvas;
    
    // Sauvegarder les anciens handlers
    this._savedMouseMove = canvas.onmousemove;
    this._savedTouchMove = canvas.ontouchmove;
    
    // Overrider les handlers
    canvas.onmousemove = (e) => {
      if (this.dragging) {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this._handleGlobalMove(x, y);
        return false;
      }
      
      // Appeler le handler original si on ne drag pas
      if (this._savedMouseMove) {
        return this._savedMouseMove(e);
      }
    };
    
    canvas.ontouchmove = (e) => {
      if (this.dragging && e.touches.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this._handleGlobalMove(x, y);
        return false;
      }
      
      if (this._savedTouchMove) {
        return this._savedTouchMove(e);
      }
    };
  }
  
  /**
   * Retire l'écouteur global
   * @private
   */
  _removeGlobalMoveListener() {
    const canvas = this.framework.canvas;
    
    if (this._savedMouseMove) {
      canvas.onmousemove = this._savedMouseMove;
      this._savedMouseMove = null;
    }
    
    if (this._savedTouchMove) {
      canvas.ontouchmove = this._savedTouchMove;
      this._savedTouchMove = null;
    }
  }
  
  /**
   * Gestionnaire de mouvement global
   * @private
   */
  _handleGlobalMove(x, y) {
    if (!this.dragging) return;
    
    // Calculer le delta
    const deltaY = y - this.lastY;
    this.lastY = y;
    
    // Appliquer le scroll si mouvement significatif
    if (Math.abs(deltaY) > 0.5) {
      const direction = deltaY > 0 ? 1 : -1;
      
      // Appliquer le déplacement selon la roue avec limites
      if (this.dragWheel === 0) {
        // Mois - avec bouclage
        let newMonth = this.monthWheel - direction;
        if (newMonth < this.monthMin) newMonth = this.monthMax;
        if (newMonth > this.monthMax) newMonth = this.monthMin;
        this.monthWheel = newMonth;
        
        // Mettre à jour les limites du jour après changement de mois
        this._updateDayLimits();
      } 
      else if (this.dragWheel === 1) {
        // Jour - avec bouclage
        let newDay = this.dayWheel - direction;
        if (newDay < this.dayMin) newDay = this.dayMax;
        if (newDay > this.dayMax) newDay = this.dayMin;
        this.dayWheel = newDay;
      } 
      else if (this.dragWheel === 2) {
        // Année - avec limites strictes
        let newYear = this.yearWheel - direction;
        if (newYear < this.yearMin) newYear = this.yearMin;
        if (newYear > this.yearMax) newYear = this.yearMax;
        this.yearWheel = newYear;
        
        // Mettre à jour les limites du jour après changement d'année
        this._updateDayLimits();
      }
      
      // Mettre à jour la date
      this._updateSelectedDate();
      
      // Forcer le redessin
      this._requestRedraw();
    }
  }
  
  /**
   * Met à jour la date sélectionnée
   * @private
   */
  _updateSelectedDate() {
    // Créer la nouvelle date
    const newDate = new Date(this.yearWheel, this.monthWheel, this.dayWheel);
    
    // Vérifier si la date a changé
    if (newDate.getTime() !== this.selectedDate.getTime()) {
      this.selectedDate = newDate;
      
      // Appeler le callback
      if (this.onChange) {
        this.onChange(this.selectedDate);
      }
    }
  }
  
  /**
   * Force le redessin du composant
   * @private
   */
  _requestRedraw() {
    if (this.framework.markComponentDirty) {
      this.framework.markComponentDirty(this);
    }
  }
  
  /**
   * Vérifie si un point est dans les limites du composant
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le composant
   */
  isPointInside(x, y) {
    // Pas de scrollOffset car le Modal est fixe
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.wheelHeight;
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
    
    // Mois (avec bouclage)
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    this._drawWheel(ctx, this.x, monthNames, this.monthWheel, this.monthMin, this.monthMax);
    
    // Jour (avec ajustement dynamique)
    const daysInMonth = new Date(this.yearWheel, this.monthWheel + 1, 0).getDate();
    const days = Array.from({length: daysInMonth}, (_, i) => (i + 1).toString());
    this._drawWheel(ctx, this.x + wheelWidth, days, this.dayWheel - 1, 0, daysInMonth - 1);
    
    // Année (avec limites fixes)
    const years = Array.from({length: this.yearMax - this.yearMin + 1}, 
                           (_, i) => (this.yearMin + i).toString());
    const yearIndex = this.yearWheel - this.yearMin;
    this._drawWheel(ctx, this.x + wheelWidth * 2, years, yearIndex, 0, years.length - 1);
    
    ctx.restore();
  }
  
  /**
   * Dessine une roue de sélection avec limites
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {string[]} items - Items à afficher
   * @param {number} selectedIndex - Index sélectionné
   * @param {number} minIndex - Index minimum
   * @param {number} maxIndex - Index maximum
   * @private
   */
  _drawWheel(ctx, x, items, selectedIndex, minIndex = 0, maxIndex = items.length - 1) {
    const wheelWidth = this.width / 3;
    const centerY = this.y + this.wheelHeight / 2;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, this.y, wheelWidth, this.wheelHeight);
    ctx.clip();
    
    for (let i = -2; i <= 2; i++) {
      const index = selectedIndex + i;
      if (index >= minIndex && index <= maxIndex) {
        const itemY = centerY + i * this.itemHeight;
        const distance = Math.abs(itemY - centerY);
        const scale = 1 - (distance / this.wheelHeight);
        const opacity = Math.max(0.3, scale);
        
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.font = `${i === 0 ? 'bold ' : ''}${18 + scale * 2}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[index - minIndex], x + wheelWidth / 2, itemY);
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Nettoie le composant
   * @private
   */
  _unmount() {
    this._removeGlobalMoveListener();
    super._unmount();
  }
}

export default IOSDatePickerWheel;