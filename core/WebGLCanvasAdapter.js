/**
 * Adaptateur WebGL pour le rendu de texte ultra-optimisé
 * Utilise WebGL + Text Atlas + Culling + Batch Rendering
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
    this.useTextAtlas = options.useTextAtlas !== false; // Text atlas par défaut
    this.enableCulling = options.enableCulling !== false; // Culling activé
    this.enableBatching = options.enableBatching !== false; // Batching activé

    // WebGL pour le texte
    this._initWebGLTextRenderer();

    // Cache
    this.textCache = new Map(); // Cache par texte complet (fallback)
    this.charAtlas = new Map(); // Cache par caractère (atlas)
    this.maxTextCacheSize = options.maxCacheSize || 400;

    // Text Atlas (grand canvas 2048x2048 avec tous les caractères)
    this.atlasCanvas = document.createElement('canvas');
    this.atlasCanvas.width = 2048;
    this.atlasCanvas.height = 2048;
    this.atlasCtx = this.atlasCanvas.getContext('2d', { alpha: true });
    this.atlasX = 0;
    this.atlasY = 0;
    this.atlasRowHeight = 0;

    // Batch rendering
    this.textBatch = [];
    this.batchMode = false;

    // États pour le texte
    this._currentFont = '16px sans-serif';
    this._currentFillStyle = '#000';
    this._currentTextAlign = 'start';
    this._currentTextBaseline = 'alphabetic';

    // Stats (optionnel)
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      drawCalls: 0,
      culledTexts: 0
    };
  }

  // ────────────────────────────────────────────────
  // Initialisation WebGL
  // ────────────────────────────────────────────────
  _initWebGLTextRenderer() {
    this.textCanvas = document.createElement('canvas');
    this.textCtx = this.textCanvas.getContext('2d', { alpha: true, willReadFrequently: false });

    this.glCanvas = document.createElement('canvas');
    this.gl = this.glCanvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false // ✅ Performance
    });

    if (!this.gl) {
      throw new Error('WebGL non disponible');
    }

    this._setupWebGL();
    this._textCleanupInterval = setInterval(() => this._cleanOldCache(), 60000);
  }

  _setupWebGL() {
    const gl = this.gl;

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
  // ✅ OPTIMISATION 1 : TEXT ATLAS (cache par caractère)
  // ────────────────────────────────────────────────
  _rasterizeChar(char, font, color) {
    const key = `${char}|||${font}|||${color}`;
    
    if (this.charAtlas.has(key)) {
      this.stats.cacheHits++;
      return this.charAtlas.get(key);
    }

    this.stats.cacheMisses++;

    const fontSize = parseFloat(font) || 16;
    this.atlasCtx.font = font;
    const metrics = this.atlasCtx.measureText(char);
    
    const width = Math.ceil(metrics.width) + 4;
    const height = Math.ceil(fontSize * 1.5) + 4;

    // ✅ Gestion du débordement de l'atlas
    if (this.atlasX + width > this.atlasCanvas.width) {
      this.atlasX = 0;
      this.atlasY += this.atlasRowHeight + 2;
      this.atlasRowHeight = 0;
    }

    if (this.atlasY + height > this.atlasCanvas.height) {
      // Atlas plein → réinitialiser (ou créer un nouvel atlas)
      console.warn('Atlas plein, réinitialisation...');
      this.atlasCtx.clearRect(0, 0, this.atlasCanvas.width, this.atlasCanvas.height);
      this.charAtlas.clear();
      this.atlasX = 0;
      this.atlasY = 0;
      this.atlasRowHeight = 0;
    }

    // Dessiner le caractère dans l'atlas
    this.atlasCtx.font = font;
    this.atlasCtx.fillStyle = color;
    this.atlasCtx.textBaseline = 'alphabetic';
    this.atlasCtx.fillText(char, this.atlasX + 2, this.atlasY + fontSize);

    const charData = {
      x: this.atlasX,
      y: this.atlasY,
      width,
      height,
      textWidth: metrics.width,
      atlas: this.atlasCanvas
    };

    this.charAtlas.set(key, charData);

    this.atlasX += width + 2;
    this.atlasRowHeight = Math.max(this.atlasRowHeight, height);

    return charData;
  }

  // ────────────────────────────────────────────────
  // ✅ OPTIMISATION 2 : CULLING (ne pas dessiner hors écran)
  // ────────────────────────────────────────────────
  _isInViewport(x, y, width, height) {
    if (!this.enableCulling) return true;

    return !(
      x + width < 0 ||
      x > this.canvas.width ||
      y + height < 0 ||
      y > this.canvas.height
    );
  }

  // ────────────────────────────────────────────────
  // ✅ OPTIMISATION 3 : BATCH RENDERING
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

    // Dessiner tous les textes du batch
    for (let item of this.textBatch) {
      this._currentFont = item.font;
      this._currentFillStyle = item.color;
      this._currentTextAlign = item.align;
      this._currentTextBaseline = item.baseline;
      
      this._drawTextImmediate(item.text, item.x, item.y);
    }

    this.textBatch = [];
    this.batchMode = false;
  }

  // ────────────────────────────────────────────────
  // fillText : MÉTHODE PRINCIPALE OPTIMISÉE
  // ────────────────────────────────────────────────
  fillText(text, x, y) {
    if (!text) return;

    const font = this._currentFont;
    const color = this._currentFillStyle;
    const align = this._currentTextAlign;
    const baseline = this._currentTextBaseline;

    // ✅ Mode batch : ajouter à la liste
    if (this.batchMode) {
      this.textBatch.push({ text, x, y, font, color, align, baseline });
      return;
    }

    this._drawTextImmediate(text, x, y);
  }

  _drawTextImmediate(text, x, y) {
    const font = this._currentFont;
    const color = this._currentFillStyle;
    const align = this._currentTextAlign;
    const baseline = this._currentTextBaseline;

    // ✅ CULLING : Estimation rapide
    const fontSize = parseFloat(font) || 16;
    const estimatedWidth = text.length * fontSize * 0.6;

    if (!this._isInViewport(x - estimatedWidth/2, y - fontSize, estimatedWidth, fontSize * 2)) {
      this.stats.culledTexts++;
      return;
    }

    // ✅ MODE ATLAS : Dessiner caractère par caractère
    if (this.useTextAtlas) {
      this._drawTextWithAtlas(text, x, y, font, color, align, baseline);
    } else {
      // Mode cache complet (ancien système)
      this._drawTextCached(text, x, y, font, color, align, baseline);
    }

    this.stats.drawCalls++;
  }

  // ✅ Dessiner avec Text Atlas
  _drawTextWithAtlas(text, x, y, font, color, align, baseline) {
    let offsetX = 0;

    // Calculer la largeur totale pour l'alignement
    let totalWidth = 0;
    for (let char of text) {
      const charData = this._rasterizeChar(char, font, color);
      totalWidth += charData.textWidth;
    }

    // Ajuster X selon l'alignement
    let startX = x;
    if (align === 'center') {
      startX -= totalWidth / 2;
    } else if (align === 'right') {
      startX -= totalWidth;
    }

    // Ajuster Y selon le baseline
    const fontSize = parseFloat(font) || 16;
    let baselineOffset = 0;
    if (baseline === 'top') {
      baselineOffset = fontSize;
    } else if (baseline === 'middle') {
      baselineOffset = fontSize * 0.65;
    } else {
      baselineOffset = fontSize * 0.85;
    }

    // Dessiner chaque caractère depuis l'atlas
    for (let char of text) {
      const charData = this._rasterizeChar(char, font, color);

      this.ctx.drawImage(
        charData.atlas,
        charData.x, charData.y, charData.width, charData.height,
        startX + offsetX, y - baselineOffset, charData.width, charData.height
      );

      offsetX += charData.textWidth;
    }
  }

  // ✅ Ancien système (fallback)
  _drawTextCached(text, x, y, font, color, align, baseline) {
    const key = `${text}|||${font}|||${color}|||${align}|||${baseline}`;
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
    }

    let finalX = x - 8;
    if (align === 'center') finalX -= cached.textWidth / 2;
    else if (align === 'right') finalX -= cached.textWidth;

    const finalY = y - 8 - cached.baselineOffset;

    this._drawTextureToCanvas(cached.texture, cached.width, cached.height, finalX, finalY);
  }

  // ────────────────────────────────────────────────
  // Méthodes auxiliaires
  // ────────────────────────────────────────────────
  _rasterizeText(text, font, color, align, baseline) {
    const fontSize = parseFloat(font) || 16;
    this.textCtx.font = font;
    const metrics = this.textCtx.measureText(text);
    
    const width = Math.ceil(metrics.width) + 16;
    const height = Math.ceil(fontSize * 1.5) + 16;

    if (this.textCanvas.width < width || this.textCanvas.height < height) {
      this.textCanvas.width = Math.max(width, this.textCanvas.width);
      this.textCanvas.height = Math.max(height, this.textCanvas.height);
    }

    this.textCtx.clearRect(0, 0, width, height);
    this.textCtx.font = font;
    this.textCtx.fillStyle = color;
    this.textCtx.textAlign = 'left';
    this.textCtx.textBaseline = 'alphabetic';

    let offsetY = fontSize * 0.85;
    if (baseline === 'top') offsetY = fontSize;
    else if (baseline === 'middle') offsetY = fontSize * 0.65;

    this.textCtx.fillText(text, 8, 8 + offsetY);

    return { canvas: this.textCanvas, width, height, textWidth: metrics.width, baselineOffset: offsetY };
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
  // Nettoyage
  // ────────────────────────────────────────────────
  _cleanOldCache() {
    if (this.textCache.size <= this.maxTextCacheSize) return;
    
    const gl = this.gl;
    const keys = Array.from(this.textCache.keys());
    const toRemove = keys.slice(0, this.textCache.size - this.maxTextCacheSize);
    
    toRemove.forEach(key => {
      const entry = this.textCache.get(key);
      if (entry?.texture) gl.deleteTexture(entry.texture);
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
      cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
    };
  }

  resetStats() {
    this.stats = { cacheHits: 0, cacheMisses: 0, drawCalls: 0, culledTexts: 0 };
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
  }

  destroy() {
    if (this.gl) {
      const gl = this.gl;
      this.textCache.forEach(entry => { if (entry.texture) gl.deleteTexture(entry.texture); });
      gl.deleteBuffer(this.positionBuffer);
      gl.deleteBuffer(this.texCoordBuffer);
      gl.deleteProgram(this.program);
    }
    
    if (this._textCleanupInterval) clearInterval(this._textCleanupInterval);
    
    this.textCache.clear();
    this.charAtlas.clear();
  }
}

export default WebGLCanvasAdapter;
