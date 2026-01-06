/**
 * Adaptateur WebGL amélioré qui émule l'API Canvas 2D
 * Version optimisée avec batching et API complète
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
      miterLimit: 10
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

  initWebGL() {
    const gl = this.gl;
    
    // ===== SHADERS =====
    
    // Shader pour les formes solides
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
    
    // Shader pour les textures
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
    
    // VAOs pour chaque programme
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
    
    // Matrice de projection
    this.updateProjectionMatrix();
    
    // Frame buffer pour les effets
    this.frameBuffer = gl.createFramebuffer();
    this.renderTexture = gl.createTexture();
  }

  // ===== MÉTHODES CANVAS 2D MANQUANTES =====

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

  drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    if (arguments.length === 3) {
      // drawImage(image, dx, dy)
      dx = sx; dy = sy;
      sWidth = dWidth = image.width;
      sHeight = dHeight = image.height;
      sx = sy = 0;
    } else if (arguments.length === 5) {
      // drawImage(image, dx, dy, dWidth, dHeight)
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

  clip(path) {
    if (!path && this.currentPath) {
      path = this.currentPath;
    }
    
    if (path) {
      this.state.clipPath = path;
      this.applyClip();
    }
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
    
    // Lire les pixels depuis le framebuffer
    const pixels = new Uint8Array(sw * sh * 4);
    gl.readPixels(sx, this.canvas.height - sy - sh, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    const imageData = this.createImageData(sw, sh);
    
    // Convertir RGBA à RGBA (inverser Y)
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
    
    // Créer une texture temporaire
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, 
                  gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    // Dessiner la texture
    this.drawTexturedQuad(texture, dx + dirtyX, dy + dirtyY, dirtyWidth, dirtyHeight);
    
    gl.deleteTexture(texture);
  }

  rect(x, y, width, height) {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  arcTo(x1, y1, x2, y2, radius) {
    if (!this.currentPoint) return;
    
    const [x0, y0] = this.currentPoint;
    
    // Calcul des points de contrôle pour l'arc
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

  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
    const segments = Math.ceil(32 * Math.max(radiusX, radiusY) / 10);
    const angleStep = (endAngle - startAngle) / segments;
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (anticlockwise ? -i : i) * angleStep;
      const px = x + Math.cos(angle) * Math.cos(rotation) * radiusX - Math.sin(angle) * Math.sin(rotation) * radiusY;
      const py = y + Math.cos(angle) * Math.sin(rotation) * radiusX + Math.sin(angle) * Math.cos(rotation) * radiusY;
      
      if (i === 0) {
        this.moveTo(px, py);
      } else {
        this.lineTo(px, py);
      }
    }
  }

  closePath() {
    if (this.currentPath && this.currentPath.length > 0) {
      const firstPoint = this.currentPath[0];
      this.lineTo(firstPoint[0], firstPoint[1]);
    }
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

  isPointInPath(x, y, fillRule = 'nonzero') {
    if (!this.currentPath || this.currentPath.length < 3) return false;
    
    // Algorithme du winding number
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
    } else { // evenodd
      return Math.abs(wn % 2) === 1;
    }
  }

  // ===== MÉTHODES OPTIMISÉES =====

  updateProjectionMatrix() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Matrice de projection correcte (9 éléments)
    this.projectionMatrix = new Float32Array([
      2/w, 0,    0,
      0,   -2/h, 0,
      -1,  1,    1
    ]);
  }

  flush() {
    if (!this.batchEnabled) return;
    
    const gl = this.gl;
    
    // Flush solid geometry
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
    
    // Flush textured geometry
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
      gl.uniform4f(tintLoc, 0, 0, 0, 0); // Pas de tint par défaut
      
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
      
      if (this.batch.vertices.length >= 6000) { // Flush tous les 1000 triangles
        this.flush();
      }
    } else {
      // Mode immédiat (backup)
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
      // Mode immédiat
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

  // ===== UTILITAIRES OPTIMISÉS =====

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
    
    // Limiter le cache
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
    
    // Calculer les limites du clip path
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

  isLeft(p1, p2, p3) {
    return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
  }

  // Garder les méthodes existantes mais optimisées
  fillRect(x, y, width, height) {
    this.batchRect(x, y, width, height, this.state.fillStyle);
  }

  strokeRect(x, y, width, height) {
    // Implémentation optimisée du stroke
    const lineWidth = this.state.lineWidth;
    const color = this.parseColor(this.state.strokeStyle);
    const alpha = color[3] * this.state.globalAlpha;
    
    // Dessiner 4 rectangles pour les bords
    const rects = [
      [x, y, width, lineWidth], // Haut
      [x, y + height - lineWidth, width, lineWidth], // Bas
      [x, y, lineWidth, height], // Gauche
      [x + width - lineWidth, y, lineWidth, height] // Droite
    ];
    
    for (const rect of rects) {
      this.batchRect(...rect, this.state.strokeStyle);
    }
  }

  batchRect(x, y, width, height, colorStyle) {
    const [x1, y1] = this.transformPoint(x, y);
    const [x2, y2] = this.transformPoint(x + width, y + height);
    
    const vertices = [
      x1, y1, x2, y1, x2, y2,
      x1, y1, x2, y2, x1, y2
    ];
    
    const color = this.parseColor(colorStyle);
    const alpha = color[3] * this.state.globalAlpha;
    const colors = new Array(6 * 4).fill(0);
    
    for (let i = 0; i < 6; i++) {
      colors[i*4] = color[0];
      colors[i*4 + 1] = color[1];
      colors[i*4 + 2] = color[2];
      colors[i*4 + 3] = alpha;
    }
    
    this.drawTriangles(vertices, colors);
  }

  // Méthodes de base inchangées mais optimisées
  fill() {
    if (!this.currentPath || this.currentPath.length < 3) return;
    
    // Triangulation simple
    const triangles = this.triangulatePolygon(this.currentPath);
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

  triangulatePolygon(polygon) {
    // Algorithme d'éar clipping simplifié
    const triangles = [];
    const vertices = [...polygon];
    
    while (vertices.length > 3) {
      for (let i = 0; i < vertices.length; i++) {
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        
        if (this.isEar(prev, curr, next, vertices)) {
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

  isEar(a, b, c, polygon) {
    // Vérifier si le triangle abc est une "oreille"
    const triangle = [a, b, c];
    
    // Vérifier si c'est un angle convexe
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (cross <= 0) return false;
    
    // Vérifier si aucun autre point n'est dans le triangle
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

  // Méthodes de gestion d'état
  set lineCap(value) { this.state.lineCap = value; }
  get lineCap() { return this.state.lineCap; }
  
  set lineJoin(value) { this.state.lineJoin = value; }
  get lineJoin() { return this.state.lineJoin; }
  
  set miterLimit(value) { this.state.miterLimit = value; }
  get miterLimit() { return this.state.miterLimit; }

  // Méthodes existantes conservées
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

  // Appeler flush à la fin de chaque frame
  endFrame() {
    this.flush();
  }
}

export default WebGLCanvasAdapter;