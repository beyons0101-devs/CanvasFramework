import Component from '../core/Component.js';
import AndroidDatePickerDialog from '../components/AndroidDatePickerDialog.js';
import Modal from '../components/Modal.js';
import IOSDatePickerWheel from '../components/IOSDatePickerWheel.js';
import Button from '../components/Button.js';

/**
 * Sélecteur de date (wrapper)
 * @class
 * @extends Component
 * @property {Date} selectedDate - Date sélectionnée
 * @property {Date|null} minDate - Date minimum
 * @property {Date|null} maxDate - Date maximum
 * @property {Function} onChange - Callback au changement
 * @property {string} platform - Plateforme
 * @property {string} label - Label
 * @property {Modal|null} pickerModal - Modal iOS
 */
class DatePicker extends Component {
  /**
   * Crée une instance de DatePicker
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Date} [options.selectedDate=new Date()] - Date initiale
   * @param {Date} [options.minDate] - Date minimum
   * @param {Date} [options.maxDate] - Date maximum
   * @param {Function} [options.onChange] - Callback au changement
   * @param {string} [options.label='Sélectionner une date'] - Label
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.selectedDate = options.selectedDate || new Date();
    this.minDate = options.minDate || null;
    this.maxDate = options.maxDate || null;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    this.label = options.label || 'Sélectionner une date';
  
    // Options de personnalisation
    this.headerBgColor = options.headerBgColor || '#6200EE'; // Android dialog header
    this.inputBgColor = options.inputBgColor || null;
    this.inputTextColor = options.inputTextColor || null;
    this.inputBorderColor = options.inputBorderColor || null;
    this.labelColor = options.labelColor || null;
    this.inputHeight = options.inputHeight || 50;
    this.inputRadius = options.inputRadius || (this.platform === 'cupertino' ? 10 : 0);
    this.fontSize = options.fontSize || null;
    this.selectedColor = options.selectedColor || '#6200EE'; // Android selected items
    this.buttonColor = options.buttonColor || '#6200EE'; // Android buttons
  
    // Dimensions
    if (this.platform === 'cupertino') {
      this.width = options.width || framework.width - 40;
      this.pickerModal = null;
    } else {
      this.width = options.width || Math.min(320, framework.width - 40);
    }
  
    this.height = this.inputHeight;
    this.onClick = this.openPicker.bind(this);
  }
  
  /**
   * Ouvre le sélecteur de date
   * @private
   */
  openPicker() {
    if (this.platform === 'cupertino') {
      this.openIOSPicker();
    } else {
      this.openAndroidDialog();
    }
  }
  
  /**
   * Ouvre le sélecteur iOS
   * @private
   */
   
 
  openIOSPicker() {
    const modal = new Modal(this.framework, {
      title: '',
      width: this.framework.width,
      height: 320,
      showCloseButton: false,
      closeOnOverlayClick: true,
      bgColor: '#F9F9F9'
    });
  
    const picker = new IOSDatePickerWheel(this.framework, {
      x: 0,
      y: 20,
      width: this.framework.width - 40,
      selectedDate: this.selectedDate,
      onChange: (date) => {
        this.selectedDate = date;
        if (this.onChange) this.onChange(date);
      }
      // Ajoutez ici d'autres options si IOSDatePickerWheel en supporte
    });
    modal.add(picker);
  
    const btnOK = new Button(this.framework, {
      x: (this.framework.width - 200) / 2,
      y: 230,
      width: 200,
      height: 44,
      text: 'Valider',
      // Personnalisation du bouton si nécessaire
      bgColor: this.buttonColor,
      textColor: '#FFFFFF',
      onClick: () => modal.hide()
    });
    modal.add(btnOK);
  
    this.framework.add(modal);
    modal.show();
    this.pickerModal = modal;
  }
  
  /**
   * Ouvre le dialog Android
   * @private
   */
  openAndroidDialog() {
    const dialog = new AndroidDatePickerDialog(this.framework, {
      selectedDate: this.selectedDate,
      onChange: (date) => {
        this.selectedDate = date;
        if (this.onChange) this.onChange(date);
      },
      // Transmettre toutes les options de couleur
      headerBgColor: this.headerBgColor,
      selectedColor: this.selectedColor,
      buttonColor: this.buttonColor
    });
  
    this.framework.add(dialog);
    dialog.show();
  }
  
  /**
   * Dessine le sélecteur de date
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    if (this.platform === 'cupertino') {
      // Styles Cupertino
      const bgColor = this.inputBgColor || '#FFFFFF';
      const textColor = this.inputTextColor || '#000000';
      const labelColor = this.labelColor || '#8E8E93';
      const borderColor = this.inputBorderColor || '#C7C7CC';
      const fontSize = this.fontSize || 16;
    
      ctx.save();
    
      // Background
      ctx.fillStyle = bgColor;
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.inputRadius);
      ctx.fill();
    
      // Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    
      // Label
      ctx.fillStyle = labelColor;
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + 15, this.y + this.height / 2 - 10);
    
      // Selected date
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.fillText(this.formatDate(this.selectedDate), this.x + 15, this.y + this.height / 2 + 10);
    
      // Chevron
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x + this.width - 25, this.y + this.height / 2 - 5);
      ctx.lineTo(this.x + this.width - 20, this.y + this.height / 2);
      ctx.lineTo(this.x + this.width - 15, this.y + this.height / 2 - 5);
      ctx.stroke();
    
      ctx.restore();
    } else {
      // Styles Material
      const bgColor = this.inputBgColor || (this.pressed ? '#F5F5F5' : '#FFFFFF');
      const textColor = this.inputTextColor || '#000000';
      const labelColor = this.labelColor || '#666666';
      const borderColor = this.inputBorderColor || '#E0E0E0';
      const fontSize = this.fontSize || 16;
      const iconColor = labelColor;
    
      ctx.save();
    
      // Background
      ctx.fillStyle = bgColor;
      if (this.inputRadius > 0) {
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.inputRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    
      // Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      if (this.inputRadius > 0) {
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.inputRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(this.x, this.y, this.width, this.height);
      }
    
      // Calendar icon
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x + 15, this.y + 15, 20, 20);
      ctx.beginPath();
      ctx.moveTo(this.x + 18, this.y + 12);
      ctx.lineTo(this.x + 18, this.y + 18);
      ctx.moveTo(this.x + 32, this.y + 12);
      ctx.lineTo(this.x + 32, this.y + 18);
      ctx.stroke();
    
      // Label
      ctx.fillStyle = labelColor;
      ctx.font = '12px Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.label, this.x + 45, this.y + 8);
    
      // Date
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px Roboto, sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.formatDate(this.selectedDate), this.x + 45, this.y + this.height - 8);
    
      ctx.restore();
    }
  }
  
  /**
   * Formate une date
   * @param {Date} date - Date à formater
   * @returns {string} Date formatée
   * @private
   */
  formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le sélecteur
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }
}

export default DatePicker;