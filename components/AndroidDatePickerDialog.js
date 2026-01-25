import Component from '../core/Component.js';
/**
 * Dialog de sélection de date Android
 * @class
 * @extends Component
 * @property {Date} selectedDate - Date sélectionnée
 * @property {Function} onChange - Callback au changement
 * @property {number} currentMonth - Mois courant
 * @property {number} currentYear - Année courante
 * @property {number|null} hoveredDay - Jour survolé
 * @property {number} dialogWidth - Largeur du dialog
 * @property {number} dialogHeight - Hauteur du dialog
 * @property {number} headerHeight - Hauteur de l'en-tête
 * @property {number} daySize - Taille d'un jour
 * @property {number} opacity - Opacité
 * @property {boolean} isVisible - Visibilité
 */
class AndroidDatePickerDialog extends Component {
  /**
   * Crée une instance de AndroidDatePickerDialog
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Date} [options.selectedDate=new Date()] - Date initiale
   * @param {Function} [options.onChange] - Callback au changement
   */
  constructor(framework, options = {}) {
    super(framework, {
      x: 0,
      y: 0,
      width: framework.width,
      height: framework.height,
      visible: false
    });
  
    this.selectedDate = options.selectedDate || new Date();
    this.onChange = options.onChange;
    this.currentMonth = this.selectedDate.getMonth();
    this.currentYear = this.selectedDate.getFullYear();
    this.hoveredDay = null;
  
    // Options de personnalisation
    this.headerBgColor = options.headerBgColor || '#6200EE';
    this.selectedColor = options.selectedColor || '#6200EE';
    this.buttonColor = options.buttonColor || '#6200EE';
    this.todayColor = options.todayColor || '#6200EE';
    this.textColor = options.textColor || '#000000';
    this.dayNamesColor = options.dayNamesColor || '#666666';
  
    this.dialogWidth = Math.min(320, framework.width - 40);
    this.dialogHeight = 420;
    this.headerHeight = 100;
    this.daySize = (this.dialogWidth - 40) / 7;
  
    this.opacity = 0;
    this.isVisible = false;
  
    this.onPress = this.handlePress.bind(this);
  }
  
  /**
   * Affiche le dialog
   */
  show() {
    this.isVisible = true;
    this.visible = true;
    const fadeIn = () => {
      this.opacity += 0.1;
      if (this.opacity < 1) requestAnimationFrame(fadeIn);
    };
    fadeIn();
  }
  
  /**
   * Cache le dialog
   */
  hide() {
    const fadeOut = () => {
      this.opacity -= 0.1;
      if (this.opacity > 0) {
        requestAnimationFrame(fadeOut);
      } else {
        this.isVisible = false;
        this.visible = false;
        this.framework.remove(this);
      }
    };
    fadeOut();
  }
  
