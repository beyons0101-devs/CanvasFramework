// TimePicker.js - Corrigé avec scroll iOS fonctionnel + Android Material

import Component from '../core/Component.js';
import Modal from '../components/Modal.js';
import Button from '../components/Button.js';

class TimePicker extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.selectedTime = options.selectedTime || new Date();
    this.selectedTime.setSeconds(0, 0);

    this.minTime = options.minTime || null;
    this.maxTime = options.maxTime || null;
    this.onChange = options.onChange;
    this.label = options.label || 'Sélectionner une heure';
    this.platform = framework.platform;

    // Options de style personnalisables - AJOUTEZ CECI
    this.headerBgColor = options.headerBgColor || '#6200EE'; // Nouvelle option
    this.inputBgColor = options.inputBgColor || null;
    this.inputTextColor = options.inputTextColor || null;
    this.inputBorderColor = options.inputBorderColor || null;
    this.labelColor = options.labelColor || null;
    this.inputHeight = options.inputHeight || 56;
    this.inputRadius = options.inputRadius || (this.platform === 'cupertino' ? 10 : 0);
    this.fontSize = options.fontSize || null;
  
    this.width = options.width || Math.min(320, framework.width - 40);
    this.height = this.inputHeight;

    this.onPress = (x, y) => {
      if (this.isPointInside(x, y)) {
        this.openPicker();
        return true;
      }
      return false;
    };
  }

  openPicker() {
    if (this.platform === 'cupertino') {
      this.openCupertinoTimePicker();
    } else {
      this.openMaterialTimePicker();
    }
  }

  openCupertinoTimePicker() {
    const modal = new Modal(this.framework, {
      title: '',
      width: this.framework.width,
      height: 340,
      showCloseButton: false,
      closeOnOverlayClick: true,
      bgColor: '#F9F9F9'
    });

    const picker = new CupertinoTimeWheel(this.framework, {
      x: 20,
      y: 20,
      width: this.framework.width - 40,
      selectedTime: new Date(this.selectedTime),
      onChange: (time) => {
        this.selectedTime = time;
        if (this.onChange) this.onChange(time);
      },
      minTime: this.minTime,
      maxTime: this.maxTime
    });

    modal.add(picker);

    const btnOK = new Button(this.framework, {
      x: (this.framework.width - 200) / 2,
      y: 250,
      width: 200,
      height: 44,
      text: 'Valider',
      onClick: () => modal.hide()
    });
    modal.add(btnOK);

    this.framework.add(modal);
    modal.show();
  }

  openMaterialTimePicker() {
    const dialog = new MaterialTimePickerDialog(this.framework, {
      selectedTime: new Date(this.selectedTime),
      onChange: (time) => {
        this.selectedTime = time;
        if (this.onChange) this.onChange(time);
      },
      minTime: this.minTime,
      maxTime: this.maxTime,
      // Transmettre les options de style
      headerBgColor: this.headerBgColor // Ajoutez cette ligne
    });

    this.framework.add(dialog);
    dialog.show();
  }

  draw(ctx) {
    ctx.save();

    const timeStr = this.formatTime(this.selectedTime);

    // Couleurs par défaut selon la plateforme
    let bgColor, textColor, labelColor, borderColor, fontSize;
    
    if (this.platform === 'cupertino') {
      // Style Cupertino par défaut
      bgColor = this.inputBgColor || '#FFFFFF';
      textColor = this.inputTextColor || '#000000';
      labelColor = this.labelColor || '#8E8E93';
      borderColor = this.inputBorderColor || '#C7C7CC';
      fontSize = this.fontSize || 17;
      
      // Dessiner l'arrière-plan
      ctx.fillStyle = bgColor;
      this.roundRect(ctx, this.x, this.y, this.width, this.height, this.inputRadius);
      ctx.fill();

      // Bordure
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = labelColor;
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, this.x + 16, this.y + 18);

      // Valeur (heure)
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.fillText(timeStr, this.x + 16, this.y + this.height - 18);

      // Chevron (flèche)
      ctx.strokeStyle = '#C7C7CC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width - 28, this.y + this.height/2 - 6);
      ctx.lineTo(this.x + this.width - 22, this.y + this.height/2);
      ctx.lineTo(this.x + this.width - 16, this.y + this.height/2 - 6);
      ctx.stroke();
    } else {
      // Style Material par défaut
      bgColor = this.inputBgColor || (this.pressed ? '#EEEEEE' : '#FFFFFF');
      textColor = this.inputTextColor || '#000000';
      labelColor = this.labelColor || '#757575';
      borderColor = this.inputBorderColor || '#E0E0E0';
      fontSize = this.fontSize || 16;
	  
      
      // Arrière-plan
      ctx.fillStyle = bgColor;
      if (this.inputRadius > 0) {
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.inputRadius);
        ctx.fill();
      } else {
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }

      // Bordure
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      if (this.inputRadius > 0) {
        this.roundRect(ctx, this.x, this.y, this.width, this.height, this.inputRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(this.x, this.y, this.width, this.height);
      }

      // Icône d'horloge
      const cx = this.x + 16 + 12;
      const cy = this.y + this.height/2;
      ctx.strokeStyle = labelColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 7, cy);
      ctx.stroke();

      // Label
      ctx.fillStyle = labelColor;
      ctx.font = '14px Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(this.label, this.x + 48, this.y + 18);

      // Valeur (heure)
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px Roboto, sans-serif`;
      ctx.fillText(timeStr, this.x + 48, this.y + this.height - 10);
    }

    ctx.restore();
  }

  formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
}

// ════════════════════════════════════════════════════════════
//   iOS Cupertino Time Wheel - Inspiré de IOSDatePickerWheel
// ════════════════════════════════════════════════════════════
class CupertinoTimeWheel extends Component {
  constructor(framework, options) {
    super(framework, options);
    
    this.selectedTime = options.selectedTime || new Date();
    this.onChange = options.onChange;

    this.hourWheel = this.selectedTime.getHours();
    this.minuteWheel = this.selectedTime.getMinutes();

    this.minTime = options.minTime;
    this.maxTime = options.maxTime;

    this.wheelHeight = 216;
    this.itemHeight = 44;

    // État de drag
    this.dragging = false;
    this.dragStartY = 0;
    this.dragWheel = null; // 0 = heures, 1 = minutes
    this.lastY = 0;

    this._setupEventHandlers();

    if (!options.width) {
      this.width = framework.width - 40;
    }
    if (!options.height) {
      this.height = this.wheelHeight;
    }
  }

  _setupEventHandlers() {
    // Press handler - identique à IOSDatePickerWheel
    this.onPress = (x, y) => {
      const inside = (x >= this.x && x <= this.x + this.width && 
                     y >= this.y && y <= this.y + this.wheelHeight);
      
      if (!inside) return false;
      
      this.dragging = true;
      this.dragStartY = y;
      this.lastY = y;
      
      // Déterminer la roue (heures ou minutes)
      const wheelWidth = this.width / 2;
      this.dragWheel = x < this.x + wheelWidth ? 0 : 1;
      
      // Prendre le contrôle
      this.framework.activeComponent = this;
      
      // Ajouter listener global
      this._addGlobalMoveListener();
      
      this._requestRedraw();
      
      return true;
    };

    // Release handler
    this.onRelease = (x, y) => {
      if (this.dragging) {
        this.dragging = false;
        this.dragWheel = null;
        
        this._removeGlobalMoveListener();
        
        if (this.framework.activeComponent === this) {
          this.framework.activeComponent = null;
        }
        
        this._requestRedraw();
      }
    };

    this.onMove = (x, y) => {
      // Laissé vide, on utilise l'écouteur global
    };
  }

  _addGlobalMoveListener() {
    const canvas = this.framework.canvas;
    
    this._savedMouseMove = canvas.onmousemove;
    this._savedTouchMove = canvas.ontouchmove;
    
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

  _handleGlobalMove(x, y) {
    if (!this.dragging) return;
    
    const deltaY = y - this.lastY;
    this.lastY = y;
    
    if (Math.abs(deltaY) > 0.5) {
      const direction = deltaY > 0 ? 1 : -1;
      
      if (this.dragWheel === 0) {
        // Heures - avec bouclage
        let newHour = this.hourWheel - direction;
        if (newHour < 0) newHour = 23;
        if (newHour > 23) newHour = 0;
        this.hourWheel = newHour;
      } else if (this.dragWheel === 1) {
        // Minutes - avec bouclage
        let newMinute = this.minuteWheel - direction;
        if (newMinute < 0) newMinute = 59;
        if (newMinute > 59) newMinute = 0;
        this.minuteWheel = newMinute;
      }
      
      this._updateSelectedTime();
      this._requestRedraw();
    }
  }

  _updateSelectedTime() {
    const newTime = new Date();
    newTime.setHours(this.hourWheel, this.minuteWheel, 0, 0);
    
    // Vérifier les limites min/max
    if (this.minTime && newTime < this.minTime) {
      this.hourWheel = this.minTime.getHours();
      this.minuteWheel = this.minTime.getMinutes();
      newTime.setHours(this.hourWheel, this.minuteWheel, 0, 0);
    }
    if (this.maxTime && newTime > this.maxTime) {
      this.hourWheel = this.maxTime.getHours();
      this.minuteWheel = this.maxTime.getMinutes();
      newTime.setHours(this.hourWheel, this.minuteWheel, 0, 0);
    }
    
    if (newTime.getTime() !== this.selectedTime.getTime()) {
      this.selectedTime = newTime;
      if (this.onChange) {
        this.onChange(this.selectedTime);
      }
    }
  }

  _requestRedraw() {
    if (this.framework.markComponentDirty) {
      this.framework.markComponentDirty(this);
    }
  }

  draw(ctx) {
    ctx.save();

    const wheelWidth = this.width / 2;
    
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

    // Divider vertical
    ctx.beginPath();
    ctx.moveTo(this.x + wheelWidth, this.y);
    ctx.lineTo(this.x + wheelWidth, this.y + this.wheelHeight);
    ctx.stroke();

    // Heures (0-23)
    const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    this._drawWheel(ctx, this.x, hours, this.hourWheel, 0, 23);

    // Minutes (0-59)
    const minutes = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
    this._drawWheel(ctx, this.x + wheelWidth, minutes, this.minuteWheel, 0, 59);

    ctx.restore();
  }

  _drawWheel(ctx, x, items, selectedIndex, minIndex = 0, maxIndex = items.length - 1) {
    const wheelWidth = this.width / 2;
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
        ctx.fillText(items[index], x + wheelWidth / 2, itemY);
      }
    }
    
    ctx.restore();
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.wheelHeight;
  }

  _unmount() {
    this._removeGlobalMoveListener();
    super._unmount();
  }
}

// ════════════════════════════════════════════════════════════
//   Android Material Time Picker - Style horloge analogique
//   FIX: Problème de clics résolu + Amélioration visibilité
// ════════════════════════════════════════════════════════════
class MaterialTimePickerDialog extends Component {
  constructor(framework, options) {
    super(framework, {
      x: 0, 
      y: 0,
      width: framework.width,
      height: framework.height,
      visible: false,
      captureEvents: true
    });

    this.selectedTime = options.selectedTime || new Date();
    this.hour = this.selectedTime.getHours() % 12 || 12;
    this.minute = this.selectedTime.getMinutes();
    this.isPM = this.selectedTime.getHours() >= 12;

    this.onChange = options.onChange;
    this.opacity = 0;
    this.isVisible = false;

    // Options de style Material
    this.headerBgColor = options.headerBgColor || '#6200EE';
    this.clockBgColor = options.clockBgColor || '#F8F8F8';
    this.selectedColor = options.selectedColor || '#6200EE';
    this.clockHandColor = options.clockHandColor || '#6200EE';
    this.buttonColor = options.buttonColor || '#6200EE';
    this.selectedTextColor = options.selectedTextColor || '#FFFFFF';
    this.unselectedTextColor = options.unselectedTextColor || '#424242';

    this.dialogWidth = Math.min(340, framework.width - 48);
    this.dialogHeight = 520;

    this.mode = 'hours';
    this.dragging = false;

    this._setupEventHandlers();
  }

  _setupEventHandlers() {
    // S'assurer que le composant intercepte les événements
    this.onPress = (x, y) => this.handlePress(x, y);
    this.onMove = (x, y) => this.handleMove(x, y);
    this.onRelease = (x, y) => this.handleRelease(x, y);
  }

  show() {
    this.isVisible = true;
    this.visible = true;
    this.opacity = 0;
    
    // FIX: Forcer un redraw complet
    if (this.framework.requestRedraw) {
      this.framework.requestRedraw();
    }
    
    const fade = () => {
      this.opacity += 0.1;
      if (this.opacity < 1) {
        requestAnimationFrame(fade);
      }
      if (this.framework.requestRedraw) {
        this.framework.requestRedraw();
      }
    };
    fade();
  }

  hide() {
    const fade = () => {
      this.opacity -= 0.1;
      if (this.opacity > 0) {
        requestAnimationFrame(fade);
        if (this.framework.requestRedraw) {
          this.framework.requestRedraw();
        }
      } else {
        this.isVisible = false;
        this.visible = false;
        this.framework.remove(this);
      }
    };
    fade();
  }

  // Renommer les handlers pour éviter les conflits
  handlePress(x, y) {
    if (!this.isVisible || this.opacity <= 0) return false;

    const dx = (this.framework.width - this.dialogWidth) / 2;
    const dy = (this.framework.height - this.dialogHeight) / 2;

    // Click on time display to switch mode
    const timeY = dy + 50;
    if (y > dy + 20 && y < dy + 80 && x > dx + 40 && x < dx + this.dialogWidth - 60) {
      if (x < dx + this.dialogWidth/2) {
        this.mode = 'hours';
        this._requestRedraw();
        return true;
      } else {
        this.mode = 'minutes';
        this._requestRedraw();
        return true;
      }
    }

    // AM/PM toggle
    const pmY = dy + 30;
    if (x > dx + this.dialogWidth - 60 && x < dx + this.dialogWidth - 20) {
      if (y > pmY - 10 && y < pmY + 10) {
        this.isPM = false;
        this._updateTime();
        return true;
      }
      if (y > pmY + 15 && y < pmY + 35) {
        this.isPM = true;
        this._updateTime();
        return true;
      }
    }

    // Clock interaction - check if click is on clock area
    const clockCenterX = dx + this.dialogWidth / 2;
    const clockCenterY = dy + 280;
    const clockRadius = 120;
    
    const distX = x - clockCenterX;
    const distY = y - clockCenterY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    
    // Accept clicks within and slightly outside the clock
    if (dist < clockRadius + 20) {
      this._handleClockClick(x, y, clockCenterX, clockCenterY);
      this.dragging = true;
      return true;
    }

    // Buttons
    const btnY = dy + this.dialogHeight - 40;
    if (Math.abs(y - btnY) < 20) {
      if (x > dx + this.dialogWidth - 200 && x < dx + this.dialogWidth - 100) {
        this.hide();
        return true;
      }
      if (x > dx + this.dialogWidth - 80) {
        this._updateTime();
        this.hide();
        return true;
      }
    }

    // Click outside - close dialog
    if (x < dx || x > dx + this.dialogWidth || y < dy || y > dy + this.dialogHeight) {
      this.hide();
      return true;
    }

    return true;
  }

  handleMove(x, y) {
    if (!this.dragging || !this.isVisible) return false;

    const dx = (this.framework.width - this.dialogWidth) / 2;
    const dy = (this.framework.height - this.dialogHeight) / 2;
    const clockCenterX = dx + this.dialogWidth / 2;
    const clockCenterY = dy + 280;

    this._handleClockClick(x, y, clockCenterX, clockCenterY);
    return true;
  }

  handleRelease(x, y) {
    if (this.dragging) {
      this.dragging = false;
      // Auto switch to minutes after selecting hour
      if (this.mode === 'hours') {
        this.mode = 'minutes';
        this._requestRedraw();
      }
      return true;
    }
    return false;
  }

  _handleClockClick(x, y, cx, cy) {
    // Calculate angle from center
    let angle = Math.atan2(y - cy, x - cx);
    
    // Convert to 12-hour format (0 at top, clockwise)
    // atan2 gives 0 at right (3 o'clock), we want 0 at top (12 o'clock)
    angle = angle + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    
    if (this.mode === 'hours') {
      // Calculate hour (1-12)
      let value = Math.round(angle / (Math.PI * 2 / 12));
      if (value === 0) value = 12;
      if (value > 12) value = value % 12;
      this.hour = value;
    } else {
      // Calculate minutes (0-59, in steps of 5)
      let value = Math.round(angle / (Math.PI * 2 / 12)) * 5;
      if (value >= 60) value = 0;
      this.minute = value;
    }
    
    this._updateTime();
  }

  _updateTime() {
    let hour24 = this.hour;
    if (this.isPM && hour24 !== 12) hour24 += 12;
    if (!this.isPM && hour24 === 12) hour24 = 0;
    
    this.selectedTime.setHours(hour24, this.minute, 0, 0);
    if (this.onChange) this.onChange(this.selectedTime);
    this._requestRedraw();
  }

  _requestRedraw() {
    if (this.framework.requestRedraw) {
      this.framework.requestRedraw();
    }
  }

  draw(ctx) {
    if (!this.isVisible || this.opacity <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);

    const dx = (this.framework.width - this.dialogWidth) / 2;
    const dy = (this.framework.height - this.dialogHeight) / 2;

    // Card shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, dx, dy, this.dialogWidth, this.dialogHeight, 8);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Header
    ctx.fillStyle = this.headerBgColor;
    this.roundRect(ctx, dx, dy, this.dialogWidth, 100, 8);
    ctx.fill();

    // Time display avec mode actif
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const timeY = dy + 50;
    
    // Heures
    ctx.fillStyle = this.mode === 'hours' ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 48px Roboto,sans-serif';
    ctx.fillText(this.hour.toString().padStart(2, '0'), dx + this.dialogWidth/2 - 40, timeY);
    
    // Deux points
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(':', dx + this.dialogWidth/2, timeY);
    
    // Minutes
    ctx.fillStyle = this.mode === 'minutes' ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
    ctx.fillText(this.minute.toString().padStart(2, '0'), dx + this.dialogWidth/2 + 40, timeY);

    // AM/PM
    const pmY = dy + 30;
    ctx.font = 'bold 14px Roboto,sans-serif';
    ctx.fillStyle = this.isPM ? 'rgba(255,255,255,0.6)' : '#FFFFFF';
    ctx.fillText('AM', dx + this.dialogWidth - 40, pmY);
    ctx.fillStyle = this.isPM ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
    ctx.fillText('PM', dx + this.dialogWidth - 40, pmY + 25);

    // Clock face
    const clockCenterX = dx + this.dialogWidth / 2;
    const clockCenterY = dy + 280;
    const clockRadius = 120;

    // Clock circle - FIX: Changé en gris plus clair pour contraste
    ctx.fillStyle = '#F8F8F8';
    ctx.beginPath();
    ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw numbers
    if (this.mode === 'hours') {
      this._drawClockNumbers(ctx, clockCenterX, clockCenterY, clockRadius, 12, this.hour);
    } else {
      this._drawClockMinutes(ctx, clockCenterX, clockCenterY, clockRadius, this.minute);
    }

    // Clock hand
    this._drawClockHand(ctx, clockCenterX, clockCenterY, clockRadius);

    // Actions buttons
    const btnY = dy + this.dialogHeight - 40;
    ctx.fillStyle = '#6200EE';
    ctx.font = 'bold 14px Roboto,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('ANNULER', dx + this.dialogWidth - 140, btnY);
    ctx.fillText('OK', dx + this.dialogWidth - 30, btnY);

    ctx.restore();
  }

  _drawClockNumbers(ctx, cx, cy, radius, count, selected) {
    for (let i = 1; i <= count; i++) {
      const angle = (i - 3) * (Math.PI * 2 / count);
      const x = cx + Math.cos(angle) * (radius - 30);
      const y = cy + Math.sin(angle) * (radius - 30);
      
      const isSelected = i === selected;
      
      if (isSelected) {
        // Numéro sélectionné : fond violet, texte blanc
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
      } else {
        // Numéros non sélectionnés : texte gris foncé pour contraste
        ctx.fillStyle = '#424242';
      }
      
      ctx.font = 'bold 16px Roboto,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), x, y);
    }
  }

  _drawClockMinutes(ctx, cx, cy, radius, selected) {
    // Afficher les minutes par pas de 5
    for (let i = 0; i < 60; i += 5) {
      const angle = (i / 5 - 3) * (Math.PI * 2 / 12);
      const x = cx + Math.cos(angle) * (radius - 30);
      const y = cy + Math.sin(angle) * (radius - 30);
      
      const isSelected = i === selected;
      
      if (isSelected) {
        // Minute sélectionnée : fond violet, texte blanc
        ctx.fillStyle = '#6200EE';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
      } else {
        // Minutes non sélectionnées : texte gris foncé
        ctx.fillStyle = '#424242';
      }
      
      ctx.font = 'bold 16px Roboto,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString().padStart(2, '0'), x, y);
    }
  }

  _drawClockHand(ctx, cx, cy, radius) {
    const value = this.mode === 'hours' ? this.hour : this.minute / 5;
    const total = this.mode === 'hours' ? 12 : 12;
    const angle = (value - 3) * (Math.PI * 2 / total);
    
    const handLength = radius - 50;
    const x = cx + Math.cos(angle) * handLength;
    const y = cy + Math.sin(angle) * handLength;
    
    // Line
    ctx.strokeStyle = '#6200EE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#6200EE';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // End dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // IMPORTANT: S'assurer que le composant est clickable
  isPointInside(x, y) {
    return this.isVisible && this.opacity > 0;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); 
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); 
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); 
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); 
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }
}

export default TimePicker;
