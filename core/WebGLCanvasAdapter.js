/**
 * Adaptateur WebGL pour le rendu de texte ultra-optimisé
 * Version améliorée avec optimisations supplémentaires
 * @class WebGLCanvasAdapter
 */
class WebGLCanvasAdapter {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.dpr = options.dpr || window.devicePixelRatio || 1;

    // Contexte 2D principal pour les formes
    this.ctx = this.canvas.getContext('2d', {
      alpha: options.alpha !== false,
      desynchronized: true,
      willReadFrequently: false
    });

    // ✅ OPTIONS D'OPTIMISATION
    this.useTextAtlas = options.useTextAtlas !== false;
    this.enableCulling = options.enableCulling !== false;
    this.enableBatching = options.enableBatching !== false;
    this.useOffscreenCanvas = options.useOffscreenCanvas !== false && typeof OffscreenCanvas !== 'undefined';

    // WebGL pour le texte
    this._initWebGLTextRenderer();

    // Cache optimisé avec LRU
    this.textCache = new Map();
    this.charAtlas = new Map();
    this.maxTextCacheSize = options.maxCacheSize || 400;
    this.lruKeys = []; // ✅ NOUVEAU : Tracking LRU pour meilleur cache eviction

    // Text Atlas optimisé (utilise plusieurs atlas si nécessaire)
    this.atlases = [this._createAtlas()]; // ✅ NOUVEAU : Support multi-atlas
    this.currentAtlasIndex = 0;

    // Batch rendering optimisé
    this.textBatch = [];
    this.batchMode = false;
    this.maxBatchSize = options.maxBatchSize || 1000; // ✅ NOUVEAU : Limite batch size

    // ✅ NOUVEAU : Pré-calcul des métriques communes
    this.fontMetricsCache = new Map();
    this.baselineRatios = {
      'alphabetic': 0.85,
      'top': 1.0,
      'middle': 0.65,
      'bottom': 0,
      'hanging': 0.9,
      'ideographic': 0.1
    };

    // États pour le texte
    this._currentFont = '16px sans-serif';
    this._currentFillStyle = '#000';
    this._currentTextAlign = 'start';
    this._currentTextBaseline = 'alphabetic';

    // ✅ NOUVEAU : Pool d'objets pour réduire GC
    this.objectPool = {
      points: [],
      rects: [],
      maxPoolSize: 100
    };

    // ✅ NOUVEAU : Viewport cache pour culling
    this.viewportBounds = {
      left: 0,
      right: this.canvas.width,
      top: 0,
      bottom: this.canvas.height
    };

