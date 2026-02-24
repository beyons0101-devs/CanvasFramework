import Component from '../core/Component.js';

/**
 * Sélecteur de couleur avec variantes Material et Cupertino
 * @class
 * @extends Component
 * 
 * Material: Palette + sliders HSL
 * Cupertino: Style iOS avec grille de couleurs
 * 
 * VERSION OPTIMISÉE SANS CLIGNOTEMENT
 */
class ColorPicker extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.platform = framework.platform;
    this.showHex = options.showHex !== false;
    this.showAlpha = options.showAlpha !== false;
    this.onColorChange = options.onColorChange || (() => {});
    
    // Couleur initiale
    const initialColor = options.color || '#6200EE';
    const rgb = this.hexToRgb(initialColor);
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    
    this.hue = hsv.h;
    this.saturation = hsv.s;
    this.value = hsv.v;
    this.alpha = 1;
    
    // Dimensions
    if (this.platform === 'material') {
      this.height = 320;
      this.paletteSize = 200;
      this.sliderHeight = 20;
    } else {
      this.height = 480; // Augmenté pour tout contenir
      this.gridSize = 240; // Réduit pour ne pas dépasser
      this.swatchSize = 28; // Réduit pour mieux aligner
    }
    
    // État des interactions
    this.draggingPalette = false;
    this.draggingSlider = null;
    
    // OPTIMISATION : Cache canvas pour la palette
    this.paletteCanvas = null;
    this.paletteCtx = null;
    this.cachedHue = -1; // Pour savoir quand regénérer
    
    // Throttle redraw
    this.needsRedraw = false;
    this.isDrawing = false;
    
    // Couleurs prédéfinies iOS
    this.iosColors = [
      ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#30B0C7', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE'],
      ['#FF2D55', '#A2845E', '#8E8E93', '#FF6482', '#FFB340', '#FFD426', '#5DD167', '#26D9CE', '#44BAD4', '#4AB8EE'],
      ['#0A84FF', '#6E64E8', '#BF5AF2', '#FF6961', '#FF9F0A', '#FFD60A', '#30D158', '#00D9C8', '#40C8E0', '#64D2FF']
    ];
	
	// ✅ Flag anti-double appel
    this._isNotifying = false;
  }
  
  /**
   * Génère la palette SV dans un canvas caché (UNE SEULE FOIS)
   * @private
   */
  generatePaletteCache() {
    // Si la teinte n'a pas changé, pas besoin de regénérer
    if (this.cachedHue === this.hue && this.paletteCanvas) {
      return;
    }
    
    // Créer canvas si nécessaire
    if (!this.paletteCanvas) {
      this.paletteCanvas = document.createElement('canvas');
      this.paletteCanvas.width = this.paletteSize;
      this.paletteCanvas.height = this.paletteSize;
      this.paletteCtx = this.paletteCanvas.getContext('2d');
    }
    
    const size = this.paletteSize;
    
    // Générer la palette pixel par pixel (UNE SEULE FOIS)
    for (let i = 0; i < size; i++) {
      const s = i / size;
      
      for (let j = 0; j < size; j++) {
        const v = 1 - (j / size);
        const rgb = this.hsvToRgb(this.hue, s, v);
        
        this.paletteCtx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.paletteCtx.fillRect(i, j, 1, 1);
      }
    }
    
    this.cachedHue = this.hue;
  }
  
  /**
   * Dessine le picker Material
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawMaterial(ctx) {
    let currentY = this.y + 10;
    
    // Palette SV (OPTIMISÉE)
    this.drawSVPalette(ctx, this.x + 10, currentY);
    currentY += this.paletteSize + 20;
    
    // Slider Hue
    this.drawHueSlider(ctx, this.x + 10, currentY);
    currentY += this.sliderHeight + 20;
    
    // Slider Alpha (si activé)
    if (this.showAlpha) {
      this.drawAlphaSlider(ctx, this.x + 10, currentY);
      currentY += this.sliderHeight + 20;
    }
    
    // Prévisualisation + code hex
    this.drawMaterialPreview(ctx, this.x + 10, currentY);
  }
  
  /**
   * Dessine la palette Saturation-Value (VERSION OPTIMISÉE)
   * @private
   */
  drawSVPalette(ctx, x, y) {
    const size = this.paletteSize;
    
    // Générer ou récupérer le cache
    this.generatePaletteCache();
    
    // DESSINER LE CACHE (INSTANTANÉ!)
    ctx.drawImage(this.paletteCanvas, x, y);
    
    // Curseur de sélection
    const cursorX = x + this.saturation * size;
    const cursorY = y + (1 - this.value) * size;
    
    ctx.strokeStyle = this.value > 0.5 ? '#000000' : '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = this.value > 0.5 ? '#FFFFFF' : '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 9, 0, Math.PI * 2);
    ctx.stroke();
    
    // Stocker pour interaction
    this.paletteRect = { x, y, width: size, height: size };
  }
  
  /**
   * Dessine le slider de teinte
   * @private
   */
  drawHueSlider(ctx, x, y) {
    const width = this.width - 20;
    const height = this.sliderHeight;
    
    // Gradient arc-en-ciel
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    for (let i = 0; i <= 6; i++) {
      const hue = (i / 6) * 360;
      const rgb = this.hsvToRgb(hue, 1, 1);
      gradient.addColorStop(i / 6, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    }
    
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    
    // Curseur
    const cursorX = x + (this.hue / 360) * width;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cursorX, y + height / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    this.hueSliderRect = { x, y, width, height };
  }
  
  /**
   * Dessine le slider d'opacité
   * @private
   */
  drawAlphaSlider(ctx, x, y) {
    const width = this.width - 20;
    const height = this.sliderHeight;
    
    // Fond à damier (transparence)
    this.drawCheckerboard(ctx, x, y, width, height);
    
    // Gradient avec couleur actuelle
    const rgb = this.getCurrentRgb();
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
    
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    
    // Curseur
    const cursorX = x + this.alpha * width;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cursorX, y + height / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    this.alphaSliderRect = { x, y, width, height };
  }
  
  /**
   * Dessine la prévisualisation Material
   * @private
   */
  drawMaterialPreview(ctx, x, y) {
    const previewSize = 60;
    
    // Damier de fond
    this.drawCheckerboard(ctx, x, y, previewSize, previewSize);
    
    // Couleur actuelle
    const color = this.getCurrentColor();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, previewSize, previewSize);
    
    // Bordure
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, previewSize, previewSize);
    
    // Code Hex
    if (this.showHex) {
      const hexCode = this.getCurrentHex();
      ctx.fillStyle = '#000000';
      ctx.font = '14px Roboto, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(hexCode, x + previewSize + 15, y + previewSize / 2);
    }
  }
  
  /**
   * Dessine le picker Cupertino (iOS)
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawCupertino(ctx) {
    let currentY = this.y + 16;
    
    // Header avec prévisualisation
    this.drawIOSPreview(ctx, currentY);
    currentY += 96;
    
    // Grille de couleurs prédéfinies (CENTRÉE)
    const gridWidth = 10 * (this.swatchSize + 4); // 10 couleurs par ligne
    const gridX = this.x + (this.width - gridWidth) / 2;
    this.drawColorGrid(ctx, gridX, currentY);
    currentY += this.iosColors.length * (this.swatchSize + 4) + 24;
    
    // Sliders iOS style
    this.drawIOSSliders(ctx, this.x + 20, currentY);
  }
  
  /**
   * Dessine la prévisualisation iOS en haut
   * @private
   */
  drawIOSPreview(ctx, y) {
    const previewSize = 64;
    const centerX = this.x + this.width / 2;
    
    // Damier de fond
    this.drawCheckerboard(ctx, centerX - previewSize / 2, y + 8, previewSize, previewSize);
    
    // Couleur actuelle
    const color = this.getCurrentColor();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, y + 8 + previewSize / 2, previewSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Bordure subtile
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Code Hex en dessous
    if (this.showHex) {
      const hexCode = this.getCurrentHex();
      ctx.fillStyle = '#8E8E93';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(hexCode.toUpperCase(), centerX, y + 8 + previewSize + 8);
    }
  }
  
  /**
   * Dessine la grille de couleurs iOS
   * @private
   */
  drawColorGrid(ctx, x, y) {
    this.colorSwatches = [];
    
    this.iosColors.forEach((row, rowIndex) => {
      row.forEach((color, colIndex) => {
        const swatchX = x + colIndex * (this.swatchSize + 4); // Espacement réduit
        const swatchY = y + rowIndex * (this.swatchSize + 4);
        
        // Couleur
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(swatchX + this.swatchSize / 2, swatchY + this.swatchSize / 2, 
                this.swatchSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bordure si sélectionné
        const currentColor = this.getCurrentHex();
        if (color.toUpperCase() === currentColor.toUpperCase()) {
          ctx.strokeStyle = '#007AFF';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        
        // Stocker pour clic
        this.colorSwatches.push({
          x: swatchX,
          y: swatchY,
          size: this.swatchSize,
          color: color
        });
      });
    });
  }
  
  /**
   * Dessine les sliders iOS (VRAI STYLE iOS)
   * @private
   */
  drawIOSSliders(ctx, x, y) {
    const sliderWidth = this.width - 140; // Espace pour label + valeur
    const sliderHeight = 28;
    const spacing = 16;
    
    // Labels des sliders
    const labels = ['Red', 'Green', 'Blue'];
    if (this.showAlpha) labels.push('Opacity');
    
    const channels = ['r', 'g', 'b'];
    if (this.showAlpha) channels.push('a');
    
    labels.forEach((label, index) => {
      const channel = channels[index];
      const sliderY = y + index * (sliderHeight + spacing);
      
      // Label (aligné à gauche)
      ctx.fillStyle = '#000000';
      ctx.font = '15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, sliderY + sliderHeight / 2);
      
      // Slider (avec bon espacement)
      const sliderStartX = x + 70; // Espace fixe pour les labels
      this.drawIOSSlider(ctx, sliderStartX, sliderY, sliderWidth, sliderHeight, channel);
    });
  }
  
  /**
   * Dessine un slider iOS (VRAI STYLE iOS)
   * @private
   */
  drawIOSSlider(ctx, x, y, width, height, channel) {
    const rgb = this.getCurrentRgb();
    const value = channel === 'r' ? rgb.r / 255 :
                  channel === 'g' ? rgb.g / 255 :
                  channel === 'b' ? rgb.b / 255 :
                  this.alpha;
    
    const trackHeight = 4;
    const trackY = y + height / 2 - trackHeight / 2;
    
    // Track background (ligne fine iOS)
    ctx.fillStyle = '#D1D1D6';
    this.roundRect(ctx, x, trackY, width, trackHeight, trackHeight / 2);
    ctx.fill();
    
    // Track filled avec couleur
    let fillColor;
    if (channel === 'r') {
      const currentRgb = this.getCurrentRgb();
      fillColor = `rgb(${value * 255}, ${currentRgb.g}, ${currentRgb.b})`;
    } else if (channel === 'g') {
      const currentRgb = this.getCurrentRgb();
      fillColor = `rgb(${currentRgb.r}, ${value * 255}, ${currentRgb.b})`;
    } else if (channel === 'b') {
      const currentRgb = this.getCurrentRgb();
      fillColor = `rgb(${currentRgb.r}, ${currentRgb.g}, ${value * 255})`;
    } else if (channel === 'a') {
      fillColor = this.getCurrentColor();
    }
    
    ctx.fillStyle = fillColor;
    this.roundRect(ctx, x, trackY, width * value, trackHeight, trackHeight / 2);
    ctx.fill();
    
    // Thumb (cercle blanc iOS)
    const thumbX = x + width * value;
    const thumbRadius = 13;
    
    // Ombre du thumb
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    
    // Thumb blanc
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(thumbX, y + height / 2, thumbRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Bordure subtile du thumb
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(thumbX, y + height / 2, thumbRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Valeur en pourcentage (alignée à droite)
    const percentage = Math.round(value * 100);
    ctx.fillStyle = '#8E8E93';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage}%`, x + width + 12, y + height / 2);
    
    // Stocker pour interaction (zone cliquable élargie)
    if (!this.iosSliders) this.iosSliders = {};
    this.iosSliders[channel] = { 
      x, 
      y: y + height / 2 - 16, // Zone cliquable plus grande verticalement
      width, 
      height: 32 
    };
  }
  
  /**
   * Dessine un damier (fond transparence)
   * @private
   */
  drawCheckerboard(ctx, x, y, width, height) {
    const squareSize = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, width, height);
    
    ctx.fillStyle = '#E0E0E0';
    for (let i = 0; i < width; i += squareSize) {
      for (let j = 0; j < height; j += squareSize) {
        if ((i / squareSize + j / squareSize) % 2 === 0) {
          ctx.fillRect(x + i, y + j, squareSize, squareSize);
        }
      }
    }
  }
  
  /**
   * Dessine le composant
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = this.platform === 'material' ? '#FFFFFF' : '#F2F2F7';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    if (this.platform === 'material') {
      this.drawMaterial(ctx);
    } else {
      this.drawCupertino(ctx);
    }
    
    ctx.restore();
  }
  
  handleTouchStart(x, y) {
    if (this.platform === 'material') {
      // Palette SV
      if (this.paletteRect && this.isPointInRect(x, y, this.paletteRect)) {
        this.draggingPalette = true;
        this.updatePalette(x, y);
        return true;
      }
      
      // Slider Hue
      if (this.hueSliderRect && this.isPointInRect(x, y, this.hueSliderRect)) {
        this.draggingSlider = 'hue';
        this.updateHueSlider(x);
        return true;
      }
      
      // Slider Alpha
      if (this.showAlpha && this.alphaSliderRect && this.isPointInRect(x, y, this.alphaSliderRect)) {
        this.draggingSlider = 'alpha';
        this.updateAlphaSlider(x);
        return true;
      }
    } else {
      // Swatches iOS
      if (this.colorSwatches) {
        for (let swatch of this.colorSwatches) {
          if (this.isPointInRect(x, y, swatch)) {
            this.setColorFromHex(swatch.color);
            return true;
          }
        }
      }
      
      // Sliders iOS
      if (this.iosSliders) {
        for (let channel in this.iosSliders) {
          if (this.isPointInRect(x, y, this.iosSliders[channel])) {
            this.draggingSlider = channel;
            this.updateIOSSlider(x, channel);
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  handleTouchMove(x, y) {
    if (this.draggingPalette) {
      this.updatePalette(x, y);
      return true;
    }
    
    if (this.draggingSlider) {
      if (this.platform === 'material') {
        if (this.draggingSlider === 'hue') this.updateHueSlider(x);
        if (this.draggingSlider === 'alpha') this.updateAlphaSlider(x);
      } else {
        this.updateIOSSlider(x, this.draggingSlider);
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Gère le mouvement de la souris (pour le drag)
   */
  handleHover(x, y) {
    // Si on est en train de drag, continuer
    if (this.draggingPalette || this.draggingSlider) {
      return this.handleTouchMove(x, y);
    }
    return false;
  }
  
  handleTouchEnd() {
    this.draggingPalette = false;
    this.draggingSlider = null;
  }
  
  /**
   * Gère le relâchement de la souris
   */
  handleMouseUp() {
    this.handleTouchEnd();
  }
  
  /**
   * Met à jour la palette SV
   * @private
   */
  updatePalette(x, y) {
    const rect = this.paletteRect;
    this.saturation = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
    this.value = Math.max(0, Math.min(1, 1 - (y - rect.y) / rect.height));
    this.notifyChange();
  }
  
  /**
   * Met à jour le slider de teinte
   * @private
   */
  updateHueSlider(x) {
    const rect = this.hueSliderRect;
    this.hue = Math.max(0, Math.min(360, ((x - rect.x) / rect.width) * 360));
    this.notifyChange();
  }
  
  /**
   * Met à jour le slider d'alpha
   * @private
   */
  updateAlphaSlider(x) {
    const rect = this.alphaSliderRect;
    this.alpha = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
    this.notifyChange();
  }
  
  /**
   * Met à jour un slider iOS
   * @private
   */
  updateIOSSlider(x, channel) {
    const rect = this.iosSliders[channel];
    const value = Math.max(0, Math.min(1, (x - rect.x) / rect.width));
    
    const rgb = this.getCurrentRgb();
    
    if (channel === 'r') {
      const hsv = this.rgbToHsv(value * 255, rgb.g, rgb.b);
      this.hue = hsv.h;
      this.saturation = hsv.s;
      this.value = hsv.v;
    } else if (channel === 'g') {
      const hsv = this.rgbToHsv(rgb.r, value * 255, rgb.b);
      this.hue = hsv.h;
      this.saturation = hsv.s;
      this.value = hsv.v;
    } else if (channel === 'b') {
      const hsv = this.rgbToHsv(rgb.r, rgb.g, value * 255);
      this.hue = hsv.h;
      this.saturation = hsv.s;
      this.value = hsv.v;
    } else if (channel === 'a') {
      this.alpha = value;
    }
    
    this.notifyChange();
  }
  
  /**
   * Notifie le changement de couleur (OPTIMISÉ)
   * @private
   */
  notifyChange() {
    // ✅ Éviter les appels multiples
    if (this._isNotifying) return;
    this._isNotifying = true;
    
    // ✅ Appeler le callback immédiatement
    if (typeof this.onColorChange === 'function') {
        this.onColorChange(this.getCurrentColor(), this.getCurrentHex());
    }
  
    // Redessiner (optionnel)
    if (this.framework && this.framework.redraw) {
        this.framework.redraw();
    }
    
    // ✅ Réinitialiser le flag après un court délai
    setTimeout(() => {
        this._isNotifying = false;
    }, 50);
  }
  /**
   * Obtient la couleur RGB actuelle
   * @returns {Object} {r, g, b}
   */
  getCurrentRgb() {
    return this.hsvToRgb(this.hue, this.saturation, this.value);
  }
  
  /**
   * Obtient la couleur actuelle (rgba ou hex)
   * @returns {string}
   */
  getCurrentColor() {
    const rgb = this.getCurrentRgb();
    if (this.showAlpha && this.alpha < 1) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.alpha.toFixed(2)})`;
    }
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  
  /**
   * Obtient le code hexa actuel
   * @returns {string}
   */
  getCurrentHex() {
    const rgb = this.getCurrentRgb();
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  
  /**
   * Définit la couleur depuis un code hex
   */
  setColorFromHex(hex) {
    const rgb = this.hexToRgb(hex);
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    this.hue = hsv.h;
    this.saturation = hsv.s;
    this.value = hsv.v;
    this.notifyChange();
  }
  
  // ===== UTILITAIRES CONVERSION COULEURS =====
  
  hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r, g, b;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }
  
  rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) h = 60 * (((g - b) / delta) % 6);
      else if (max === g) h = 60 * (((b - r) / delta) + 2);
      else h = 60 * (((r - g) / delta) + 4);
    }
    
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    
    return { h, s, v };
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
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
  
  isPointInRect(x, y, rect) {
    // Support pour les swatches iOS qui ont une propriété 'size' au lieu de width/height
    if (rect.size !== undefined) {
      return x >= rect.x && x <= rect.x + rect.size &&
             y >= rect.y && y <= rect.y + rect.size;
    }
    
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }
  
  isPointInside(x, y) {
	  // Vérifier si le clic est dans le ColorPicker
	  if (x < this.x || x > this.x + this.width || 
		  y < this.y || y > this.y + this.height) {
		return false;
	  }
	  
	  
	  // Material
	  if (this.platform === 'material') {
		// Palette SV
		if (this.paletteRect && 
			x >= this.paletteRect.x && x <= this.paletteRect.x + this.paletteRect.width &&
			y >= this.paletteRect.y && y <= this.paletteRect.y + this.paletteRect.height) {
		  this.draggingPalette = true;
		  this.updatePalette(x, y);
		  return true;
		}
		
		// Slider Hue
		if (this.hueSliderRect && 
			x >= this.hueSliderRect.x && x <= this.hueSliderRect.x + this.hueSliderRect.width &&
			y >= this.hueSliderRect.y && y <= this.hueSliderRect.y + this.hueSliderRect.height) {
		  this.draggingSlider = 'hue';
		  this.updateHueSlider(x);
		  return true;
		}
		
		// Slider Alpha
		if (this.showAlpha && this.alphaSliderRect && 
			x >= this.alphaSliderRect.x && x <= this.alphaSliderRect.x + this.alphaSliderRect.width &&
			y >= this.alphaSliderRect.y && y <= this.alphaSliderRect.y + this.alphaSliderRect.height) {
		  this.draggingSlider = 'alpha';
		  this.updateAlphaSlider(x);
		  return true;
		}
	  } 
	  // iOS
	  else {
		// Swatches
		if (this.colorSwatches) {
		  for (let swatch of this.colorSwatches) {
			if (x >= swatch.x && x <= swatch.x + swatch.size &&
				y >= swatch.y && y <= swatch.y + swatch.size) {
			  this.setColorFromHex(swatch.color);
			  return true;
			}
		  }
		}
		
		// Sliders iOS
		if (this.iosSliders) {
		  for (let channel in this.iosSliders) {
			const rect = this.iosSliders[channel];
			if (x >= rect.x && x <= rect.x + rect.width &&
				y >= rect.y && y <= rect.y + rect.height) {
			  this.draggingSlider = channel;
			  this.updateIOSSlider(x, channel);
			  return true;
			}
		  }
		}
	  }
	  
	  return true; // Important: retourner true même si pas sur contrôle
	}
}

export default ColorPicker;