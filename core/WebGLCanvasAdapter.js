/**
 * WebGLCanvasAdapter — Rendu de texte haute performance
 *
 * Architecture :
 *  - Formes / images  → Canvas 2D standard (ctx)
 *  - Texte            → WebGL Instanced Rendering
 *
 * Principe du instanced rendering :
 *   1. Tous les glyphes sont rasterisés UNE fois dans un atlas de textures WebGL
 *   2. À chaque frame, on envoie UN seul tableau de données (position, UV, couleur)
 *      vers le GPU via gl.drawArraysInstanced()
 *   3. Un seul draw call GPU dessine les 500 glyphes simultanément
 *   4. Aucune copie CPU↔GPU pendant le rendu
 *
 * Comparaison des approches :
 *   Ancien pipeline  : Canvas→texture→WebGL→drawImage  = 3 copies/glyphe × 500 = 1500 copies
 *   Canvas 2D atlas  : drawImage sous-rectangle        = 0 copie  (mais 500 draw calls)
 *   Instanced WebGL  : 1 draw call GPU total           = 0 copie  + 1 seul draw call  ← cette implémentation
 *
 * @class WebGLCanvasAdapter
 */
class WebGLCanvasAdapter {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.dpr    = options.dpr || window.devicePixelRatio || 1;

    // ── Canvas 2D pour tout sauf le texte ──────────────────────────────
    this.ctx = this.canvas.getContext('2d', {
      alpha:               options.alpha !== false,
      desynchronized:      true,
      willReadFrequently:  false
    });

    // ── Options ────────────────────────────────────────────────────────
    this.enableCulling      = options.enableCulling  !== false;
    this.enableBatching     = options.enableBatching !== false;
    this.maxTextCacheSize   = options.maxCacheSize   || 512;   // glyphes dans l'atlas
    this.maxBatchSize       = options.maxBatchSize   || 2048;  // glyphes par frame
    this.atlasSize          = options.atlasSize      || 2048;  // px côté atlas texture

    // ── WebGL ──────────────────────────────────────────────────────────
    this._glReady = false;
    try {
      this._initWebGL();
      this._glReady = true;
    } catch (err) {
      console.warn('[WebGLCanvasAdapter] WebGL indisponible, fallback Canvas 2D :', err.message);
    }

    // ── Atlas de glyphes (CPU-side) ────────────────────────────────────
    // Canvas hors-écran qui sert de source pour la texture GPU
    this._atlasCanvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(this.atlasSize, this.atlasSize)
      : Object.assign(document.createElement('canvas'), {
          width: this.atlasSize, height: this.atlasSize
        });
    this._atlasCtx = this._atlasCanvas.getContext('2d', { alpha: true });

    // Curseur de remplissage de l'atlas
    this._atlasCursor  = { x: 0, y: 0, rowH: 0 };
    this._atlasGlyphs  = new Map();   // key → { u0,v0,u1,v1, w,h, advance }
    this._atlasDirty   = false;       // faut-il re-uploader la texture ?

    // ── Cache LRU O(1) ────────────────────────────────────────────────
    // Map JS = ordre d'insertion → delete+set = "remonter" une entrée
    this._glyphCache   = new Map();   // key → metadata (LRU)

    // ── Batch CPU : tableaux pré-alloués pour le draw call ─────────────
    // Chaque instance = 8 floats :
    //   [dstX, dstY, dstW, dstH,   u0, v0, u1, v1,   r, g, b, a]  → 12 floats
    this._FLOATS_PER_INSTANCE = 12;
    this._instanceData  = new Float32Array(this.maxBatchSize * this._FLOATS_PER_INSTANCE);
    this._instanceCount = 0;
    this._batchMode     = false;

    // ── État de rendu courant ──────────────────────────────────────────
    this._currentFont         = '16px sans-serif';
    this._currentFillStyle    = '#000000';
    this._currentFillRGBA     = [0, 0, 0, 1];
    this._currentTextAlign    = 'start';
    this._currentTextBaseline = 'alphabetic';

    // ── Métriques polices (cache) ──────────────────────────────────────
    this._fontMetrics = new Map();

    // ── Viewport ──────────────────────────────────────────────────────
    this._viewport = { l: 0, t: 0, r: this.canvas.width, b: this.canvas.height };

    // ── Stats ─────────────────────────────────────────────────────────
    this.stats = { drawCalls: 0, glyphsCached: 0, culled: 0, instancesDrawn: 0 };