    // Stats
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      drawCalls: 0,
      culledTexts: 0,
      batchedDraws: 0,
      atlasCount: 1
    };

    // ✅ NOUVEAU : Debounced cleanup
    this._cleanupScheduled = false;
    this._textCleanupInterval = setInterval(() => this._cleanOldCache(), 60000);
  }

  // ────────────────────────────────────────────────
  // ✅ NOUVEAU : Gestion multi-atlas
  // ────────────────────────────────────────────────
  _createAtlas() {
    const canvas = this.useOffscreenCanvas 
      ? new OffscreenCanvas(2048, 2048)
      : document.createElement('canvas');
    
    if (!this.useOffscreenCanvas) {
      canvas.width = 2048;
      canvas.height = 2048;
    }
    
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    
    return {
      canvas,
      ctx,
      x: 0,
      y: 0,
      rowHeight: 0,
      usage: 0 // ✅ Track utilization
    };
  }

  // ────────────────────────────────────────────────
  // Initialisation WebGL
  // ────────────────────────────────────────────────
  _initWebGLTextRenderer() {
    this.textCanvas = this.useOffscreenCanvas 
      ? new OffscreenCanvas(256, 256)
      : document.createElement('canvas');
    
    if (!this.useOffscreenCanvas) {
      this.textCanvas.width = 256;
      this.textCanvas.height = 256;
    }
    
    this.textCtx = this.textCanvas.getContext('2d', { 
      alpha: true, 
      willReadFrequently: false 
    });

    this.glCanvas = this.useOffscreenCanvas 
      ? new OffscreenCanvas(256, 256)
      : document.createElement('canvas');
    
    if (!this.useOffscreenCanvas) {
      this.glCanvas.width = 256;
      this.glCanvas.height = 256;
    }

    this.gl = this.glCanvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance' // ✅ NOUVEAU
    });

    if (!this.gl) {
      throw new Error('WebGL non disponible');
    }

    this._setupWebGL();
  }

  _setupWebGL() {
    const gl = this.gl;

    // Shaders identiques
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `;

    const vertexShader = this._createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this._createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Erreur de linkage du programme WebGL');
    }

    this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');

    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 1,0, 0,1, 1,1]), gl.STATIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  _createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Erreur de compilation shader: ' + info);
    }
    
    return shader;
  }

  // ────────────────────────────────────────────────
  // ✅ OPTIMISATION : Text Atlas avec cache de métriques
  // ────────────────────────────────────────────────
  _getFontMetrics(font) {
    if (this.fontMetricsCache.has(font)) {
      return this.fontMetricsCache.get(font);
    }

    const fontSize = parseFloat(font) || 16;
    const metrics = {
      fontSize,
      lineHeight: fontSize * 1.5,
      padding: 4
    };

    this.fontMetricsCache.set(font, metrics);
    return metrics;
  }

  _rasterizeChar(char, font, color) {
    const key = `${char}|${font}|${color}`; // ✅ NOUVEAU : Key plus court
    
    if (this.charAtlas.has(key)) {
      this.stats.cacheHits++;
      return this.charAtlas.get(key);
    }

    this.stats.cacheMisses++;

    const metrics = this._getFontMetrics(font);
    const atlas = this.atlases[this.currentAtlasIndex];
    
    atlas.ctx.font = font;
    const textMetrics = atlas.ctx.measureText(char);
    
    const width = Math.ceil(textMetrics.width) + metrics.padding;
    const height = Math.ceil(metrics.lineHeight) + metrics.padding;

    // ✅ NOUVEAU : Gestion intelligente multi-atlas
    if (atlas.x + width > 2048) {
      atlas.x = 0;
      atlas.y += atlas.rowHeight + 2;
      atlas.rowHeight = 0;
    }

    if (atlas.y + height > 2048) {
      // Créer un nouvel atlas au lieu de clear
      if (this.atlases.length < 4) { // ✅ Maximum 4 atlas
        this.currentAtlasIndex++;
        this.atlases.push(this._createAtlas());
        this.stats.atlasCount++;
        return this._rasterizeChar(char, font, color); // Retry
      } else {
        // Réutiliser l'atlas le moins utilisé
        this.currentAtlasIndex = this._findLeastUsedAtlas();
        this._clearAtlas(this.currentAtlasIndex);
        return this._rasterizeChar(char, font, color);
      }
    }

    // Dessiner le caractère
    atlas.ctx.font = font;
    atlas.ctx.fillStyle = color;
    atlas.ctx.textBaseline = 'alphabetic';
    atlas.ctx.fillText(char, atlas.x + 2, atlas.y + metrics.fontSize);

    const charData = {
      atlasIndex: this.currentAtlasIndex,
      x: atlas.x,
      y: atlas.y,
      width,
      height,
      textWidth: textMetrics.width
    };

    this.charAtlas.set(key, charData);
    atlas.usage++;

    atlas.x += width + 2;
    atlas.rowHeight = Math.max(atlas.rowHeight, height);

    return charData;
  }

  // ✅ NOUVEAU : Trouve l'atlas le moins utilisé
  _findLeastUsedAtlas() {
    let minUsage = Infinity;
    let minIndex = 0;
    
    for (let i = 0; i < this.atlases.length; i++) {
      if (this.atlases[i].usage < minUsage) {
        minUsage = this.atlases[i].usage;
        minIndex = i;
      }
    }
    
    return minIndex;
  }

  // ✅ NOUVEAU : Clear un atlas spécifique
  _clearAtlas(index) {
    const atlas = this.atlases[index];
    atlas.ctx.clearRect(0, 0, 2048, 2048);
    atlas.x = 0;
    atlas.y = 0;
    atlas.rowHeight = 0;
    atlas.usage = 0;

    // Supprimer les entrées du cache pour cet atlas
    for (let [key, value] of this.charAtlas.entries()) {
      if (value.atlasIndex === index) {
        this.charAtlas.delete(key);
      }
    }
  }

  // ────────────────────────────────────────────────
  // ✅ OPTIMISATION : Culling amélioré avec marge
  // ────────────────────────────────────────────────
  _isInViewport(x, y, width, height) {
    if (!this.enableCulling) return true;

    const margin = 50; // ✅ NOUVEAU : Marge pour pré-render
    
    return !(
      x + width < -margin ||
      x > this.viewportBounds.right + margin ||
      y + height < -margin ||
      y > this.viewportBounds.bottom + margin
    );
  }

  // ✅ NOUVEAU : Update viewport bounds
  updateViewport(left = 0, top = 0, right = this.canvas.width, bottom = this.canvas.height) {
    this.viewportBounds = { left, top, right, bottom };
  }

  // ────────────────────────────────────────────────
  // ✅ OPTIMISATION : Batch Rendering avec auto-flush
  // ────────────────────────────────────────────────
  beginTextBatch() {
    this.batchMode = true;
    this.textBatch = [];
  }

  flushTextBatch() {
    if (this.textBatch.length === 0) {
      this.batchMode = false;
      return;
    }

    // ✅ NOUVEAU : Tri par font/color pour réduire les changements d'état
    this.textBatch.sort((a, b) => {
      const keyA = `${a.font}|${a.color}`;
      const keyB = `${b.font}|${b.color}`;
      return keyA.localeCompare(keyB);
    });

    let lastFont = '';
    let lastColor = '';

    // Dessiner tous les textes du batch
    for (let item of this.textBatch) {
      // ✅ NOUVEAU : Éviter les changements d'état inutiles
      if (item.font !== lastFont) {
        this._currentFont = item.font;
        lastFont = item.font;
      }
      if (item.color !== lastColor) {
        this._currentFillStyle = item.color;
        lastColor = item.color;
      }
      
      this._currentTextAlign = item.align;
      this._currentTextBaseline = item.baseline;
      
      this._drawTextImmediate(item.text, item.x, item.y);
    }

    this.stats.batchedDraws += this.textBatch.length;
    this.textBatch = [];
    this.batchMode = false;
  }

  // ────────────────────────────────────────────────
  // fillText : MÉTHODE PRINCIPALE
  // ────────────────────────────────────────────────
  fillText(text, x, y) {
    if (!text) return;

    const font = this._currentFont;
    const color = this._currentFillStyle;
    const align = this._currentTextAlign;
    const baseline = this._currentTextBaseline;

    // Mode batch
    if (this.batchMode) {
      this.textBatch.push({ text, x, y, font, color, align, baseline });
      
      // ✅ NOUVEAU : Auto-flush si batch trop grand
      if (this.textBatch.length >= this.maxBatchSize) {
        this.flushTextBatch();
        this.beginTextBatch(); // Redémarrer le batch
      }
      return;
    }

    this._drawTextImmediate(text, x, y);
  }

  _drawTextImmediate(text, x, y) {
    const font = this._currentFont;
    const color = this._currentFillStyle;
    const align = this._currentTextAlign;
    const baseline = this._currentTextBaseline;

    // ✅ Culling optimisé
    const metrics = this._getFontMetrics(font);
    const estimatedWidth = text.length * metrics.fontSize * 0.6;

    if (!this._isInViewport(x - estimatedWidth/2, y - metrics.fontSize, estimatedWidth, metrics.fontSize * 2)) {
      this.stats.culledTexts++;
      return;
    }

    // Mode atlas par défaut
    if (this.useTextAtlas) {
      this._drawTextWithAtlas(text, x, y, font, color, align, baseline);
    } else {
      this._drawTextCached(text, x, y, font, color, align, baseline);
    }

    this.stats.drawCalls++;
  }

  // ✅ Dessiner avec Text Atlas (optimisé)
  _drawTextWithAtlas(text, x, y, font, color, align, baseline) {
    // ✅ NOUVEAU : Pré-calcul des métriques
    const metrics = this._getFontMetrics(font);
    let totalWidth = 0;
    const chars = Array.from(text); // Support Unicode
    const charData = [];

    // Phase 1 : Rasterization (peut être mise en cache)
    for (let char of chars) {
      const data = this._rasterizeChar(char, font, color);
      charData.push(data);
      totalWidth += data.textWidth;
    }

    // Phase 2 : Calcul positions
    let startX = x;
    if (align === 'center') {
      startX -= totalWidth / 2;
    } else if (align === 'right') {
      startX -= totalWidth;
    } else if (align === 'end') {
      startX -= totalWidth; // ✅ Support 'end'
    }

    const baselineOffset = metrics.fontSize * (this.baselineRatios[baseline] || 0.85);

    // Phase 3 : Rendu
    let offsetX = 0;
    for (let i = 0; i < chars.length; i++) {
      const data = charData[i];
      const atlas = this.atlases[data.atlasIndex];

      this.ctx.drawImage(
        atlas.canvas,
        data.x, data.y, data.width, data.height,
        Math.round(startX + offsetX), Math.round(y - baselineOffset), 
        data.width, data.height
      );

      offsetX += data.textWidth;
    }
  }

  // ✅ Ancien système avec LRU
  _drawTextCached(text, x, y, font, color, align, baseline) {
    const key = `${text}|${font}|${color}|${align}|${baseline}`;
    
    // ✅ NOUVEAU : LRU tracking
    this._touchLRU(key);
    
    let cached = this.textCache.get(key);

    if (!cached) {
      const rasterized = this._rasterizeText(text, font, color, align, baseline);
      const texture = this._createWebGLTexture(rasterized.canvas, rasterized.width, rasterized.height);

      cached = {
        texture,
        width: rasterized.width,
        height: rasterized.height,
        textWidth: rasterized.textWidth,
        baselineOffset: rasterized.baselineOffset,
        createdAt: Date.now()
      };

      this.textCache.set(key, cached);
      
      // ✅ NOUVEAU : Eviction immédiate si trop grand
      if (this.textCache.size > this.maxTextCacheSize) {
        this._scheduleCleanup();
      }
    }

    let finalX = x - 8;
    if (align === 'center') finalX -= cached.textWidth / 2;
    else if (align === 'right' || align === 'end') finalX -= cached.textWidth;

    const finalY = y - 8 - cached.baselineOffset;

    this._drawTextureToCanvas(cached.texture, cached.width, cached.height, 
      Math.round(finalX), Math.round(finalY));
  }

  // ✅ NOUVEAU : LRU tracking
  _touchLRU(key) {
    const index = this.lruKeys.indexOf(key);
    if (index > -1) {
      this.lruKeys.splice(index, 1);
    }
    this.lruKeys.push(key);
  }

  // ────────────────────────────────────────────────
  // Méthodes auxiliaires
  // ────────────────────────────────────────────────
  _rasterizeText(text, font, color, align, baseline) {
    const metrics = this._getFontMetrics(font);
    this.textCtx.font = font;
    const textMetrics = this.textCtx.measureText(text);
    
    const width = Math.ceil(textMetrics.width) + 16;
    const height = Math.ceil(metrics.lineHeight) + 16;

    // ✅ NOUVEAU : Resize seulement si nécessaire
    if (this.textCanvas.width < width) {
      this.textCanvas.width = Math.min(width, 4096); // ✅ Limite max
    }
    if (this.textCanvas.height < height) {
      this.textCanvas.height = Math.min(height, 4096);
    }

    this.textCtx.clearRect(0, 0, width, height);
    this.textCtx.font = font;
    this.textCtx.fillStyle = color;
    this.textCtx.textAlign = 'left';
    this.textCtx.textBaseline = 'alphabetic';

    const offsetY = metrics.fontSize * (this.baselineRatios[baseline] || 0.85);
    this.textCtx.fillText(text, 8, 8 + offsetY);

    return { 
      canvas: this.textCanvas, 
      width, 
      height, 
      textWidth: textMetrics.width, 
      baselineOffset: offsetY 
    };
  }

  _createWebGLTexture(canvas, width, height) {
    const gl = this.gl;
    const texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

    return texture;
  }

  _drawTextureToCanvas(texture, width, height, x, y) {
    const gl = this.gl;
    
    if (this.glCanvas.width !== width || this.glCanvas.height !== height) {
      this.glCanvas.width = width;
      this.glCanvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, width,0, 0,height, width,height]), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(this.texCoordLocation);
    gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.resolutionLocation, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.ctx.drawImage(this.glCanvas, x, y, width, height);
  }

  // ────────────────────────────────────────────────
  // ✅ Nettoyage optimisé avec debounce
  // ────────────────────────────────────────────────
  _scheduleCleanup() {
    if (this._cleanupScheduled) return;
    
    this._cleanupScheduled = true;
    requestIdleCallback(() => {
      this._cleanOldCache();
      this._cleanupScheduled = false;
    }, { timeout: 1000 });
  }

  _cleanOldCache() {
    if (this.textCache.size <= this.maxTextCacheSize) return;
    
    const gl = this.gl;
    const toRemove = this.textCache.size - this.maxTextCacheSize;
    
    // ✅ NOUVEAU : Utiliser LRU pour supprimer les moins utilisés
    const keysToRemove = this.lruKeys.splice(0, toRemove);
    
    keysToRemove.forEach(key => {
      const entry = this.textCache.get(key);
      if (entry?.texture) {
        gl.deleteTexture(entry.texture);
      }
      this.textCache.delete(key);
    });
  }

  // ────────────────────────────────────────────────
  // Stats & utils
  // ────────────────────────────────────────────────
  getStats() {
    return {
      ...this.stats,
      atlasSize: this.charAtlas.size,
      cacheSize: this.textCache.size,
      cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
      atlasCount: this.atlases.length,
      avgAtlasUsage: this.atlases.reduce((sum, a) => sum + a.usage, 0) / this.atlases.length
    };
  }

  resetStats() {
    this.stats = { 
      cacheHits: 0, 
      cacheMisses: 0, 
      drawCalls: 0, 
      culledTexts: 0,
      batchedDraws: 0,
      atlasCount: this.atlases.length
    };
  }

  // ✅ NOUVEAU : Clear all caches
  clearCaches() {
    this.charAtlas.clear();
    this.fontMetricsCache.clear();
    
    const gl = this.gl;
    this.textCache.forEach(entry => {
      if (entry.texture) gl.deleteTexture(entry.texture);
    });
    this.textCache.clear();
    this.lruKeys = [];

    // Clear all atlases
    this.atlases.forEach((atlas, i) => this._clearAtlas(i));
    this.currentAtlasIndex = 0;
  }

  // ────────────────────────────────────────────────
  // API Canvas 2D standard
  // ────────────────────────────────────────────────
  measureText(text) {
    const oldFont = this.ctx.font;
    this.ctx.font = this._currentFont;
    const metrics = this.ctx.measureText(text);
    this.ctx.font = oldFont;
    return metrics;
  }

  set font(value) { this._currentFont = value; this.ctx.font = value; }
  get font() { return this._currentFont; }
  set fillStyle(value) { this._currentFillStyle = value; this.ctx.fillStyle = value; }
  get fillStyle() { return this._currentFillStyle; }
  set textAlign(value) { this._currentTextAlign = value; this.ctx.textAlign = value; }
  get textAlign() { return this._currentTextAlign; }
  set textBaseline(value) { this._currentTextBaseline = value; this.ctx.textBaseline = value; }
  get textBaseline() { return this._currentTextBaseline; }

  clearRect(...args) { this.ctx.clearRect(...args); }
  fillRect(...args) { this.ctx.fillRect(...args); }
  strokeRect(...args) { this.ctx.strokeRect(...args); }
  beginPath() { this.ctx.beginPath(); }
  moveTo(...args) { this.ctx.moveTo(...args); }
  lineTo(...args) { this.ctx.lineTo(...args); }
  arc(...args) { this.ctx.arc(...args); }
  closePath() { this.ctx.closePath(); }
  fill() { this.ctx.fill(); }
  stroke() { this.ctx.stroke(); }
  drawImage(...args) { this.ctx.drawImage(...args); }
  save() { this.ctx.save(); }
  restore() { this.ctx.restore(); }
  translate(...args) { this.ctx.translate(...args); }
  rotate(...args) { this.ctx.rotate(...args); }
  scale(...args) { this.ctx.scale(...args); }
  createLinearGradient(...args) { return this.ctx.createLinearGradient(...args); }

  set strokeStyle(value) { this.ctx.strokeStyle = value; }
  get strokeStyle() { return this.ctx.strokeStyle; }
  set lineWidth(value) { this.ctx.lineWidth = value; }
  get lineWidth() { return this.ctx.lineWidth; }
  set globalAlpha(value) { this.ctx.globalAlpha = value; }
  get globalAlpha() { return this.ctx.globalAlpha; }

  resize(width, height) {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
    
    // ✅ NOUVEAU : Update viewport
    this.updateViewport(0, 0, width, height);
  }

  destroy() {
    if (this.gl) {
      const gl = this.gl;
      this.textCache.forEach(entry => { 
        if (entry.texture) gl.deleteTexture(entry.texture); 
      });
      gl.deleteBuffer(this.positionBuffer);
      gl.deleteBuffer(this.texCoordBuffer);
      gl.deleteProgram(this.program);
    }
    
    if (this._textCleanupInterval) {
      clearInterval(this._textCleanupInterval);
    }
    
    this.clearCaches();
  }
}

export default WebGLCanvasAdapter;