  /**
   * Obtient le nombre de jours dans un mois
   * @param {number} month - Mois (0-11)
   * @param {number} year - Année
   * @returns {number} Nombre de jours
   * @private
   */
  getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
  }
  
  /**
   * Obtient le premier jour de la semaine d'un mois
   * @param {number} month - Mois (0-11)
   * @param {number} year - Année
   * @returns {number} Jour de la semaine (0-6)
   * @private
   */
  getFirstDayOfMonth(month, year) {
    return new Date(year, month, 1).getDay();
  }
  
  /**
   * Passe au mois précédent
   * @private
   */
  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
  }
  
  /**
   * Passe au mois suivant
   * @private
   */
  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
  }
  
  /**
   * Sélectionne un jour
   * @param {number} day - Jour à sélectionner
   * @private
   */
  selectDate(day) {
    this.selectedDate = new Date(this.currentYear, this.currentMonth, day);
  }
  
  /**
   * Dessine le dialog
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (this.opacity <= 0 || !this.isVisible) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);
    
    const dialogX = (this.framework.width - this.dialogWidth) / 2;
    const dialogY = (this.framework.height - this.dialogHeight) / 2;
    
    // Dialog background
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    this.roundRect(ctx, dialogX, dialogY, this.dialogWidth, this.dialogHeight, 4);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    
    // Header coloré
    ctx.fillStyle = this.headerBgColor;
    ctx.beginPath();
    this.roundRect(ctx, dialogX, dialogY, this.dialogWidth, this.headerHeight, 4);
    ctx.rect(dialogX, dialogY + this.headerHeight - 4, this.dialogWidth, 4);
    ctx.fill();
    
    // Année (petit)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.currentYear.toString(), dialogX + 20, dialogY + 20);
    
    // Date sélectionnée (grand)
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                       'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const selectedDay = dayNames[this.selectedDate.getDay()];
    const selectedMonth = monthNames[this.selectedDate.getMonth()];
    const selectedDayNum = this.selectedDate.getDate();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${selectedDay}, ${selectedMonth} ${selectedDayNum}`, 
                 dialogX + 20, dialogY + this.headerHeight / 2 + 15);
    
    // Navigation mois
    const navY = dialogY + this.headerHeight + 20;
    
    // Bouton mois précédent
    ctx.fillStyle = '#666666';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀', dialogX + 30, navY);
    
    // Mois et année actuel
    const monthNamesLong = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                           'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    ctx.font = 'bold 16px Roboto, sans-serif';
    ctx.fillText(`${monthNamesLong[this.currentMonth]} ${this.currentYear}`, 
                 dialogX + this.dialogWidth / 2, navY);
    
    // Bouton mois suivant
    ctx.fillText('▶', dialogX + this.dialogWidth - 30, navY);
    
    // Jours de la semaine
    const dayNamesShort = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 12px Roboto, sans-serif';
    
    for (let i = 0; i < 7; i++) {
      const dayX = dialogX + 20 + i * this.daySize + this.daySize / 2;
      const dayY = navY + 40;
      ctx.fillText(dayNamesShort[i], dayX, dayY);
    }
    
    // Grille de jours
    const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
    
    let dayNumber = 1;
    const startY = navY + 60;
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const index = week * 7 + day;
        
        if (index >= firstDay && dayNumber <= daysInMonth) {
          const dayX = dialogX + 20 + day * this.daySize;
          const dayY = startY + week * this.daySize;
          
          const isSelected = this.selectedDate.getDate() === dayNumber &&
                           this.selectedDate.getMonth() === this.currentMonth &&
                           this.selectedDate.getFullYear() === this.currentYear;
          
          const today = new Date();
          const isToday = dayNumber === today.getDate() &&
                         this.currentMonth === today.getMonth() &&
                         this.currentYear === today.getFullYear();
          
          // Cercle sélectionné
          if (isSelected) {
            ctx.fillStyle = '#6200EE';
            ctx.beginPath();
            ctx.arc(dayX + this.daySize / 2, dayY + this.daySize / 2, 
                   this.daySize / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Cercle aujourd'hui
          if (isToday && !isSelected) {
            ctx.strokeStyle = '#6200EE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(dayX + this.daySize / 2, dayY + this.daySize / 2, 
                   this.daySize / 2 - 2, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Numéro
          ctx.fillStyle = isSelected ? '#FFFFFF' : '#212121';
          ctx.font = '14px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dayNumber.toString(), dayX + this.daySize / 2, dayY + this.daySize / 2);
          
          dayNumber++;
        }
      }
      
      if (dayNumber > daysInMonth) break;
    }
    
    // Boutons d'action
    const btnY = dialogY + this.dialogHeight - 30;
    
    // Annuler
    ctx.fillStyle = '#6200EE';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('ANNULER', dialogX + this.dialogWidth - 120, btnY);
    
    // OK
    ctx.fillText('OK', dialogX + this.dialogWidth - 20, btnY);
    
    ctx.restore();
  }
  
  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const dialogX = (this.framework.width - this.dialogWidth) / 2;
    const dialogY = (this.framework.height - this.dialogHeight) / 2;
    
    // Boutons navigation
    const navY = dialogY + this.headerHeight + 20;
    
    if (y >= navY - 15 && y <= navY + 15) {
      if (x >= dialogX + 10 && x <= dialogX + 50) {
        this.previousMonth();
        return;
      }
      if (x >= dialogX + this.dialogWidth - 50 && x <= dialogX + this.dialogWidth - 10) {
        this.nextMonth();
        return;
      }
    }
    
    // Sélection d'un jour
    const startY = navY + 60;
    const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
    const firstDay = this.getFirstDayOfMonth(this.currentMonth, this.currentYear);
    
    let dayNumber = 1;
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const index = week * 7 + day;
        if (index >= firstDay && dayNumber <= daysInMonth) {
          const dayX = dialogX + 20 + day * this.daySize;
          const dayY = startY + week * this.daySize;
          
          if (x >= dayX && x <= dayX + this.daySize && 
              y >= dayY && y <= dayY + this.daySize) {
            this.selectDate(dayNumber);
            return;
          }
          dayNumber++;
        }
      }
      if (dayNumber > daysInMonth) break;
    }
    
    // Boutons d'action
    const btnY = dialogY + this.dialogHeight - 30;
    if (y >= btnY - 20 && y <= btnY + 20) {
      // Annuler
      if (x >= dialogX + this.dialogWidth - 180 && x <= dialogX + this.dialogWidth - 80) {
        this.hide();
        return;
      }
      // OK
      if (x >= dialogX + this.dialogWidth - 70 && x <= dialogX + this.dialogWidth) {
        if (this.onChange) this.onChange(this.selectedDate);
        this.hide();
        return;
      }
    }
    
    // Clic sur overlay pour fermer
    if (x < dialogX || x > dialogX + this.dialogWidth || 
        y < dialogY || y > dialogY + this.dialogHeight) {
      this.hide();
    }
  }
  
  /**
   * Dessine un rectangle avec coins arrondis
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} width - Largeur
   * @param {number} height - Hauteur
   * @param {number} radius - Rayon des coins
   * @private
   */
  roundRect(ctx, x, y, width, height, radius) {
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
  
  /**
   * Vérifie si un point est dans les limites
   * @returns {boolean} True si visible
   */
  isPointInside() {
    return this.isVisible;
  }
}

export default AndroidDatePickerDialog;