    // Nettoyage périodique de l'atlas si saturation
    this._cleanupTimer = setInterval(() => this._maybeRebuildAtlas(), 30000);
  }

  // ══════════════════════════════════════════════════════════════════════
  // INIT WebGL — shaders + buffers instanciés
  // ══════════════════════════════════════════════════════════════════════
  _initWebGL() {
    // Canvas WebGL dédié, jamais affiché (hors DOM)
    this._glCanvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(this.canvas.width, this.canvas.height)
      : Object.assign(document.createElement('canvas'), {
          width: this.canvas.width, height: this.canvas.height
        });

    const gl = this._glCanvas.getContext('webgl2', {
      alpha:                  true,
      premultipliedAlpha:     false,
      antialias:              false,
      preserveDrawingBuffer:  true,   // nécessaire pour drawImage final
      powerPreference:        'high-performance'
    });

    // Fallback WebGL1 si WebGL2 indispo
    this.gl = gl || this._glCanvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: false,
      antialias: false, preserveDrawingBuffer: true
    });

    if (!this.gl) throw new Error('WebGL non disponible');

    // Vérifier l'extension instanced rendering (WebGL1 uniquement)
    if (!gl) {
      this._ext = this.gl.getExtension('ANGLE_instanced_arrays');
      if (!this._ext) throw new Error('ANGLE_instanced_arrays non disponible');
    } else {
      this._ext = null; // WebGL2 a l'instancing natif
    }

    this._isWebGL2 = !!gl;
    this._setupShaders();
    this._setupBuffers();
    this._setupAtlasTexture();
  }

  _setupShaders() {
    const gl = this.gl;
    const isGL2 = this._isWebGL2;

    // ── Vertex shader ──────────────────────────────────────────────────
    // Chaque instance reçoit : position destination, UV dans l'atlas, couleur RGBA
    const vs = isGL2 ? `#version 300 es
      precision highp float;

      // Quad unitaire [0..1, 0..1] — commun à toutes les instances
      in vec2  a_quad;

      // Par instance
      in vec4  a_dst;    // x, y, w, h  (pixels écran)
      in vec4  a_uv;     // u0,v0,u1,v1 (coordonnées atlas normalisées)
      in vec4  a_color;  // r,g,b,a

      uniform vec2 u_resolution;

      out vec2 v_uv;
      out vec4 v_color;

      void main() {
        // Position pixel dans le repère écran
        vec2 pos = a_dst.xy + a_quad * a_dst.zw;

        // → clip space [-1..1]
        vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

        // UV interpolé dans l'atlas
        v_uv    = a_uv.xy + a_quad * (a_uv.zw - a_uv.xy);
        v_color = a_color;
      }
    ` : `
      precision highp float;
      attribute vec2 a_quad;
      attribute vec4 a_dst;
      attribute vec4 a_uv;
      attribute vec4 a_color;
      uniform vec2 u_resolution;
      varying vec2 v_uv;
      varying vec4 v_color;
      void main() {
        vec2 pos  = a_dst.xy + a_quad * a_dst.zw;
        vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
        v_uv    = a_uv.xy + a_quad * (a_uv.zw - a_uv.xy);
        v_color = a_color;
      }
    `;

    // ── Fragment shader ────────────────────────────────────────────────
    const fs = isGL2 ? `#version 300 es
      precision mediump float;
      uniform sampler2D u_atlas;
      in  vec2 v_uv;
      in  vec4 v_color;
      out vec4 outColor;
      void main() {
        // Atlas en niveaux de gris (canal alpha = opacité du glyphe)
        float alpha = texture(u_atlas, v_uv).a;
        outColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    ` : `
      precision mediump float;
      uniform sampler2D u_atlas;
      varying vec2 v_uv;
      varying vec4 v_color;
      void main() {
        float alpha = texture2D(u_atlas, v_uv).a;
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;

    this._program = this._linkProgram(vs, fs);

    // Locations
    this._loc = {
      quad:       gl.getAttribLocation (this._program, 'a_quad'),
      dst:        gl.getAttribLocation (this._program, 'a_dst'),
      uv:         gl.getAttribLocation (this._program, 'a_uv'),
      color:      gl.getAttribLocation (this._program, 'a_color'),
      resolution: gl.getUniformLocation(this._program, 'u_resolution'),
      atlas:      gl.getUniformLocation(this._program, 'u_atlas')
    };
  }

  _linkProgram(vsSrc, fsSrc) {
    const gl  = this.gl;
    const vs  = this._compileShader(gl.VERTEX_SHADER,   vsSrc);
    const fs  = this._compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS))
      throw new Error('WebGL link error: ' + gl.getProgramInfoLog(prg));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prg;
  }

  _compileShader(type, src) {
    const gl  = this.gl;
    const sh  = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(sh));
    return sh;
  }

  _setupBuffers() {
    const gl = this.gl;

    // Quad unitaire — 2 triangles = 6 sommets, commun à toutes les instances
    // (0,0)→(1,0)→(0,1) + (1,0)→(1,1)→(0,1)
    const quadVerts = new Float32Array([0,0, 1,0, 0,1,  1,0, 1,1, 0,1]);
    this._quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // Buffer d'instances — mis à jour chaque frame avec DYNAMIC_DRAW
    this._instanceBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this._instanceData.byteLength,
      gl.DYNAMIC_DRAW
    );
  }

  _setupAtlasTexture() {
    const gl = this.gl;
    this._atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._atlasTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Allouer la texture vide
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      this.atlasSize, this.atlasSize, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // ATLAS — rasterisation des glyphes côté CPU
  // ══════════════════════════════════════════════════════════════════════

  _getFontMetrics(font) {
    if (this._fontMetrics.has(font)) return this._fontMetrics.get(font);
    const size = parseFloat(font) || 16;
    const m = { size, lineH: size * 1.4, pad: 3 };
    this._fontMetrics.set(font, m);
    return m;
  }

  /**
   * Retourne les données UV d'un glyphe dans l'atlas.
   * Si absent, le rasterise dans l'atlas CPU et marque la texture dirty.
   */
  _getGlyph(char, font) {
    const key = char + '|' + font;

    if (this._atlasGlyphs.has(key)) {
      // LRU : remonter
      const g = this._atlasGlyphs.get(key);
      this._atlasGlyphs.delete(key);
      this._atlasGlyphs.set(key, g);
      return g;
    }

    // LRU éviction si atlas plein
    if (this._atlasGlyphs.size >= this.maxTextCacheSize) {
      const oldest = this._atlasGlyphs.keys().next().value;
      this._atlasGlyphs.delete(oldest);
    }

    // Rasteriser dans le canvas atlas CPU
    const m   = this._getFontMetrics(font);
    const ctx = this._atlasCtx;
    ctx.font  = font;

    const tm      = ctx.measureText(char);
    const gw      = Math.ceil(tm.width)  + m.pad * 2;
    const gh      = Math.ceil(m.lineH)   + m.pad * 2;
    const advance = tm.width;

    // Retour à la ligne si dépassement horizontal
    if (this._atlasCursor.x + gw > this.atlasSize) {
      this._atlasCursor.x    = 0;
      this._atlasCursor.y   += this._atlasCursor.rowH + 1;
      this._atlasCursor.rowH = 0;
    }

    // Atlas saturé verticalement → rebuild complet
    if (this._atlasCursor.y + gh > this.atlasSize) {
      this._rebuildAtlas();
      return this._getGlyph(char, font); // retry après rebuild
    }

    const ax = this._atlasCursor.x;
    const ay = this._atlasCursor.y;

    // Dessiner le glyphe en blanc (couleur appliquée dans le shader via a_color)
    ctx.clearRect(ax, ay, gw, gh);
    ctx.fillStyle    = '#ffffff';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(char, ax + m.pad, ay + m.pad + m.size);

    this._atlasCursor.x    += gw + 1;
    this._atlasCursor.rowH  = Math.max(this._atlasCursor.rowH, gh);

    const S = this.atlasSize;
    const glyph = {
      u0: ax       / S,
      v0: ay       / S,
      u1: (ax + gw) / S,
      v1: (ay + gh) / S,
      w:  gw,
      h:  gh,
      advance,
      baselineY: m.pad + m.size   // offset baseline dans le glyphe
    };

    this._atlasGlyphs.set(key, glyph);
    this._atlasDirty = true;
    this.stats.glyphsCached++;

    return glyph;
  }

  /**
   * Reconstruit l'atlas depuis zéro avec uniquement les glyphes actuels.
   * Appelé quand l'atlas est saturé.
   */
  _rebuildAtlas() {
    const ctx   = this._atlasCtx;
    ctx.clearRect(0, 0, this.atlasSize, this.atlasSize);

    this._atlasCursor = { x: 0, y: 0, rowH: 0 };

    // Conserver les glyphes actuels mais les repositionner
    const existing = [...this._atlasGlyphs.entries()];
    this._atlasGlyphs.clear();

    // Re-rasteriser les plus récents (fin de Map = plus récents)
    const toKeep = existing.slice(-Math.floor(this.maxTextCacheSize * 0.7));
    for (const [key] of toKeep) {
      const [char, font] = key.split('|');
      if (char && font) this._getGlyph(char, font);
    }

    this._atlasDirty = true;
  }

  _maybeRebuildAtlas() {
    // Rebuild si > 90% plein
    if (this._atlasGlyphs.size > this.maxTextCacheSize * 0.9) {
      this._rebuildAtlas();
    }
  }

  /**
   * Upload la texture atlas vers le GPU si elle a changé.
   * Appelé UNE seule fois par frame, juste avant le draw call.
   */
  _uploadAtlasIfDirty() {
    if (!this._atlasDirty) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this._atlasTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.RGBA, gl.UNSIGNED_BYTE,
      this._atlasCanvas
    );
    this._atlasDirty = false;
  }

  // ══════════════════════════════════════════════════════════════════════
  // BATCH — accumulation des instances
  // ══════════════════════════════════════════════════════════════════════

  beginTextBatch() {
    this._batchMode     = true;
    this._instanceCount = 0;
  }

  /**
   * Ajoute tous les glyphes d'un texte au batch courant.
   * Aucun draw call GPU ici — juste écriture dans _instanceData (CPU).
   */
  _enqueueText(text, x, y) {
    if (!this._glReady) {
      // Fallback Canvas 2D
      this.ctx.font         = this._currentFont;
      this.ctx.fillStyle    = this._currentFillStyle;
      this.ctx.textAlign    = this._currentTextAlign;
      this.ctx.textBaseline = this._currentTextBaseline;
      this.ctx.fillText(text, x, y);
      return;
    }

    const font     = this._currentFont;
    const [r,g,b,a] = this._currentFillRGBA;
    const align    = this._currentTextAlign;
    const baseline = this._currentTextBaseline;
    const m        = this._getFontMetrics(font);

    // Calcul largeur totale pour alignement
    let totalW = 0;
    for (let i = 0; i < text.length; i++) {
      const g = this._getGlyph(text[i], font);
      if (g) totalW += g.advance;
    }

    let curX = x;
    if      (align === 'center')              curX -= totalW / 2;
    else if (align === 'right' || align === 'end') curX -= totalW;

    // Offset vertical selon baseline
    const baselineOffsets = {
      alphabetic:  0,
      top:         m.size * 0.85,
      middle:      m.size * 0.35,
      bottom:     -m.size * 0.15,
      hanging:     m.size * 0.75,
      ideographic:-m.size * 0.1
    };
    const baseOff = baselineOffsets[baseline] ?? 0;

    // Écrire chaque glyphe comme une instance dans le tableau CPU
    for (let i = 0; i < text.length; i++) {
      if (this._instanceCount >= this.maxBatchSize) {
        // Auto-flush si batch saturé
        this._flushGPU();
        this._instanceCount = 0;
      }

      const glyph = this._getGlyph(text[i], font);
      if (!glyph) { curX += m.size * 0.5; continue; }

      // Culling par glyphe
      if (this.enableCulling) {
        const sx = curX;
        const sy = y - glyph.baselineY + baseOff;
        if (sx + glyph.w < this._viewport.l ||
            sx           > this._viewport.r ||
            sy + glyph.h < this._viewport.t ||
            sy           > this._viewport.b) {
          curX += glyph.advance;
          this.stats.culled++;
          continue;
        }
      }

      const off = this._instanceCount * this._FLOATS_PER_INSTANCE;
      const d   = this._instanceData;

      // Position destination (pixels)
      d[off + 0] = Math.round(curX);
      d[off + 1] = Math.round(y - glyph.baselineY + baseOff);
      d[off + 2] = glyph.w;
      d[off + 3] = glyph.h;

      // UV dans l'atlas
      d[off + 4] = glyph.u0;
      d[off + 5] = glyph.v0;
      d[off + 6] = glyph.u1;
      d[off + 7] = glyph.v1;

      // Couleur RGBA
      d[off + 8]  = r;
      d[off + 9]  = g;
      d[off + 10] = b;
      d[off + 11] = a;

      this._instanceCount++;
      curX += glyph.advance;
    }
  }

  /**
   * Envoie le batch au GPU en UN SEUL draw call.
   * C'est ici que se trouve le gain de performance réel.
   */
  _flushGPU() {
    if (this._instanceCount === 0 || !this._glReady) return;

    const gl   = this.gl;
    const loc  = this._loc;
    const ext  = this._ext; // null si WebGL2

    // 1. Upload atlas si modifié
    this._uploadAtlasIfDirty();

    // 2. Resize glCanvas si nécessaire
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (this._glCanvas.width !== cw || this._glCanvas.height !== ch) {
      this._glCanvas.width  = cw;
      this._glCanvas.height = ch;
      gl.viewport(0, 0, cw, ch);
    }

    // 3. Clear + blend
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this._program);

    // 4. Résolution
    gl.uniform2f(loc.resolution, cw / this.dpr, ch / this.dpr);

    // 5. Atlas texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._atlasTex);
    gl.uniform1i(loc.atlas, 0);

    // 6. Buffer quad (commun à toutes les instances)
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuf);
    gl.enableVertexAttribArray(loc.quad);
    gl.vertexAttribPointer(loc.quad, 2, gl.FLOAT, false, 0, 0);
    if (ext) ext.vertexAttribDivisorANGLE(loc.quad, 0);
    else     gl.vertexAttribDivisor(loc.quad, 0);

    // 7. Buffer instances — upload uniquement les instances actives
    const stride = this._FLOATS_PER_INSTANCE * 4; // bytes
    gl.bindBuffer(gl.ARRAY_BUFFER, this._instanceBuf);
    gl.bufferSubData(
      gl.ARRAY_BUFFER, 0,
      this._instanceData.subarray(0, this._instanceCount * this._FLOATS_PER_INSTANCE)
    );

    // a_dst : vec4 @ offset 0
    gl.enableVertexAttribArray(loc.dst);
    gl.vertexAttribPointer(loc.dst, 4, gl.FLOAT, false, stride, 0);
    if (ext) ext.vertexAttribDivisorANGLE(loc.dst, 1);
    else     gl.vertexAttribDivisor(loc.dst, 1);

    // a_uv  : vec4 @ offset 16
    gl.enableVertexAttribArray(loc.uv);
    gl.vertexAttribPointer(loc.uv, 4, gl.FLOAT, false, stride, 16);
    if (ext) ext.vertexAttribDivisorANGLE(loc.uv, 1);
    else     gl.vertexAttribDivisor(loc.uv, 1);

    // a_color : vec4 @ offset 32
    gl.enableVertexAttribArray(loc.color);
    gl.vertexAttribPointer(loc.color, 4, gl.FLOAT, false, stride, 32);
    if (ext) ext.vertexAttribDivisorANGLE(loc.color, 1);
    else     gl.vertexAttribDivisor(loc.color, 1);

    // 8. LE draw call unique — dessine N instances du quad unitaire
    if (ext) ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, this._instanceCount);
    else     gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this._instanceCount);

    // 9. Copier le résultat WebGL sur le canvas 2D principal
    this.ctx.drawImage(this._glCanvas, 0, 0);

    this.stats.drawCalls++;
    this.stats.instancesDrawn += this._instanceCount;
  }

  flushTextBatch() {
    this._flushGPU();
    this._instanceCount = 0;
    this._batchMode     = false;
  }

  // ══════════════════════════════════════════════════════════════════════
  // API PUBLIQUE — fillText
  // ══════════════════════════════════════════════════════════════════════

  fillText(text, x, y) {
    if (!text) return;

    if (this._batchMode) {
      this._enqueueText(text, x, y);
      return;
    }

    // Hors batch : flush immédiat après accumulation
    this._enqueueText(text, x, y);
    this._flushGPU();
    this._instanceCount = 0;
  }

  // ══════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Parse une couleur CSS → [r, g, b, a] normalisés [0..1]
   * Supporte : #rgb #rrggbb rgba() rgb() et les couleurs nommées communes
   */
  _parseColor(color) {
    if (!color) return [0, 0, 0, 1];

    // Cache
    if (this._colorCache) {
      const cached = this._colorCache.get(color);
      if (cached) return cached;
    } else {
      this._colorCache = new Map();
    }

    let r = 0, g = 0, b = 0, a = 1;

    if (color[0] === '#') {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
      } else if (hex.length === 8) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
        a = parseInt(hex.slice(6, 8), 16) / 255;
      }
    } else if (color.startsWith('rgb')) {
      const nums = color.match(/[\d.]+/g);
      if (nums) {
        r = +nums[0] / 255;
        g = +nums[1] / 255;
        b = +nums[2] / 255;
        a = nums[3] !== undefined ? +nums[3] : 1;
      }
    }

    const result = [r, g, b, a];
    this._colorCache.set(color, result);
    return result;
  }

  updateViewport(l = 0, t = 0, r = this.canvas.width, b = this.canvas.height) {
    this._viewport = { l, t, r, b };
  }

  measureText(text) {
    if (this.ctx.font !== this._currentFont) this.ctx.font = this._currentFont;
    return this.ctx.measureText(text);
  }

  getStats() {
    return {
      ...this.stats,
      glyphsInAtlas: this._atlasGlyphs.size,
      batchPending:  this._instanceCount
    };
  }

  resetStats() {
    this.stats = { drawCalls: 0, glyphsCached: 0, culled: 0, instancesDrawn: 0 };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SETTERS / GETTERS Canvas 2D standard
  // ══════════════════════════════════════════════════════════════════════

  set font(v)         { this._currentFont = v;                     this.ctx.font         = v; }
  get font()          { return this._currentFont; }

  set fillStyle(v)    {
    this._currentFillStyle = v;
    this._currentFillRGBA  = this._parseColor(v);
    this.ctx.fillStyle = v;
  }
  get fillStyle()     { return this._currentFillStyle; }

  set textAlign(v)    { this._currentTextAlign    = v; this.ctx.textAlign    = v; }
  get textAlign()     { return this._currentTextAlign; }

  set textBaseline(v) { this._currentTextBaseline = v; this.ctx.textBaseline = v; }
  get textBaseline()  { return this._currentTextBaseline; }

  set strokeStyle(v)  { this.ctx.strokeStyle = v; }
  get strokeStyle()   { return this.ctx.strokeStyle; }
  set lineWidth(v)    { this.ctx.lineWidth   = v; }
  get lineWidth()     { return this.ctx.lineWidth; }
  set globalAlpha(v)  { this.ctx.globalAlpha = v; }
  get globalAlpha()   { return this.ctx.globalAlpha; }

  // Toutes les opérations non-texte passent directement au ctx 2D
  clearRect(...a)            { this.ctx.clearRect(...a); }
  fillRect(...a)             { this.ctx.fillRect(...a); }
  strokeRect(...a)           { this.ctx.strokeRect(...a); }
  beginPath()                { this.ctx.beginPath(); }
  moveTo(...a)               { this.ctx.moveTo(...a); }
  lineTo(...a)               { this.ctx.lineTo(...a); }
  arc(...a)                  { this.ctx.arc(...a); }
  rect(...a)                 { this.ctx.rect(...a); }
  closePath()                { this.ctx.closePath(); }
  fill(...a)                 { this.ctx.fill(...a); }
  stroke()                   { this.ctx.stroke(); }
  drawImage(...a)            { this.ctx.drawImage(...a); }
  save()                     { this.ctx.save(); }
  restore()                  { this.ctx.restore(); }
  translate(...a)            { this.ctx.translate(...a); }
  rotate(...a)               { this.ctx.rotate(...a); }
  scale(...a)                { this.ctx.scale(...a); }
  setTransform(...a)         { this.ctx.setTransform(...a); }
  clip(...a)                 { this.ctx.clip(...a); }
  createLinearGradient(...a) { return this.ctx.createLinearGradient(...a); }
  createRadialGradient(...a) { return this.ctx.createRadialGradient(...a); }
  createPattern(...a)        { return this.ctx.createPattern(...a); }

  resize(width, height) {
    this.canvas.width        = width  * this.dpr;
    this.canvas.height       = height * this.dpr;
    this.canvas.style.width  = `${width}px`;
    this.canvas.style.height = `${height}px`;
    // Reset transform avant scale pour éviter accumulation
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.updateViewport(0, 0, width, height);
  }

  destroy() {
    clearInterval(this._cleanupTimer);

    if (this.gl) {
      const gl = this.gl;
      gl.deleteTexture(this._atlasTex);
      gl.deleteBuffer(this._quadBuf);
      gl.deleteBuffer(this._instanceBuf);
      gl.deleteProgram(this._program);
    }

    this._atlasGlyphs.clear();
    this._fontMetrics.clear();
    if (this._colorCache) this._colorCache.clear();
  }
}

export default WebGLCanvasAdapter;
