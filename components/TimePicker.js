import Component from '../core/Component.js';

/**
 * Sélecteur d'heure (Material horloge & iOS wheel)
 * @class
 * @extends Component
 */
class TimePicker extends Component {
  /**
   * Crée une instance de TimePicker
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options
 * @param {number} [options.hours=12] - Heures (0-23)
   * @param {number} [options.minutes=0] - Minutes (0-59)
   * @param {boolean} [options.is24Hour=true] - Format 24h
   * @param {Function} [options.onChange] - Callback (hours, minutes)
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.hours = options.hours || 12;
    this.minutes = options.minutes || 0;
    this.is24Hour = options.is24Hour !== false;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    
    this.mode = 'hours'; // 'hours' ou 'minutes'
    this.isOpen = false;
    
    // Dimensions
    if (this.platform === 'cupertino') {
      // iOS wheel picker
      this.pickerHeight = 216;
      this.wheelRadius = 40;
    } else {
      // Material clock
      this.clockRadius = 100;
      this.pickerHeight = 280;
    }
    
    this.width = options.width || framework.width - 40;
    this.height = 56;
  }

  /**
   * Ouvre/ferme le picker
   */
  togglePicker() {
    this.isOpen = !this.isOpen;
  }

  /**
   * Gère le clic
   */
  onClick() {
	  const framework = this.framework;
	  const clickInfo = framework.getLastClick();
	  
	  if (clickInfo) {
		const { x, y } = clickInfo;
		
		if (!this.isOpen) {
		  this.togglePicker();
		  return;
		}
		
		if (this.platform === 'material') {
		  this.handleMaterialClick(x, y);
		} else {
		  this.handleIOSClick(x, y);
		}
	  } else {
		this.togglePicker();
	  }
  }

  /**
   * Gère le clic Material (horloge)
   * @private
   */
  handleMaterialClick(x, y) {
    const pickerY = this.y + this.height + 8;
    const centerX = this.x + this.width / 2;
    const centerY = pickerY + 140;
    
    // Toggle mode heures/minutes
    if (y >= pickerY + 20 && y <= pickerY + 60) {
      if (x < this.x + this.width / 2) {
        this.mode = 'hours';
      } else {
        this.mode = 'minutes';
      }
      return;
    }
    
    // Clic sur l'horloge
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.clockRadius) {
      const angle = Math.atan2(dy, dx);
      const normalizedAngle = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
      
      if (this.mode === 'hours') {
        const hourValue = Math.round((normalizedAngle / (2 * Math.PI)) * 12);
        this.hours = hourValue === 0 ? 12 : hourValue;
        if (!this.is24Hour && this.hours > 12) this.hours -= 12;
      } else {
        this.minutes = Math.round((normalizedAngle / (2 * Math.PI)) * 60) % 60;
      }
      
      if (this.onChange) {
        this.onChange(this.hours, this.minutes);
      }
    }
    
