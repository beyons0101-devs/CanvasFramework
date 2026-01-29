import * as PIXI from 'pixi.js';
/**
 * Adaptateur WebGL pour le rendu Canvas 2D-like
 * @class WebGLCanvasAdapter
 */
class WebGLCanvasAdapter {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.dpr = options.dpr || window.devicePixelRatio || 1;

    // Contexte 2D principal — c'est lui que les composants utilisent
    this.ctx = this.canvas.getContext('2d', {
      alpha: options.alpha !== false,
      desynchronized: true,
      willReadFrequently: false
    });

    this.ctx.scale(this.dpr, this.dpr);

    // PixiJS uniquement pour le texte (canvas caché)
    this._initPixiTextRenderer();

    // Cache des textures texte (clé → {canvas, width, height, baselineOffset})
    this.textCache = new Map();
    this.maxTextCacheSize = 400; // à ajuster selon ta RAM cible

    // États pour simuler certaines propriétés si besoin
    this._currentFont = '16px sans-serif';
    this._currentFillStyle = '#000';
    this._currentTextAlign = 'start';
    this._currentTextBaseline = 'alphabetic';
  }

  // ────────────────────────────────────────────────
  // Initialisation du renderer texte Pixi (caché)
  // ────────────────────────────────────────────────
  _initPixiTextRenderer() {
    this.pixiApp = new PIXI.Application({
      width: 8,
      height: 8,
      backgroundAlpha: 0,
      resolution: this.dpr,
      antialias: false,           // désactivé pour matcher le canvas 2D perf
      autoDensity: true
    });

    // On cache le canvas Pixi hors écran
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '-9999px';
    hiddenContainer.style.pointerEvents = 'none';
    hiddenContainer.appendChild(this.pixiApp.view);
    document.body.appendChild(hiddenContainer);

    // Pour éviter les fuites mémoire, on peut ajouter un cleanup périodique
    this._textCleanupInterval = setInterval(() => this._cleanOldCache(), 60000);
  }

  // Nettoyage cache (FIFO simple)
  _cleanOldCache() {
    if (this.textCache.size <= this.maxTextCacheSize) return;
    const keys = Array.from(this.textCache.keys());
    const toRemove = keys.slice(0, this.textCache.size - this.maxTextCacheSize);
    toRemove.forEach(key => {
      const entry = this.textCache.get(key);
      if (entry?.texture) entry.texture.destroy(true);
      this.textCache.delete(key);
    });
  }

  // ────────────────────────────────────────────────
  // Méthodes texte → redirigées vers Pixi
  // ────────────────────────────────────────────────
  fillText(text, x, y) {
    if (!text) return;

    const font = this._currentFont;
    const color = this._currentFillStyle;
    const align = this._currentTextAlign;
    const baseline = this._currentTextBaseline;

    const key = `${text}|||${font}|||${color}|||${align}|||${baseline}`;

    let cached = this.textCache.get(key);

    if (!cached) {
      // Préparation style Pixi
      const fontSize = parseFloat(font) || 16;
      const isBold = font.includes('bold') || font.includes('700');
      const family = font.split(/\d+(?:\.\d+)?px\s*/)[1] || 'system-ui, sans-serif';

      const style = new PIXI.TextStyle({
        fontFamily: family,
        fontSize,
        fontWeight: isBold ? 'bold' : 'normal',
        fill: color,
        align,
        wordWrap: false,
        resolution: this.dpr
      });

      const txt = new PIXI.Text(text, style);
      const bounds = txt.getBounds();

      const w = Math.ceil(bounds.width) + 8;   // padding pour éviter les coupures
      const h = Math.ceil(bounds.height) + 8;

      this.pixiApp.renderer.resize(w, h);
      this.pixiApp.stage.removeChildren();

      // Ajustement position selon baseline
      let offsetY = 0;
      if (baseline === 'top') {
        txt.position.set(4, 4);
      } else if (baseline === 'middle') {
        txt.position.set(4, 4 + h / 2 - bounds.height / 2);
      } else { // alphabetic ≈ bottom
        offsetY = fontSize * 0.85; // approximation empirique
        txt.position.set(4, 4 + offsetY);
      }

      this.pixiApp.stage.addChild(txt);
      this.pixiApp.renderer.render(this.pixiApp.stage);

      const texture = this.pixiApp.renderer.generateTexture(this.pixiApp.stage, {
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        resolution: this.dpr
      });

      cached = {
        texture,
        canvas: texture.baseTexture.resource.source,
        width: texture.width,
        height: texture.height,
        baselineOffset: offsetY,
        createdAt: Date.now()
      };

      this.textCache.set(key, cached);
    }

    // On dessine la texture dans le vrai contexte 2D
    this.ctx.drawImage(
      cached.canvas,
      x - (align === 'center' ? cached.width / 2 : 0) - (align === 'right' ? cached.width : 0),
      y - cached.baselineOffset,
      cached.width,
      cached.height
    );
  }

  measureText(text) {
    // On mesure toujours en Canvas 2D pour cohérence parfaite avec le wrapping
    // (Pixi et Canvas 2D n'ont pas exactement les mêmes métriques sur toutes les fonts)
    const oldFont = this.ctx.font;
    this.ctx.font = this._currentFont;
    const metrics = this.ctx.measureText(text);
    this.ctx.font = oldFont;
    return metrics;
  }

  // ────────────────────────────────────────────────
  // Propriétés texte (on les stocke pour Pixi)
  // ────────────────────────────────────────────────
  set font(value) {
    this._currentFont = value;
    this.ctx.font = value; // on garde aussi pour measureText
  }
  get font() { return this._currentFont; }

  set fillStyle(value) {
    this._currentFillStyle = value;
    this.ctx.fillStyle = value;
  }
  get fillStyle() { return this._currentFillStyle; }

  set textAlign(value) {
    this._currentTextAlign = value;
    this.ctx.textAlign = value;
  }
  get textAlign() { return this._currentTextAlign; }

  set textBaseline(value) {
    this._currentTextBaseline = value;
    this.ctx.textBaseline = value;
  }
  get textBaseline() { return this._currentTextBaseline; }

  // ────────────────────────────────────────────────
  // Toutes les autres méthodes → directement sur ctx 2D
  // ────────────────────────────────────────────────
  clearRect(...args)          { this.ctx.clearRect(...args); }
  fillRect(...args)           { this.ctx.fillRect(...args); }
  strokeRect(...args)         { this.ctx.strokeRect(...args); }
  beginPath()                 { this.ctx.beginPath(); }
  moveTo(...args)             { this.ctx.moveTo(...args); }
  lineTo(...args)             { this.ctx.lineTo(...args); }
  arc(...args)                { this.ctx.arc(...args); }
  closePath()                 { this.ctx.closePath(); }
  fill()                      { this.ctx.fill(); }
  stroke()                    { this.ctx.stroke(); }
  drawImage(...args)          { this.ctx.drawImage(...args); }
  save()                      { this.ctx.save(); }
  restore()                   { this.ctx.restore(); }
  translate(...args)          { this.ctx.translate(...args); }
  rotate(...args)             { this.ctx.rotate(...args); }
  scale(...args)              { this.ctx.scale(...args); }
  createLinearGradient(...args){ return this.ctx.createLinearGradient(...args); }
  // etc. — toutes les méthodes que tu utilises passent directement

  // Pour le resize
  resize(width, height) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  // Cleanup quand le framework est détruit
  destroy() {
    if (this.pixiApp) {
      this.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
    }
    if (this._textCleanupInterval) {
      clearInterval(this._textCleanupInterval);
    }
    this.textCache.clear();
  }
}

export default WebGLCanvasAdapter;

