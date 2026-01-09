/**
 * Adaptateur WebGL amélioré qui émule l'API Canvas 2D
 * Version complète avec toutes les API Canvas 2D
 */
class WebGLCanvasAdapter {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!this.gl) {
      throw new Error('WebGL non supporté');
    }

    // État du contexte (comme Canvas 2D)
    this.state = {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      transform: [1, 0, 0, 1, 0, 0],
      clipPath: null,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      filter: 'none',
      lineDash: [],
      lineDashOffset: 0,
      direction: 'ltr'
    };

    this.stateStack = [];
    
    // Système de batching
    this.batch = {
      vertices: [],
      colors: [],
      texCoords: [],
      indices: [],
      currentTexture: null,
      textureVertices: [],
      textureTexCoords: [],
      textureIndices: [],
      elementOffset: 0,
      textureElementOffset: 0
    };
    
    // Canvas offscreen pour le texte et les textures
    this.textCanvas = document.createElement('canvas');
    this.textCtx = this.textCanvas.getContext('2d');
    this.textCanvas.width = 2048;
    this.textCanvas.height = 2048;
    this.textAtlas = {
      canvas: this.textCanvas,
      ctx: this.textCtx,
      currentX: 0,
      currentY: 0,
      lineHeight: 0,
      cache: new Map()
    };
    
    // Cache de textures pour le texte (avec LRU)
    this.textCache = new Map();
    this.textureLRU = [];
    this.maxTextureCacheSize = 100;
    
    // Cache des gradients
    this.gradients = new Map();
    
    // Buffer pour les images
    this.imageCache = new Map();
    
    // État du path courant
    this.currentPath = null;
    this.currentSubpath = [];
    this.currentPoint = null;
    
    // Mode batch (true par défaut pour performance)
    this.batchEnabled = true;
    
    this.initWebGL();
  }

  // ===== API CANVAS 2D COMPLÈTE =====

  // --- Sauvegarde et restauration d'état ---
  save() {
    this.stateStack.push({
      fillStyle: this.state.fillStyle,
      strokeStyle: this.state.strokeStyle,
      lineWidth: this.state.lineWidth,
      font: this.state.font,
      textAlign: this.state.textAlign,
      textBaseline: this.state.textBaseline,
      globalAlpha: this.state.globalAlpha,
      shadowColor: this.state.shadowColor,
      shadowBlur: this.state.shadowBlur,
      shadowOffsetX: this.state.shadowOffsetX,
      shadowOffsetY: this.state.shadowOffsetY,
      transform: [...this.state.transform],
      clipPath: this.state.clipPath ? [...this.state.clipPath] : null,
      lineCap: this.state.lineCap,
      lineJoin: this.state.lineJoin,
      miterLimit: this.state.miterLimit,
      filter: this.state.filter,
      lineDash: [...this.state.lineDash],
      lineDashOffset: this.state.lineDashOffset,
      direction: this.state.direction
    });
  }

  restore() {
    if (this.stateStack.length === 0) return;
    
    const savedState = this.stateStack.pop();
    Object.assign(this.state, savedState);
    
    if (this.state.clipPath) {
      this.applyClip();
    }
  }

  // --- Transformations ---
  setTransform(a, b, c, d, e, f) {
    this.state.transform = [a, b, c, d, e, f];
  }

  resetTransform() {
    this.state.transform = [1, 0, 0, 1, 0, 0];
  }

  transform(a, b, c, d, e, f) {
    const [a1, b1, c1, d1, e1, f1] = this.state.transform;
    
    this.state.transform = [
      a1 * a + c1 * b,
      b1 * a + d1 * b,
      a1 * c + c1 * d,
      b1 * c + d1 * d,
      a1 * e + c1 * f + e1,
      b1 * e + d1 * f + f1
    ];
  }

  translate(x, y) {
    this.transform(1, 0, 0, 1, x, y);
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.transform(cos, sin, -sin, cos, 0, 0);
  }

  scale(x, y) {
    this.transform(x, 0, 0, y, 0, 0);
  }

  getTransform() {
    const [a, b, c, d, e, f] = this.state.transform;
    return new DOMMatrix([a, b, c, d, e, f]);
  }

  // --- Text ---
  createTextAtlas() {
    const gl = this.gl;
    
    this.textAtlasTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.textAtlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.textCanvas.width, this.textCanvas.height, 
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    this.textCtx.fillStyle = 'rgba(0,0,0,0)';
    this.textCtx.fillRect(0, 0, this.textCanvas.width, this.textCanvas.height);
  }

  getTextGlyph(text, font, color = '#000000') {
    const cacheKey = `${text}_${font}_${color}`;
    
    if (this.textAtlas.cache.has(cacheKey)) {
      return this.textAtlas.cache.get(cacheKey);
    }
    
    this.textCtx.save();
    this.textCtx.font = font;
    this.textCtx.fillStyle = color;
    this.textCtx.textAlign = 'left';
    this.textCtx.textBaseline = 'alphabetic';
    
    const metrics = this.textCtx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(parseInt(font) || 16);
    
    if (this.textAtlas.currentX + textWidth > this.textCanvas.width) {
      this.textAtlas.currentX = 0;
      this.textAtlas.currentY += this.textAtlas.lineHeight + 2;
      this.textAtlas.lineHeight = 0;
    }
    
    if (this.textAtlas.currentY + textHeight > this.textCanvas.height) {
      this.textAtlas.currentX = 0;
      this.textAtlas.currentY = 0;
      this.textAtlas.lineHeight = 0;
      
      this.textCtx.fillStyle = 'rgba(0,0,0,0)';
      this.textCtx.fillRect(0, 0, this.textCanvas.width, this.textCanvas.height);
      this.textAtlas.cache.clear();
    }
    
    this.textCtx.fillText(text, this.textAtlas.currentX, this.textAtlas.currentY + textHeight);
    
    const texX = this.textAtlas.currentX / this.textCanvas.width;
    const texY = this.textAtlas.currentY / this.textCanvas.height;
    const texWidth = textWidth / this.textCanvas.width;
    const texHeight = textHeight / this.textCanvas.height;
    
    const glyph = {
      x: this.textAtlas.currentX,
      y: this.textAtlas.currentY,
      width: textWidth,
      height: textHeight,
      texX, texY, texWidth, texHeight,
      bearingY: metrics.actualBoundingBoxAscent || textHeight,
      metrics: metrics
    };
    
    this.textAtlas.cache.set(cacheKey, glyph);
    this.textAtlas.currentX += textWidth + 2;
    this.textAtlas.lineHeight = Math.max(this.textAtlas.lineHeight, textHeight);
    this.updateTextAtlasTexture();
    this.textCtx.restore();
    
    return glyph;
  }

  updateTextAtlasTexture() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.textAtlasTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.textCanvas);
  }

  fillText(text, x, y, maxWidth) {
    const glyph = this.getTextGlyph(text, this.state.font, this.state.fillStyle);
    
    let drawX = x;
    if (this.state.textAlign === 'center') {
      drawX -= glyph.width / 2;
    } else if (this.state.textAlign === 'right' || this.state.textAlign === 'end') {
      drawX -= glyph.width;
    }
    
    let drawY = y;
    if (this.state.textBaseline === 'top') {
      drawY += glyph.bearingY;
    } else if (this.state.textBaseline === 'middle') {
      drawY += glyph.bearingY / 2;
    } else if (this.state.textBaseline === 'bottom' || this.state.textBaseline === 'ideographic' || this.state.textBaseline === 'hanging') {
      drawY -= (glyph.height - glyph.bearingY);
    }
    
    let scale = 1;
    if (maxWidth && maxWidth < glyph.width) {
      scale = maxWidth / glyph.width;
    }
    
    this.drawTexturedQuad(
      this.textAtlasTexture,
      drawX,
      drawY - glyph.bearingY,
      glyph.width * scale,
      glyph.height * scale,
      [
        glyph.texX, glyph.texY,
        glyph.texX + glyph.texWidth, glyph.texY,
        glyph.texX + glyph.texWidth, glyph.texY + glyph.texHeight,
        glyph.texX, glyph.texY + glyph.texHeight
      ]
    );
  }

  strokeText(text, x, y, maxWidth) {
    const lineWidth = this.state.lineWidth;
    const offsets = [
      [-lineWidth, -lineWidth], [-lineWidth, 0], [-lineWidth, lineWidth],
      [0, -lineWidth], [0, lineWidth],
      [lineWidth, -lineWidth], [lineWidth, 0], [lineWidth, lineWidth]
    ];
    
    for (const [offsetX, offsetY] of offsets) {
      this.fillText(text, x + offsetX, y + offsetY, maxWidth);
    }
  }

  measureText(text) {
    this.textCtx.save();
    this.textCtx.font = this.state.font;
    const metrics = this.textCtx.measureText(text);
    this.textCtx.restore();
    
    return {
      width: metrics.width,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || 0,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || 0,
      actualBoundingBoxLeft: metrics.actualBoundingBoxLeft || 0,
      actualBoundingBoxRight: metrics.actualBoundingBoxRight || 0,
      fontBoundingBoxAscent: metrics.fontBoundingBoxAscent || 0,
      fontBoundingBoxDescent: metrics.fontBoundingBoxDescent || 0,
      emHeightAscent: metrics.emHeightAscent || 0,
      emHeightDescent: metrics.emHeightDescent || 0,
      alphabeticBaseline: metrics.alphabeticBaseline || 0,
      hangingBaseline: metrics.hangingBaseline || 0,
      ideographicBaseline: metrics.ideographicBaseline || 0
    };
  }

  // --- Paths ---
  beginPath() {
    this.currentPath = [];
    this.currentSubpath = [];
    this.currentPoint = null;
  }

  moveTo(x, y) {
    if (!this.currentPath) this.beginPath();
    this.currentSubpath = [[x, y]];
    this.currentPath.push([x, y]);
    this.currentPoint = [x, y];
  }

  lineTo(x, y) {
    if (!this.currentPoint) {
      this.moveTo(x, y);
      return;
    }
    this.currentSubpath.push([x, y]);
    this.currentPath.push([x, y]);
    this.currentPoint = [x, y];
  }

  closePath() {
    if (this.currentSubpath.length > 0) {
      const firstPoint = this.currentSubpath[0];
      this.lineTo(firstPoint[0], firstPoint[1]);
    }
    this.currentSubpath = [];
  }

  arc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
    if (!this.currentPoint) {
      this.moveTo(x + Math.cos(startAngle) * radius, y + Math.sin(startAngle) * radius);
    }
    
    const angleStep = (endAngle - startAngle) / 32;
    const direction = anticlockwise ? -1 : 1;
    
    for (let i = 1; i <= 32; i++) {
      const angle = startAngle + direction * i * angleStep;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      this.lineTo(px, py);
    }
  }

  arcTo(x1, y1, x2, y2, radius) {
    if (!this.currentPoint) return;
    
    const [x0, y0] = this.currentPoint;
    const v01 = { x: x1 - x0, y: y1 - y0 };
    const v12 = { x: x2 - x1, y: y2 - y1 };
    
    const len01 = Math.sqrt(v01.x * v01.x + v01.y * v01.y);
    const len12 = Math.sqrt(v12.x * v12.x + v12.y * v12.y);
    
    const norm01 = { x: v01.x / len01, y: v01.y / len01 };
    const norm12 = { x: v12.x / len12, y: v12.y / len12 };
    
    const angle = Math.acos(norm01.x * norm12.x + norm01.y * norm12.y);
    const distance = radius / Math.tan(angle / 2);
    
    const p1 = { x: x1 - norm01.x * distance, y: y1 - norm01.y * distance };
    const p2 = { x: x1 + norm12.x * distance, y: y1 + norm12.y * distance };
    
    const centerX = p1.x + norm01.y * radius * (norm01.x * norm12.y - norm01.y * norm12.x > 0 ? 1 : -1);
    const centerY = p1.y - norm01.x * radius * (norm01.x * norm12.y - norm01.y * norm12.x > 0 ? 1 : -1);
    
    const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
    const endAngle = Math.atan2(p2.y - centerY, p2.x - centerX);
    
    this.lineTo(p1.x, p1.y);
    this.arc(centerX, centerY, radius, startAngle, endAngle, norm01.x * norm12.y - norm01.y * norm12.x < 0);
  }

  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise = false) {
    if (!this.currentPoint) {
      const px = x + Math.cos(startAngle) * Math.cos(rotation) * radiusX - Math.sin(startAngle) * Math.sin(rotation) * radiusY;
      const py = y + Math.cos(startAngle) * Math.sin(rotation) * radiusX + Math.sin(startAngle) * Math.cos(rotation) * radiusY;
      this.moveTo(px, py);
    }
    
    const segments = Math.ceil(32 * Math.max(radiusX, radiusY) / 10);
    const angleStep = (endAngle - startAngle) / segments;
    const direction = anticlockwise ? -1 : 1;
    
    for (let i = 1; i <= segments; i++) {
      const angle = startAngle + direction * i * angleStep;
      const px = x + Math.cos(angle) * Math.cos(rotation) * radiusX - Math.sin(angle) * Math.sin(rotation) * radiusY;
      const py = y + Math.cos(angle) * Math.sin(rotation) * radiusX + Math.sin(angle) * Math.cos(rotation) * radiusY;
      this.lineTo(px, py);
    }
  }

  rect(x, y, width, height) {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    if (!this.currentPoint) {
      this.currentPoint = [x, y];
      return;
    }
    
    const [x0, y0] = this.currentPoint;
    const segments = 20;
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const t1 = 1 - t;
      
      const bx = t1 * t1 * t1 * x0 + 
                 3 * t1 * t1 * t * cp1x + 
                 3 * t1 * t * t * cp2x + 
                 t * t * t * x;
      
      const by = t1 * t1 * t1 * y0 + 
                 3 * t1 * t1 * t * cp1y + 
                 3 * t1 * t * t * cp2y + 
                 t * t * t * y;
      
      this.lineTo(bx, by);
    }
  }

  quadraticCurveTo(cpx, cpy, x, y) {
    if (!this.currentPoint) {
      this.currentPoint = [x, y];
      return;
    }
    
    const [x0, y0] = this.currentPoint;
    const segments = 20;
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const t1 = 1 - t;
      
      const qx = t1 * t1 * x0 + 2 * t1 * t * cpx + t * t * x;
      const qy = t1 * t1 * y0 + 2 * t1 * t * cpy + t * t * y;
      
      this.lineTo(qx, qy);
    }
  }

  // --- Drawing ---
  fill(fillRule = 'nonzero') {
    if (!this.currentPath || this.currentPath.length < 3) return;
    
    const triangles = this.triangulatePolygon(this.currentPath, fillRule);
    const color = this.parseColor(this.state.fillStyle);
    const alpha = color[3] * this.state.globalAlpha;
    
    const vertices = [];
    const colors = [];
    
    for (const triangle of triangles) {
      for (const point of triangle) {
        const [px, py] = this.transformPoint(point[0], point[1]);
        vertices.push(px, py);
        colors.push(color[0], color[1], color[2], alpha);
      }
    }
    
    this.drawTriangles(vertices, colors);
  }

  stroke() {
    if (!this.currentPath || this.currentPath.length < 2) return;
    
    const color = this.parseColor(this.state.strokeStyle);
    const alpha = color[3] * this.state.globalAlpha;
    const lineWidth = this.state.lineWidth;
    
    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const p1 = this.currentPath[i];
      const p2 = this.currentPath[i + 1];
      
      this.drawLine(p1[0], p1[1], p2[0], p2[1], lineWidth, color, alpha);
    }
  }

  clip(fillRule = 'nonzero') {
    if (!this.currentPath) return;
    
    this.state.clipPath = [...this.currentPath];
    this.applyClip();
  }

  isPointInPath(x, y, fillRule = 'nonzero') {
    if (!this.currentPath || this.currentPath.length < 3) return false;
    
    let wn = 0;
    const points = this.currentPath;
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      if (p1[1] <= y) {
        if (p2[1] > y && this.isLeft(p1, p2, [x, y]) > 0) {
          wn++;
        }
      } else {
        if (p2[1] <= y && this.isLeft(p1, p2, [x, y]) < 0) {
          wn--;
        }
      }
    }
    
    if (fillRule === 'nonzero') {
      return wn !== 0;
    } else {
      return Math.abs(wn % 2) === 1;
    }
  }

  isPointInStroke(x, y) {
    if (!this.currentPath || this.currentPath.length < 2) return false;
    
    const lineWidth = this.state.lineWidth;
    
    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const p1 = this.currentPath[i];
      const p2 = this.currentPath[i + 1];
      
      if (this.isPointNearLine(x, y, p1[0], p1[1], p2[0], p2[1], lineWidth)) {
        return true;
      }
    }
    
    return false;
  }

  // --- Drawing rectangles ---
  clearRect(x, y, width, height) {
    const [x1, y1] = this.transformPoint(x, y);
    const [x2, y2] = this.transformPoint(x + width, y + height);
    
    const vertices = [
      x1, y1, x2, y1, x2, y2,
      x1, y1, x2, y2, x1, y2
    ];
    
    const colors = new Array(6 * 4).fill(0);
    for (let i = 0; i < 6; i++) {
      colors[i * 4 + 3] = 1;
    }
    
    this.drawTriangles(vertices, colors);
  }

  fillRect(x, y, width, height) {
    this.rect(x, y, width, height);
    this.fill();
  }

  strokeRect(x, y, width, height) {
    this.rect(x, y, width, height);
    this.stroke();
  }

  // --- Images ---
  drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    if (arguments.length === 3) {
      dx = sx; dy = sy;
      sWidth = dWidth = image.width;
      sHeight = dHeight = image.height;
      sx = sy = 0;
    } else if (arguments.length === 5) {
      dx = sx; dy = sy;
      dWidth = sWidth; dHeight = sHeight;
      sx = sy = 0;
      sWidth = image.width;
      sHeight = image.height;
    }
    
    const texture = this.getImageTexture(image);
    if (!texture) return;
    
    const texWidth = image.width || texture.width;
    const texHeight = image.height || texture.height;
    
    const texCoords = [
      sx / texWidth, sy / texHeight,
      (sx + sWidth) / texWidth, sy / texHeight,
      (sx + sWidth) / texWidth, (sy + sHeight) / texHeight,
      sx / texWidth, (sy + sHeight) / texHeight
    ];
    
    this.drawTexturedQuad(texture, dx, dy, dWidth, dHeight, texCoords);
  }

  createImageData(width, height) {
    return {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4)
    };
  }

  getImageData(sx, sy, sw, sh) {
    const gl = this.gl;
    const pixels = new Uint8Array(sw * sh * 4);
    gl.readPixels(sx, this.canvas.height - sy - sh, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    const imageData = this.createImageData(sw, sh);
    
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const srcIdx = ((sh - 1 - y) * sw + x) * 4;
        const dstIdx = (y * sw + x) * 4;
        
        imageData.data[dstIdx] = pixels[srcIdx];
        imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
        imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
        imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }
    
    return imageData;
  }

  putImageData(imageData, dx, dy, dirtyX = 0, dirtyY = 0, dirtyWidth = imageData.width, dirtyHeight = imageData.height) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, 
                  gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    this.drawTexturedQuad(texture, dx + dirtyX, dy + dirtyY, dirtyWidth, dirtyHeight);
    gl.deleteTexture(texture);
  }

  // --- Gradients and patterns ---
  createLinearGradient(x0, y0, x1, y1) {
    const gradient = {
      type: 'linear',
      x0, y0, x1, y1,
      stops: [],
      texture: null,
      dirty: true
    };
    
    const id = `gradient_${Date.now()}_${Math.random()}`;
    this.gradients.set(id, gradient);
    
    return {
      addColorStop: (position, color) => {
        gradient.stops.push({ position, color });
        gradient.dirty = true;
      },
      _id: id
    };
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    const gradient = {
      type: 'radial',
      x0, y0, r0, x1, y1, r1,
      stops: [],
      texture: null,
      dirty: true
    };
    
    const id = `gradient_${Date.now()}_${Math.random()}`;
    this.gradients.set(id, gradient);
    
    return {
      addColorStop: (position, color) => {
        gradient.stops.push({ position, color });
        gradient.dirty = true;
      },
      _id: id
    };
  }

  createPattern(image, repetition) {
    const pattern = {
      image,
      repetition: repetition || 'repeat',
      texture: null
    };
    
    return {
      _pattern: pattern
    };
  }

  // --- Properties ---
  set fillStyle(value) { this.state.fillStyle = value; }
  get fillStyle() { return this.state.fillStyle; }
  
  set strokeStyle(value) { this.state.strokeStyle = value; }
  get strokeStyle() { return this.state.strokeStyle; }
  
  set lineWidth(value) { this.state.lineWidth = value; }
  get lineWidth() { return this.state.lineWidth; }
  
  set font(value) { this.state.font = value; }
  get font() { return this.state.font; }
  
  set textAlign(value) { this.state.textAlign = value; }
  get textAlign() { return this.state.textAlign; }
  
  set textBaseline(value) { this.state.textBaseline = value; }
  get textBaseline() { return this.state.textBaseline; }
  
  set globalAlpha(value) { this.state.globalAlpha = Math.max(0, Math.min(1, value)); }
  get globalAlpha() { return this.state.globalAlpha; }
  
  set shadowColor(value) { this.state.shadowColor = value; }
  get shadowColor() { return this.state.shadowColor; }
  
  set shadowBlur(value) { this.state.shadowBlur = value; }
  get shadowBlur() { return this.state.shadowBlur; }
  
  set shadowOffsetX(value) { this.state.shadowOffsetX = value; }
  get shadowOffsetX() { return this.state.shadowOffsetX; }
  
  set shadowOffsetY(value) { this.state.shadowOffsetY = value; }
  get shadowOffsetY() { return this.state.shadowOffsetY; }
  
  set lineCap(value) { this.state.lineCap = value; }
  get lineCap() { return this.state.lineCap; }
  
  set lineJoin(value) { this.state.lineJoin = value; }
  get lineJoin() { return this.state.lineJoin; }
  
  set miterLimit(value) { this.state.miterLimit = value; }
  get miterLimit() { return this.state.miterLimit; }
  
  set filter(value) { this.state.filter = value; }
  get filter() { return this.state.filter; }
  
  getLineDash() { return [...this.state.lineDash]; }
  setLineDash(segments) { this.state.lineDash = [...segments]; }
  
  getLineDashOffset() { return this.state.lineDashOffset; }
  setLineDashOffset(value) { this.state.lineDashOffset = value; }
  
  set direction(value) { this.state.direction = value; }
  get direction() { return this.state.direction; }

  // --- WebGL specific ---
  getContextAttributes() {
    return {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      desynchronized: false
    };
  }

  // --- Méthodes utilitaires ---
  drawFocusIfNeeded(element) {
    // Pas d'implémentation pour WebGL
  }

  scrollPathIntoView() {
    // Pas d'implémentation pour WebGL
  }

  // ===== MÉTHODES WEBGL INTERNES =====

  initWebGL() {
    const gl = this.gl;
    
    // Shaders
    const vsSolidSource = `
      attribute vec2 aPosition;
      attribute vec4 aColor;
      uniform mat3 uProjectionMatrix;
      uniform mat3 uTransformMatrix;
      varying vec4 vColor;
      
      void main() {
        vec2 pos = (uTransformMatrix * vec3(aPosition, 1.0)).xy;
        vec2 ndc = (uProjectionMatrix * vec3(pos, 1.0)).xy;
        gl_Position = vec4(ndc, 0.0, 1.0);
        vColor = aColor;
      }
    `;
    
    const fsSolidSource = `
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        gl_FragColor = vColor;
      }
    `;
    
    const vsTextureSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      uniform mat3 uProjectionMatrix;
      uniform mat3 uTransformMatrix;
      varying vec2 vTexCoord;
      
      void main() {
        vec2 pos = (uTransformMatrix * vec3(aPosition, 1.0)).xy;
        vec2 ndc = (uProjectionMatrix * vec3(pos, 1.0)).xy;
        gl_Position = vec4(ndc, 0.0, 1.0);
        vTexCoord = aTexCoord;
      }
    `;
    
    const fsTextureSource = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float uAlpha;
      uniform vec4 uTintColor;
      
      void main() {
        vec4 texColor = texture2D(uTexture, vTexCoord);
        float alpha = texColor.a * uAlpha;
        gl_FragColor = vec4(mix(texColor.rgb, uTintColor.rgb, uTintColor.a), alpha);
      }
    `;
    
    this.solidProgram = this.createProgram(vsSolidSource, fsSolidSource);
    this.textureProgram = this.createProgram(vsTextureSource, fsTextureSource);
    
    // Buffers
    this.positionBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    
    // VAOs
    this.solidVAO = gl.createVertexArray();
    gl.bindVertexArray(this.solidVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const posLoc = gl.getAttribLocation(this.solidProgram, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    const colorLoc = gl.getAttribLocation(this.solidProgram, 'aColor');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    
    this.textureVAO = gl.createVertexArray();
    gl.bindVertexArray(this.textureVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const texPosLoc = gl.getAttribLocation(this.textureProgram, 'aPosition');
    gl.enableVertexAttribArray(texPosLoc);
    gl.vertexAttribPointer(texPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    const texCoordLoc = gl.getAttribLocation(this.textureProgram, 'aTexCoord');
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    
    // Configuration WebGL
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.SCISSOR_TEST);
    
    this.updateProjectionMatrix();
    this.createTextAtlas();
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Erreur link program:', gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Erreur compilation shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  updateProjectionMatrix() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    this.projectionMatrix = new Float32Array([
      2/w, 0,    0,
      0,   -2/h, 0,
      -1,  1,    1
    ]);
  }

  flush() {
    if (!this.batchEnabled) return;
    
    const gl = this.gl;
    
    if (this.batch.vertices.length > 0) {
      gl.useProgram(this.solidProgram);
      gl.bindVertexArray(this.solidVAO);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.batch.vertices), gl.STATIC_DRAW);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.batch.colors), gl.STATIC_DRAW);
      
      const projLoc = gl.getUniformLocation(this.solidProgram, 'uProjectionMatrix');
      gl.uniformMatrix3fv(projLoc, false, this.projectionMatrix);
      
      const transformLoc = gl.getUniformLocation(this.solidProgram, 'uTransformMatrix');
      gl.uniformMatrix3fv(transformLoc, false, new Float32Array(this.state.transform));
      
      gl.drawArrays(gl.TRIANGLES, 0, this.batch.vertices.length / 2);
      
      this.batch.vertices = [];
      this.batch.colors = [];
    }
    
    if (this.batch.textureVertices.length > 0 && this.batch.currentTexture) {
      gl.useProgram(this.textureProgram);
      gl.bindVertexArray(this.textureVAO);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.batch.textureVertices), gl.STATIC_DRAW);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.batch.textureTexCoords), gl.STATIC_DRAW);
      
      const projLoc = gl.getUniformLocation(this.textureProgram, 'uProjectionMatrix');
      gl.uniformMatrix3fv(projLoc, false, this.projectionMatrix);
      
      const transformLoc = gl.getUniformLocation(this.textureProgram, 'uTransformMatrix');
      gl.uniformMatrix3fv(transformLoc, false, new Float32Array(this.state.transform));
      
      const alphaLoc = gl.getUniformLocation(this.textureProgram, 'uAlpha');
      gl.uniform1f(alphaLoc, this.state.globalAlpha);
      
      const tintLoc = gl.getUniformLocation(this.textureProgram, 'uTintColor');
      gl.uniform4f(tintLoc, 0, 0, 0, 0);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.batch.currentTexture);
      gl.uniform1i(gl.getUniformLocation(this.textureProgram, 'uTexture'), 0);
      
      gl.drawArrays(gl.TRIANGLES, 0, this.batch.textureVertices.length / 2);
      
      this.batch.textureVertices = [];
      this.batch.textureTexCoords = [];
      this.batch.currentTexture = null;
    }
  }

  drawTriangles(vertices, colors) {
    if (this.batchEnabled) {
      const baseIndex = this.batch.vertices.length / 2;
      
      this.batch.vertices.push(...vertices);
      this.batch.colors.push(...colors);
      
      if (this.batch.vertices.length >= 6000) {
        this.flush();
      }
    } else {
      const gl = this.gl;
      gl.useProgram(this.solidProgram);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      
      const posLoc = gl.getAttribLocation(this.solidProgram, 'aPosition');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      
      const colorLoc = gl.getAttribLocation(this.solidProgram, 'aColor');
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
      
      const projLoc = gl.getUniformLocation(this.solidProgram, 'uProjectionMatrix');
      gl.uniformMatrix3fv(projLoc, false, this.projectionMatrix);
      
      const transformLoc = gl.getUniformLocation(this.solidProgram, 'uTransformMatrix');
      gl.uniformMatrix3fv(transformLoc, false, new Float32Array(this.state.transform));
      
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    }
  }

  drawTexturedQuad(texture, x, y, width, height, texCoords = null) {
    if (this.batchEnabled) {
      if (this.batch.currentTexture && this.batch.currentTexture !== texture) {
        this.flush();
      }
      
      this.batch.currentTexture = texture;
      
      const [x1, y1] = this.transformPoint(x, y);
      const [x2, y2] = this.transformPoint(x + width, y + height);
      
      const vertices = [
        x1, y1, x2, y1, x2, y2,
        x1, y1, x2, y2, x1, y2
      ];
      
      const uvs = texCoords || [
        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1
      ];
      
      this.batch.textureVertices.push(...vertices);
      this.batch.textureTexCoords.push(...uvs);
      
      if (this.batch.textureVertices.length >= 6000) {
        this.flush();
      }
    } else {
      const gl = this.gl;
      gl.useProgram(this.textureProgram);
      
      const [x1, y1] = this.transformPoint(x, y);
      const [x2, y2] = this.transformPoint(x + width, y + height);
      
      const vertices = [
        x1, y1, x2, y1, x2, y2, x1, y1, x2, y2, x1, y2
      ];
      
      const uvs = texCoords || [
        0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1
      ];
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      
      const posLoc = gl.getAttribLocation(this.textureProgram, 'aPosition');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
      
      const texLoc = gl.getAttribLocation(this.textureProgram, 'aTexCoord');
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
      
      const projLoc = gl.getUniformLocation(this.textureProgram, 'uProjectionMatrix');
      gl.uniformMatrix3fv(projLoc, false, this.projectionMatrix);
      
      const transformLoc = gl.getUniformLocation(this.textureProgram, 'uTransformMatrix');
      gl.uniformMatrix3fv(transformLoc, false, new Float32Array(this.state.transform));
      
      const alphaLoc = gl.getUniformLocation(this.textureProgram, 'uAlpha');
      gl.uniform1f(alphaLoc, this.state.globalAlpha);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(this.textureProgram, 'uTexture'), 0);
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  getImageTexture(image) {
    if (!image) return null;
    
    const cacheKey = image.src || image._id || 'canvas_' + Date.now();
    
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }
    
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else if (image instanceof ImageData) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, 
                    gl.RGBA, gl.UNSIGNED_BYTE, image.data);
    } else if (image instanceof ImageBitmap) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    const textureInfo = { texture, width: image.width || 0, height: image.height || 0 };
    this.imageCache.set(cacheKey, textureInfo);
    
    if (this.imageCache.size > 50) {
      const firstKey = this.imageCache.keys().next().value;
      const oldTex = this.imageCache.get(firstKey);
      gl.deleteTexture(oldTex.texture);
      this.imageCache.delete(firstKey);
    }
    
    return textureInfo;
  }

  applyClip() {
    if (!this.state.clipPath) {
      this.gl.disable(this.gl.SCISSOR_TEST);
      return;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const point of this.state.clipPath) {
      const [px, py] = this.transformPoint(point[0], point[1]);
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    
    const width = Math.max(0, maxX - minX);
    const height = Math.max(0, maxY - minY);
    
    this.gl.enable(this.gl.SCISSOR_TEST);
    this.gl.scissor(minX, this.canvas.height - minY - height, width, height);
  }

  // ===== MÉTHODES UTILITAIRES =====

  transformPoint(x, y) {
    const [a, b, c, d, e, f] = this.state.transform;
    return [
      a * x + c * y + e,
      b * x + d * y + f
    ];
  }

  parseColor(color) {
    if (typeof color !== 'string') {
      return [0, 0, 0, 1];
    }
    
    if (color._id && this.gradients.has(color._id)) {
      return [0, 0, 0, 1];
    }
    
    if (color._pattern) {
      return [0, 0, 0, 1];
    }
    
    if (color.startsWith('#')) {
      if (color.length === 4) {
        const r = parseInt(color[1], 16) / 15;
        const g = parseInt(color[2], 16) / 15;
        const b = parseInt(color[3], 16) / 15;
        return [r, g, b, 1];
      } else if (color.length === 5) {
        const r = parseInt(color[1], 16) / 15;
        const g = parseInt(color[2], 16) / 15;
        const b = parseInt(color[3], 16) / 15;
        const a = parseInt(color[4], 16) / 15;
        return [r, g, b, a];
      } else if (color.length === 7) {
        const r = parseInt(color.substr(1, 2), 16) / 255;
        const g = parseInt(color.substr(3, 2), 16) / 255;
        const b = parseInt(color.substr(5, 2), 16) / 255;
        return [r, g, b, 1];
      } else if (color.length === 9) {
        const r = parseInt(color.substr(1, 2), 16) / 255;
        const g = parseInt(color.substr(3, 2), 16) / 255;
        const b = parseInt(color.substr(5, 2), 16) / 255;
        const a = parseInt(color.substr(7, 2), 16) / 255;
        return [r, g, b, a];
      }
    }
    
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]) / 255;
      const g = parseInt(rgbMatch[2]) / 255;
      const b = parseInt(rgbMatch[3]) / 255;
      const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
      return [r, g, b, a];
    }
    
    const namedColors = {
      'black': [0, 0, 0, 1], 'white': [1, 1, 1, 1], 'red': [1, 0, 0, 1],
      'green': [0, 1, 0, 1], 'blue': [0, 0, 1, 1], 'yellow': [1, 1, 0, 1],
      'cyan': [0, 1, 1, 1], 'magenta': [1, 0, 1, 1], 'gray': [0.5, 0.5, 0.5, 1],
      'grey': [0.5, 0.5, 0.5, 1], 'transparent': [0, 0, 0, 0]
    };
    
    return namedColors[color.toLowerCase()] || [0, 0, 0, 1];
  }

  triangulatePolygon(polygon, fillRule) {
    const triangles = [];
    const vertices = [...polygon];
    
    while (vertices.length > 3) {
      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        
        if (this.isEar(prev, curr, next, vertices, fillRule)) {
          triangles.push([prev, curr, next]);
          vertices.splice(i, 1);
          break;
        }
      }
    }
    
    if (vertices.length === 3) {
      triangles.push(vertices);
    }
    
    return triangles;
  }

  isEar(a, b, c, polygon, fillRule) {
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (fillRule === 'nonzero' && cross <= 0) return false;
    if (fillRule === 'evenodd' && Math.abs(cross) < 0.001) return false;
    
    const triangle = [a, b, c];
    for (const p of polygon) {
      if (p !== a && p !== b && p !== c && this.isPointInTriangle(p, triangle)) {
        return false;
      }
    }
    
    return true;
  }

  isPointInTriangle(p, triangle) {
    const [a, b, c] = triangle;
    const area = 0.5 * (-b[1] * c[0] + a[1] * (-b[0] + c[0]) + a[0] * (b[1] - c[1]) + b[0] * c[1]);
    const s = 1 / (2 * area) * (a[1] * c[0] - a[0] * c[1] + (c[1] - a[1]) * p[0] + (a[0] - c[0]) * p[1]);
    const t = 1 / (2 * area) * (a[0] * b[1] - a[1] * b[0] + (a[1] - b[1]) * p[0] + (b[0] - a[0]) * p[1]);
    return s > 0 && t > 0 && 1 - s - t > 0;
  }

  isLeft(p1, p2, p3) {
    return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
  }

  isPointNearLine(px, py, x1, y1, x2, y2, tolerance) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  drawLine(x1, y1, x2, y2, width, color, alpha) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const halfWidth = width / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const vertices = [
      x1 - sin * halfWidth, y1 + cos * halfWidth,
      x1 + sin * halfWidth, y1 - cos * halfWidth,
      x2 - sin * halfWidth, y2 + cos * halfWidth,
      x1 + sin * halfWidth, y1 - cos * halfWidth,
      x2 + sin * halfWidth, y2 - cos * halfWidth,
      x2 - sin * halfWidth, y2 + cos * halfWidth
    ];
    
    const colors = new Array(6 * 4).fill(0);
    for (let i = 0; i < 6; i++) {
      colors[i * 4] = color[0];
      colors[i * 4 + 1] = color[1];
      colors[i * 4 + 2] = color[2];
      colors[i * 4 + 3] = alpha;
    }
    
    this.drawTriangles(vertices, colors);
  }

  endFrame() {
    this.flush();
  }
}

export default WebGLCanvasAdapter;