    // Bouton OK
    const okButtonY = pickerY + this.pickerHeight - 50;
    if (y >= okButtonY && y <= okButtonY + 40 &&
        x >= this.x + this.width - 100 && x <= this.x + this.width - 20) {
      this.isOpen = false;
    }
  }

  /**
   * Gère le clic iOS (wheel)
   * @private
   */
  handleIOSClick(x, y) {
    // Bouton Done
    const pickerY = this.y + this.height + 8;
    const doneY = pickerY + this.pickerHeight - 44;
    
    if (y >= doneY && y <= doneY + 44) {
      this.isOpen = false;
    }
  }

  /**
   * Dessine le composant
   */
  draw(ctx) {
    ctx.save();
    
    // Bouton pour ouvrir le picker
    this.drawButton(ctx);
    
    // Picker
    if (this.isOpen) {
      if (this.platform === 'material') {
        this.drawMaterialPicker(ctx);
      } else {
        this.drawIOSPicker(ctx);
      }
    }
    
    ctx.restore();
  }

  /**
   * Dessine le bouton
   * @private
   */
  drawButton(ctx) {
    if (this.platform === 'material') {
      // Material button
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      
      // Icône horloge
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + 25, this.y + 28, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x + 25, this.y + 28);
      ctx.lineTo(this.x + 25, this.y + 22);
      ctx.lineTo(this.x + 30, this.y + 28);
      ctx.stroke();
      
      // Texte
      ctx.fillStyle = '#000000';
      ctx.font = '16px Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.formatTime(), this.x + 50, this.y + 28);
      
    } else {
      // iOS button
      ctx.strokeStyle = '#C7C7CC';
      ctx.lineWidth = 1;
      this.roundRect(ctx, this.x, this.y, this.width, this.height, 10);
      ctx.stroke();
      
      ctx.fillStyle = '#8E8E93';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Time', this.x + 15, this.y + 18);
      
      ctx.fillStyle = '#000000';
      ctx.font = '16px -apple-system, sans-serif';
      ctx.fillText(this.formatTime(), this.x + 15, this.y + 38);
    }
  }

  /**
   * Dessine le picker Material (horloge)
   * @private
   */
  drawMaterialPicker(ctx) {
    const pickerY = this.y + this.height + 8;
    
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(this.x, pickerY, this.width, this.pickerHeight);
    ctx.shadowColor = 'transparent';
    
    // Header avec time display
    ctx.fillStyle = '#6200EE';
    ctx.fillRect(this.x, pickerY, this.width, 80);
    
    // Time display
    const timeStr = `${String(this.hours).padStart(2, '0')}:${String(this.minutes).padStart(2, '0')}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, this.x + this.width / 2, pickerY + 50);
    
    // Mode selector (hours/minutes)
    ctx.font = '14px Roboto, sans-serif';
    const modeY = pickerY + 20;
    
    if (this.mode === 'hours') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    }
    ctx.fillText('Hours', this.x + this.width / 4, modeY);
    
    if (this.mode === 'minutes') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    }
    ctx.fillText('Minutes', this.x + 3 * this.width / 4, modeY);
    
    // Clock
    const centerX = this.x + this.width / 2;
    const centerY = pickerY + 140 + 40;
    
    // Clock circle
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.clockRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Numbers
    const count = this.mode === 'hours' ? 12 : 12;
    const step = this.mode === 'hours' ? 1 : 5;
    
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI / count) - Math.PI / 2;
      const x = centerX + Math.cos(angle) * (this.clockRadius - 20);
      const y = centerY + Math.sin(angle) * (this.clockRadius - 20);
      const value = this.mode === 'hours' ? (i === 0 ? 12 : i) : i * step;
      
      const isSelected = this.mode === 'hours' 
        ? value === this.hours
        : value === Math.floor(this.minutes / 5) * 5;
      
      if (isSelected) {
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#000000';
      }
      
      ctx.font = '14px Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), x, y);
    }
    
    // Hand (aiguille)
    const currentValue = this.mode === 'hours' ? this.hours : this.minutes;
    const handAngle = this.mode === 'hours'
      ? ((currentValue % 12) * 2 * Math.PI / 12) - Math.PI / 2
      : (currentValue * 2 * Math.PI / 60) - Math.PI / 2;
    
    const handEndX = centerX + Math.cos(handAngle) * (this.clockRadius - 20);
    const handEndY = centerY + Math.sin(handAngle) * (this.clockRadius - 20);
    
    ctx.strokeStyle = '#6200EE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(handEndX, handEndY);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#6200EE';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // OK button
    const okY = pickerY + this.pickerHeight - 50;
    ctx.fillStyle = '#6200EE';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('OK', this.x + this.width - 30, okY + 20);
  }

  /**
   * Dessine le picker iOS (wheel)
   * @private
   */
  drawIOSPicker(ctx) {
    const pickerY = this.y + this.height + 8;
    
    // Background
    ctx.fillStyle = '#F9F9F9';
    this.roundRect(ctx, this.x, pickerY, this.width, this.pickerHeight, 12);
    ctx.fill();
    
    // Selection bar (au milieu)
    const selectionY = pickerY + this.pickerHeight / 2 - 20;
    ctx.fillStyle = 'rgba(0, 122, 255, 0.1)';
    this.roundRect(ctx, this.x + 20, selectionY, this.width - 40, 40, 8);
    ctx.fill();
    
    // Wheels (heures et minutes)
    const hourWheelX = this.x + this.width / 3;
    const minuteWheelX = this.x + 2 * this.width / 3;
    const wheelY = pickerY + this.pickerHeight / 2;
    
    // Heures
    this.drawWheel(ctx, hourWheelX, wheelY, this.hours, 23, false);
    
    // Séparateur ":"
    ctx.fillStyle = '#000000';
    ctx.font = '24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(':', this.x + this.width / 2, wheelY);
    
    // Minutes
    this.drawWheel(ctx, minuteWheelX, wheelY, this.minutes, 59, true);
    
    // Done button
    const doneY = pickerY + this.pickerHeight - 44;
    ctx.fillStyle = '#007AFF';
    ctx.font = '17px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Done', this.x + this.width / 2, doneY + 22);
  }

  /**
   * Dessine une roue iOS
   * @private
   */
  drawWheel(ctx, x, y, selected, max, isMinute) {
    const itemHeight = 40;
    const visibleItems = 5;
    
    for (let i = -2; i <= 2; i++) {
      let value = (selected + i + max + 1) % (max + 1);
      if (isMinute) value = Math.floor(value / 5) * 5;
      
      const itemY = y + i * itemHeight;
      const opacity = 1 - Math.abs(i) * 0.4;
      const scale = 1 - Math.abs(i) * 0.2;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = i === 0 ? '#000000' : '#8E8E93';
      ctx.font = `${Math.floor(24 * scale)}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value).padStart(2, '0'), x, itemY);
      ctx.restore();
    }
  }

  /**
   * Formate l'heure
   * @private
   */
  formatTime() {
    const h = String(this.hours).padStart(2, '0');
    const m = String(this.minutes).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Rectangle arrondi
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
  }

  /**
   * Vérifie si point dans limites
   */
  isPointInside(x, y) {
    if (x >= this.x && x <= this.x + this.width && 
        y >= this.y && y <= this.y + this.height) {
      return true;
    }
    
    if (this.isOpen) {
      const pickerY = this.y + this.height + 8;
      return x >= this.x && x <= this.x + this.width &&
             y >= pickerY && y <= pickerY + this.pickerHeight;
    }
    
    return false;
  }
}

export default TimePicker;