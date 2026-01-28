/**
 * Adaptateur WebGL pour le rendu Canvas 2D-like
 * @class WebGLCanvasAdapter
 */
class WebGLCanvasAdapter {
    /**
     * Crée une instance de WebGLCanvasAdapter
     * @param {HTMLCanvasElement} canvas - Élément canvas HTML
     * @param {Object} options - Options de configuration WebGL
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.options = {
            alpha: true,
            antialias: true,
            depth: false,
            stencil: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
            ...options
        };

        // Obtenir le contexte WebGL
        this.gl = canvas.getContext('webgl2', this.options) || 
                  canvas.getContext('webgl', this.options) ||
                  canvas.getContext('experimental-webgl', this.options);

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        // Dimensions
        this.width = canvas.width;
        this.height = canvas.height;
        this.dpr = window.devicePixelRatio || 1;

        // État du contexte (compatibilité Canvas 2D)
        this._state = {
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            lineCap: 'butt',
            lineJoin: 'miter',
            miterLimit: 10,
            globalAlpha: 1,
            textAlign: 'start',
            textBaseline: 'alphabetic',
            font: '10px sans-serif',
            shadowColor: 'rgba(0, 0, 0, 0)',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            filter: 'none'
        };

        // Pile d'états (pour save/restore)
        this._stateStack = [];

        // Transformations
        this._transform = {
            matrix: [1, 0, 0, 1, 0, 0], // [a, b, c, d, e, f]
            stack: []
        };

        // Chemins (path)
        this._path = {
            points: [],
            subpaths: [],
            currentSubpath: []
        };

        // Textures et ressources
        this._textures = new Map();
        this._shaders = new Map();
        this._buffers = new Map();

        // Programmes de shader
        this._programs = {
            basic: null,
            text: null,
            gradient: null,
            image: null
        };

        // Gestionnaire de dégradés
        this._gradients = new Map();

        // Couleurs courantes
        this._currentFillColor = this._parseColor(this._state.fillStyle);
        this._currentStrokeColor = this._parseColor(this._state.strokeStyle);

        // Configuration initiale
        this._setupWebGL();
        this._compileShaders();
        this._createBuffers();

        // Interface CanvasRenderingContext2D-like
        this._setupInterface();

        // Test immédiat pour vérifier le rendu
        setTimeout(() => {
            console.log('Testing WebGL rendering...');
            this.fillStyle = 'red';
            this.fillRect(10, 10, 100, 100);
            this.fillStyle = 'blue';
            this.fillRect(150, 10, 100, 100);
            
            // Vérifier l'état WebGL
            const glError = this.gl.getError();
            if (glError !== this.gl.NO_ERROR) {
                console.error('WebGL error:', glError);
            } else {
                console.log('WebGL rendering test passed');
            }
        }, 100);
    }

    /**
     * Configure l'environnement WebGL de base
     * @private
     */
    _setupWebGL() {
        const gl = this.gl;

        // Configuration du viewport
        gl.viewport(0, 0, this.width, this.height);

        // Activer le blending pour la transparence
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Désactiver le test de profondeur (2D)
        gl.disable(gl.DEPTH_TEST);

        // Clear color
        gl.clearColor(0, 0, 0, 0);
    }

    /**
     * Compile les shaders nécessaires
     * @private
     */
    _compileShaders() {
		console.log('=== COMPILING SIMPLE SHADER ===');
		
		// SHADER ULTRA SIMPLE qui compile à coup sûr
		const basicVS = `#version 300 es
			precision highp float;
			
			in vec2 a_position;
			in vec4 a_color;
			
			out vec4 v_color;
			
			void main() {
				// DIRECT NDC: a_position contient déjà des coordonnées NDC (-1 à 1)
				gl_Position = vec4(a_position, 0.0, 1.0);
				v_color = a_color;
			}
		`;

		const basicFS = `#version 300 es
			precision highp float;
			
			in vec4 v_color;
			out vec4 outColor;
			
			void main() {
				outColor = v_color;
			}
		`;

		this._programs.basic = this._createProgram(basicVS, basicFS);
		
		// Shaders pour texte et images (simplifiés aussi)
		const textVS = `#version 300 es
			precision highp float;
			
			in vec2 a_position;
			in vec2 a_texcoord;
			
			out vec2 v_texcoord;
			
			void main() {
				gl_Position = vec4(a_position, 0.0, 1.0);
				v_texcoord = a_texcoord;
			}
		`;

		const textFS = `#version 300 es
			precision highp float;
			
			in vec2 v_texcoord;
			uniform sampler2D u_texture;
			uniform vec4 u_color;
			
			out vec4 outColor;
			
			void main() {
				float alpha = texture(u_texture, v_texcoord).r;
				outColor = vec4(u_color.rgb, u_color.a * alpha);
			}
		`;

		this._programs.text = this._createProgram(textVS, textFS);

		const imageVS = `#version 300 es
			precision highp float;
			
			in vec2 a_position;
			in vec2 a_texcoord;
			
			out vec2 v_texcoord;
			
			void main() {
				gl_Position = vec4(a_position, 0.0, 1.0);
				v_texcoord = a_texcoord;
			}
		`;

		const imageFS = `#version 300 es
			precision highp float;
			
			in vec2 v_texcoord;
			uniform sampler2D u_texture;
			uniform float u_alpha;
			
			out vec4 outColor;
			
			void main() {
				vec4 texColor = texture(u_texture, v_texcoord);
				outColor = vec4(texColor.rgb, texColor.a * u_alpha);
			}
		`;

		this._programs.image = this._createProgram(imageVS, imageFS);
		
		console.log('=== SHADER COMPILATION COMPLETE ===');
	}

    /**
     * Crée un programme WebGL à partir de sources de shader
     * @private
     */
    _createProgram(vsSource, fsSource) {
        const gl = this.gl;
        
        console.log('Compiling vertex shader...');
        const vertexShader = this._compileShader(gl.VERTEX_SHADER, vsSource);
        if (!vertexShader) {
            console.error('Vertex shader compilation failed');
            return null;
        }
        
        console.log('Compiling fragment shader...');
        const fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!fragmentShader) {
            console.error('Fragment shader compilation failed');
            return null;
        }
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        console.log('Shader program compiled successfully');
        return program;
    }

    /**
     * Compile un shader
     * @private
     */
    _compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    /**
     * Crée les buffers GPU nécessaires
     * @private
     */
    _createBuffers() {
        const gl = this.gl;

        // Buffer de position
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        this._buffers.set('position', positionBuffer);

        // Buffer de couleur
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        this._buffers.set('color', colorBuffer);

        // Buffer d'indices
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this._buffers.set('indices', indexBuffer);

        // Buffer de texture pour le texte
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        this._buffers.set('texcoord', texcoordBuffer);
    }

    /**
     * Configure l'interface CanvasRenderingContext2D
     * @private
     */
    _setupInterface() {
        // Méthodes de dessin de base
        this.fillRect = this._fillRect.bind(this);
        this.strokeRect = this._strokeRect.bind(this);
        this.clearRect = this._clearRect.bind(this);
        this.fillText = this._fillText.bind(this);
        this.strokeText = this._strokeText.bind(this);
        this.drawImage = this._drawImage.bind(this);

        // Chemins (paths)
        this.beginPath = this._beginPath.bind(this);
        this.moveTo = this._moveTo.bind(this);
        this.lineTo = this._lineTo.bind(this);
        this.arc = this._arc.bind(this);
        this.rect = this._rect.bind(this);
        this.closePath = this._closePath.bind(this);
        this.fill = this._fill.bind(this);
        this.stroke = this._stroke.bind(this);

        // Transformations
        this.save = this._save.bind(this);
        this.restore = this._restore.bind(this);
        this.translate = this._translate.bind(this);
        this.rotate = this._rotate.bind(this);
        this.scale = this._scale.bind(this);
        this.transform = this._transformMethod.bind(this);
        this.setTransform = this._setTransform.bind(this);

        // Dégradés et motifs
        this.createLinearGradient = this._createLinearGradient.bind(this);
        this.createRadialGradient = this._createRadialGradient.bind(this);

        // Mesure de texte
        this.measureText = this._measureText.bind(this);

        // Méthodes supplémentaires
        this.quadraticCurveTo = this._quadraticCurveTo.bind(this);
        this.bezierCurveTo = this._bezierCurveTo.bind(this);
        this.ellipse = this._ellipse.bind(this);
        this.roundRect = this._roundRect.bind(this);

        // État du contexte
        this._setupGettersSetters();
    }

    /**
     * Vérifie les erreurs WebGL
     * @private
     */
    checkGLError(context) {
        const gl = this.gl;
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error(`WebGL error (${context}):`, error);
            return false;
        }
        return true;
    }

    /**
     * Configure les getters/setters pour les propriétés du contexte
     * @private
     */
    _setupGettersSetters() {
        const properties = [
            'fillStyle',
            'strokeStyle',
            'lineWidth',
            'lineCap',
            'lineJoin',
            'miterLimit',
            'globalAlpha',
            'textAlign',
            'textBaseline',
            'font',
            'shadowColor',
            'shadowBlur',
            'shadowOffsetX',
            'shadowOffsetY',
            'filter'
        ];

        properties.forEach(prop => {
            Object.defineProperty(this, prop, {
                get: () => this._state[prop],
                set: (value) => {
                    this._state[prop] = value;
                    this._updateStateDependencies(prop, value);
                },
                enumerable: true,
                configurable: true
            });
        });
    }

    /**
     * Met à jour les dépendances d'état
     * @private
     */
    _updateStateDependencies(prop, value) {
        switch (prop) {
            case 'globalAlpha':
                // Ne rien faire, l'alpha est appliqué dans _parseColor
                break;
            case 'fillStyle':
                this._currentFillColor = this._parseColor(value);
                break;
            case 'strokeStyle':
                this._currentStrokeColor = this._parseColor(value);
                break;
        }
    }

    /**
     * Met à jour le style de remplissage
     * @private
     */
    _updateFillStyle(value) {
        this._currentFillColor = this._parseColor(value);
    }

    /**
     * Met à jour le style de contour
     * @private
     */
    _updateStrokeStyle(value) {
        this._currentStrokeColor = this._parseColor(value);
    }

    /**
     * Met à jour l'alpha global
     * @private
     */
    _updateAlpha(value) {
        // L'alpha est déjà appliqué dans _parseColor
    }

    /**
     * Dessine une courbe de Bézier quadratique
     * @param {number} cpx - Point de contrôle X
     * @param {number} cpy - Point de contrôle Y
     * @param {number} x - Point final X
     * @param {number} y - Point final Y
     */
    _quadraticCurveTo(cpx, cpy, x, y) {
        this._lineTo(x, y); // Implémentation simplifiée
    }

    /**
     * Dessine une courbe de Bézier cubique
     * @param {number} cp1x - Premier point de contrôle X
     * @param {number} cp1y - Premier point de contrôle Y
     * @param {number} cp2x - Deuxième point de contrôle X
     * @param {number} cp2y - Deuxième point de contrôle Y
     * @param {number} x - Point final X
     * @param {number} y - Point final Y
     */
    _bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._lineTo(x, y); // Implémentation simplifiée
    }

    /**
     * Dessine une ellipse
     * @param {number} x - Centre X
     * @param {number} y - Centre Y
     * @param {number} radiusX - Rayon horizontal
     * @param {number} radiusY - Rayon vertical
     * @param {number} rotation - Rotation en radians
     * @param {number} startAngle - Angle de départ
     * @param {number} endAngle - Angle de fin
     * @param {boolean} anticlockwise - Sens anti-horaire
     */
    _ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise = false) {
        // Implémentation simplifiée - utilise arc() pour un cercle
        if (radiusX === radiusY) {
            this.arc(x, y, radiusX, startAngle, endAngle, anticlockwise);
        } else {
            // Pour une ellipse, on peut approximer avec plusieurs arcs
            const segments = 16;
            const angleStep = (endAngle - startAngle) / segments;
            
            if (!this._path.currentSubpath.length) {
                const firstX = x + Math.cos(startAngle) * radiusX;
                const firstY = y + Math.sin(startAngle) * radiusY;
                this._moveTo(firstX, firstY);
            }
            
            for (let i = 1; i <= segments; i++) {
                const angle = startAngle + angleStep * i;
                const px = x + Math.cos(angle) * radiusX;
                const py = y + Math.sin(angle) * radiusY;
                this._lineTo(px, py);
            }
        }
    }

    /**
     * Arrondit les coins d'un rectangle
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     * @param {number|number[]} radii - Rayon(s) d'arrondi
     */
    _roundRect(x, y, width, height, radii) {
        // Implémentation simplifiée de roundRect
        const radius = Array.isArray(radii) ? radii[0] : radii;
        
        this.beginPath();
        
        if (radius === 0) {
            // Rectangle normal
            this.rect(x, y, width, height);
        } else {
            // Rectangle avec coins arrondis
            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.lineTo(x + width, y + height - radius);
            this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.lineTo(x + radius, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
            this.closePath();
        }
    }

    // ===== IMPLÉMENTATION DES MÉTHODES CANVAS 2D =====

    /**
     * Remplit un rectangle
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     */
   _fillRect(x, y, width, height) {
    // FORCER des dimensions positives
    const actualX = Math.min(x, x + width);
    const actualY = Math.min(y, y + height);
    const actualWidth = Math.abs(width);
    const actualHeight = Math.abs(height);
    
    console.log('_fillRect corrected:', {
        original: {x, y, width, height},
        corrected: {actualX, actualY, actualWidth, actualHeight}
    });
    
    const color = this._parseColor(this.fillStyle);
    color[3] *= this.globalAlpha;
    
    // Créer un rectangle avec 2 triangles (TOUJOURS positif)
    const vertices = new Float32Array([
        actualX, actualY,
        actualX + actualWidth, actualY,
        actualX, actualY + actualHeight,
        actualX + actualWidth, actualY + actualHeight
    ]);
        
        // Créer un rectangle avec 2 triangles
     
        const colors = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            colors[i*4] = color[0];
            colors[i*4+1] = color[1];
            colors[i*4+2] = color[2];
            colors[i*4+3] = color[3];
        }
        
        const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
        
        this._drawTriangles(vertices, colors, indices, this._getCurrentMatrix());
    }

    /**
     * Dessine le contour d'un rectangle
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     */
    _strokeRect(x, y, width, height) {
        const lineWidth = this.lineWidth;
        const halfWidth = lineWidth / 2;

        // Dessiner 4 lignes pour former le rectangle
        this._strokeLine(x - halfWidth, y, x + width + halfWidth, y); // Haut
        this._strokeLine(x + width, y - halfWidth, x + width, y + height + halfWidth); // Droite
        this._strokeLine(x + width + halfWidth, y + height, x - halfWidth, y + height); // Bas
        this._strokeLine(x, y + height + halfWidth, x, y - halfWidth); // Gauche
    }

    /**
     * Efface une zone rectangulaire
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     */
    _clearRect(x, y, width, height) {
        const gl = this.gl;

        // Sauvegarder l'état actuel
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(x * this.dpr, (this.height - y - height) * this.dpr, 
                   width * this.dpr, height * this.dpr);

        // Effacer avec la couleur de fond
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Restaurer
        gl.disable(gl.SCISSOR_TEST);
    }

    /**
     * Dessine du texte rempli
     * @param {string} text - Texte à dessiner
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} maxWidth - Largeur maximale (optionnelle)
     */
    _fillText(text, x, y, maxWidth) {
        this._renderText(text, x, y, maxWidth, 'fill');
    }

    /**
     * Dessine le contour du texte
     * @param {string} text - Texte à dessiner
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} maxWidth - Largeur maximale (optionnelle)
     */
    _strokeText(text, x, y, maxWidth) {
        this._renderText(text, x, y, maxWidth, 'stroke');
    }

    /**
     * Dessine une image
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} image - Image à dessiner
     * @param {number} sx - Source X (pour le découpage)
     * @param {number} sy - Source Y (pour le découpage)
     * @param {number} sWidth - Largeur source (pour le découpage)
     * @param {number} sHeight - Hauteur source (pour le découpage)
     * @param {number} dx - Destination X
     * @param {number} dy - Destination Y
     * @param {number} dWidth - Largeur destination
     * @param {number} dHeight - Hauteur destination
     */
    _drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        // Gestion des différentes signatures
        if (arguments.length === 3) {
            // drawImage(image, dx, dy)
            dx = sx;
            dy = sy;
            sx = sy = 0;
            sWidth = image.width;
            sHeight = image.height;
            dWidth = sWidth;
            dHeight = sHeight;
        } else if (arguments.length === 5) {
            // drawImage(image, dx, dy, dWidth, dHeight)
            dWidth = sWidth;
            dHeight = sHeight;
            sWidth = image.width;
            sHeight = image.height;
            sx = sy = 0;
        }

        const gl = this.gl;
        const matrix = this._getCurrentMatrix();

        // Créer ou réutiliser une texture
        let texture = this._textures.get(image);
        if (!texture) {
            texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this._textures.set(image, texture);
        }

        // Coordonnées de texture normalisées
        const texCoords = new Float32Array([
            sx / image.width, sy / image.height,
            (sx + sWidth) / image.width, sy / image.height,
            sx / image.width, (sy + sHeight) / image.height,
            (sx + sWidth) / image.width, (sy + sHeight) / image.height
        ]);

        // Vertices du rectangle
        const vertices = new Float32Array([
            dx, dy,
            dx + dWidth, dy,
            dx, dy + dHeight,
            dx + dWidth, dy + dHeight
        ]);

        // Dessiner
        this._drawTexturedQuad(vertices, texCoords, texture, matrix);
    }

    // ===== GESTION DES CHEMINS (PATHS) =====

    _beginPath() {
        this._path.points = [];
        this._path.subpaths = [];
        this._path.currentSubpath = [];
    }

    _moveTo(x, y) {
        if (this._path.currentSubpath.length > 0) {
            this._path.subpaths.push([...this._path.currentSubpath]);
        }
        this._path.currentSubpath = [{ x, y, type: 'move' }];
        this._path.points.push({ x, y, type: 'move' });
    }

    _lineTo(x, y) {
        this._path.currentSubpath.push({ x, y, type: 'line' });
        this._path.points.push({ x, y, type: 'line' });
    }

    _arc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
        const segments = Math.max(8, Math.ceil(Math.abs(endAngle - startAngle) * radius / 2));
        const angleStep = (endAngle - startAngle) / segments;
        
        if (!this._path.currentSubpath.length) {
            const firstX = x + Math.cos(startAngle) * radius;
            const firstY = y + Math.sin(startAngle) * radius;
            this._moveTo(firstX, firstY);
        }

        for (let i = 1; i <= segments; i++) {
            const angle = startAngle + angleStep * i;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            this._lineTo(px, py);
        }
    }

    _rect(x, y, width, height) {
        this._moveTo(x, y);
        this._lineTo(x + width, y);
        this._lineTo(x + width, y + height);
        this._lineTo(x, y + height);
        this._closePath();
    }

    _closePath() {
        if (this._path.currentSubpath.length > 1) {
            const first = this._path.currentSubpath[0];
            this._lineTo(first.x, first.y);
        }
        this._path.subpaths.push([...this._path.currentSubpath]);
        this._path.currentSubpath = [];
    }

    _fill() {
        // Implémentation simplifiée - triangulation du polygone
        const points = [];
        this._path.subpaths.forEach(subpath => {
            subpath.forEach(point => {
                if (point.type !== 'move') {
                    points.push(point.x, point.y);
                }
            });
        });

        if (points.length < 6) return; // Pas assez de points pour un triangle

        // Triangulation simple (pour démonstration)
        // En production, utiliser une librairie de triangulation comme earcut
        this._fillPolygon(points);
    }

    _stroke() {
        this._path.subpaths.forEach(subpath => {
            for (let i = 1; i < subpath.length; i++) {
                const p1 = subpath[i - 1];
                const p2 = subpath[i];
                if (p1.type !== 'move' && p2.type !== 'move') {
                    this._strokeLine(p1.x, p1.y, p2.x, p2.y);
                }
            }
        });
    }

    // ===== TRANSFORMATIONS =====

    _save() {
        // Sauvegarder l'état ET la matrice de transformation
        this._stateStack.push({ ...this._state });
        this._transform.stack.push([...this._transform.matrix]);
    }

    _restore() {
        if (this._stateStack.length > 0) {
            this._state = this._stateStack.pop();
        }
        if (this._transform.stack.length > 0) {
            this._transform.matrix = this._transform.stack.pop();
        }
    }

    _translate(x, y) {
        const m = this._transform.matrix;
        m[4] += m[0] * x + m[2] * y;
        m[5] += m[1] * x + m[3] * y;
    }

    _getCurrentMatrix() {
		const m = this._transform.matrix;
		
		// Si pas de transformation, ajouter un scale pour pixels→NDC
		if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1) {
			// Matrice identité modifiée pour scale
			return [
				1, 0,
				0, 1,
				0, 0
			];
		}
		
		return m;
	}

    _rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const m = this._transform.matrix;
        
        const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
        
        m[0] = m0 * cos + m2 * sin;
        m[1] = m1 * cos + m3 * sin;
        m[2] = m0 * -sin + m2 * cos;
        m[3] = m1 * -sin + m3 * cos;
    }

    _scale(x, y) {
        const m = this._transform.matrix;
        m[0] *= x;
        m[1] *= x;
        m[2] *= y;
        m[3] *= y;
    }

    _transformMethod(a, b, c, d, e, f) {
        const m = this._transform.matrix;
        const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5];
        
        m[0] = m0 * a + m2 * b;
        m[1] = m1 * a + m3 * b;
        m[2] = m0 * c + m2 * d;
        m[3] = m1 * c + m3 * d;
        m[4] = m0 * e + m2 * f + m4;
        m[5] = m1 * e + m3 * f + m5;
    }

    _setTransform(a, b, c, d, e, f) {
        this._transform.matrix = [a, b, c, d, e, f];
    }

    // ===== DÉGRADÉS =====

    _createLinearGradient(x0, y0, x1, y1) {
        const gradient = {
            type: 'linear',
            x0, y0, x1, y1,
            stops: []
        };
        
        const id = `gradient_${Date.now()}_${Math.random()}`;
        this._gradients.set(id, gradient);
        
        return {
            addColorStop: (position, color) => {
                gradient.stops.push({ position, color });
            },
            _id: id
        };
    }

    _createRadialGradient(x0, y0, r0, x1, y1, r1) {
        const gradient = {
            type: 'radial',
            x0, y0, r0, x1, y1, r1,
            stops: []
        };
        
        const id = `gradient_${Date.now()}_${Math.random()}`;
        this._gradients.set(id, gradient);
        
        return {
            addColorStop: (position, color) => {
                gradient.stops.push({ position, color });
            },
            _id: id
        };
    }

    // ===== MESURE DE TEXTE =====

    _measureText(text) {
        const font = this._parseFont(this.font);
        const ctx = document.createElement('canvas').getContext('2d');
        
        // Configurer le contexte temporaire avec la même police
        ctx.font = this.font;
        
        const metrics = ctx.measureText(text);
        
        // Ajuster selon textBaseline
        let actualBoundingBoxAscent = metrics.actualBoundingBoxAscent || font.size;
        let actualBoundingBoxDescent = metrics.actualBoundingBoxDescent || 0;
        
        switch (this.textBaseline) {
            case 'top':
                metrics.y = actualBoundingBoxAscent;
                break;
            case 'hanging':
                metrics.y = actualBoundingBoxAscent * 0.8;
                break;
            case 'middle':
                metrics.y = (actualBoundingBoxAscent - actualBoundingBoxDescent) / 2;
                break;
            case 'alphabetic':
                metrics.y = 0;
                break;
            case 'ideographic':
                metrics.y = actualBoundingBoxDescent;
                break;
            case 'bottom':
                metrics.y = -actualBoundingBoxDescent;
                break;
        }
        
        return metrics;
    }

    // ===== MÉTHODES UTILITAIRES PRIVÉES =====

    /**
     * Parse une couleur en RGBA
     * @private
     */
    _parseColor(color) {
		// DEBUG: Voir ce qu'on reçoit
		console.log('parseColor input:', color, typeof color);
		
		// Si c'est un gradient (objet avec _id), retourne une couleur fixe
		if (color && typeof color === 'object') {
			console.warn('Gradient object detected, using fallback color');
			// Vous pouvez choisir différentes stratégies :
			
			// 1. Retourner la première couleur du gradient si disponible
			if (color.stops && color.stops.length > 0) {
				const firstColor = color.stops[0].color;
				if (typeof firstColor === 'string') {
					return this._parseColor(firstColor);
				}
			}
			
			// 2. Retourner une couleur par défaut basée sur l'ID
			if (color._id) {
				// Générer une couleur déterministe basée sur l'ID
				const hash = this._stringToHash(color._id);
				return [
					(hash % 255) / 255,
					((hash >> 8) % 255) / 255,
					((hash >> 16) % 255) / 255,
					1
				];
			}
			
			// 3. Couleur de fallback
			return [0.5, 0.5, 0.5, 1]; // Gris
		}
		
		// Si c'est une string, parse normalement
		if (typeof color === 'string') {
			// ... votre parsing de couleur existant ...
		}
		
		// Par défaut : rouge semi-transparent pour debug
		return [1, 0, 0, 0.5];
	}

	// Ajoutez cette méthode utilitaire
	_stringToHash(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash; // Convertir en 32-bit integer
		}
		return Math.abs(hash);
	}

    /**
     * Convertit une couleur hex en RGBA
     * @private
     */
    _hexToRgb(hex) {
        hex = hex.replace('#', '');
        
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.substr(6, 2), 16) / 255 : 1;
        
        return [r, g, b, a];
    }

    /**
     * Parse la police
     * @private
     */
    _parseFont(font) {
        const match = font.match(/(\d+)px\s+(.+)/);
        return {
            size: match ? parseInt(match[1]) : 10,
            family: match ? match[2] : 'sans-serif'
        };
    }

    /**
     * Dessine une ligne avec style
     * @private
     */
    _strokeLine(x1, y1, x2, y2) {
        const gl = this.gl;
        const matrix = this._getCurrentMatrix();
        const color = this._parseColor(this.strokeStyle);
        const lineWidth = this.lineWidth;
        
        // Appliquer l'alpha global
        color[3] *= this.globalAlpha;
        
        // Calculer le vecteur de la ligne
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        // Normaliser
        const nx = -dy / length;
        const ny = dx / length;
        
        const halfWidth = lineWidth / 2;
        
        // Créer un quadrilatère pour la ligne
        const vertices = new Float32Array([
            x1 + nx * halfWidth, y1 + ny * halfWidth,
            x1 - nx * halfWidth, y1 - ny * halfWidth,
            x2 + nx * halfWidth, y2 + ny * halfWidth,
            x2 - nx * halfWidth, y2 - ny * halfWidth
        ]);
        
        const colors = new Float32Array([
            ...color, ...color, ...color, ...color
        ]);
        
        const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
        
        this._drawTriangles(vertices, colors, indices, matrix);
    }

    /**
     * Rendu de texte
     * @private
     */
    _renderText(text, x, y, maxWidth, type) {
        // Pour une implémentation complète, il faudrait :
        // 1. Générer une texture atlas de caractères
        // 2. Utiliser un shader de texte
        // 3. Dessiner chaque caractère
        
        // Pour l'instant, on utilise un canvas 2D temporaire
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Configurer le contexte temporaire
        tempCtx.font = this.font;
        tempCtx.textAlign = this.textAlign;
        tempCtx.textBaseline = this.textBaseline;
        
        // Dessiner le texte
        if (type === 'fill') {
            tempCtx.fillStyle = this.fillStyle;
            tempCtx.fillText(text, 0, 0, maxWidth);
        } else {
            tempCtx.strokeStyle = this.strokeStyle;
            tempCtx.lineWidth = this.lineWidth;
            tempCtx.strokeText(text, 0, 0, maxWidth);
        }
        
        // Obtenir les dimensions
        const metrics = tempCtx.measureText(text);
        const width = metrics.width;
        const height = parseInt(this.font) || 16;
        
        // Ajuster la position selon textAlign et textBaseline
        let drawX = x;
        let drawY = y;
        
        switch (this.textAlign) {
            case 'center':
                drawX -= width / 2;
                break;
            case 'right':
            case 'end':
                drawX -= width;
                break;
        }
        
        switch (this.textBaseline) {
            case 'top':
            case 'hanging':
                drawY += height * 0.8;
                break;
            case 'middle':
                drawY += height / 2;
                break;
            case 'bottom':
                drawY -= height * 0.2;
                break;
        }
        
        // Dessiner l'image générée
        this.drawImage(tempCanvas, drawX, drawY, width, height);
    }

    /**
     * Dessine des triangles
     * @private
     */
    _drawTriangles(vertices, colors, indices, matrix) {
        const gl = this.gl;
        const program = this._programs.basic;
        console.log('_drawTriangles called:', {
        vertices: '[' + Array.from(vertices).slice(0, 8).join(', ') + '...]',
        colorsRGBA: Array.from(colors).slice(0, 4), // Affiche R,G,B,A
        colorHex: this._rgbaToHex(Array.from(colors).slice(0, 4)),
        indices: Array.from(indices),
        screenCoords: `Rect at (${vertices[0]}, ${vertices[1]}) to (${vertices[4]}, ${vertices[5]})`
    });
        if (!program) {
            console.error('Basic shader program not compiled!');
            return;
        }
        
        gl.useProgram(program);
        
        // 1. POSITIONS - utiliser le buffer existant
        const positionBuffer = this._buffers.get('position');
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        
        const positionAttr = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionAttr);
        gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);
        
        // 2. COULEURS - utiliser le buffer existant
        const colorBuffer = this._buffers.get('color');
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
        
        const colorAttr = gl.getAttribLocation(program, 'a_color');
        gl.enableVertexAttribArray(colorAttr);
        gl.vertexAttribPointer(colorAttr, 4, gl.FLOAT, false, 0, 0);
        
        // 3. INDICES - utiliser le buffer existant
        const indexBuffer = this._buffers.get('indices');
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
        
        // 4. MATRICE
        const matrixUniform = gl.getUniformLocation(program, 'u_matrix');
        if (matrixUniform) {
            const m = matrix || [1, 0, 0, 1, 0, 0];
            gl.uniformMatrix3fv(matrixUniform, false, new Float32Array([
                m[0], m[1], 0,
                m[2], m[3], 0,
                m[4], m[5], 1
            ]));
        }
        
        // 5. RÉSOLUTION
        const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
        if (resolutionUniform) {
            gl.uniform2f(resolutionUniform, this.width, this.height);
        }
        
        // 6. DESSINER
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        
        // Vérifier les erreurs
        this.checkGLError('drawTriangles');
    }
	
	// Ajoutez cette méthode utilitaire
	_rgbaToHex(rgba) {
		const [r, g, b, a] = rgba;
		const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
		return `#${toHex(r)}${toHex(g)}${toHex(b)} (alpha: ${a.toFixed(2)})`;
	}

    /**
     * Dessine un quadrilatère texturé
     * @private
     */
    _drawTexturedQuad(vertices, texCoords, texture, matrix) {
        const gl = this.gl;
        const program = this._programs.image;
        
        gl.useProgram(program);
        
        // Upload vertices
        const positionBuffer = this._buffers.get('position');
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        
        const positionAttr = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionAttr);
        gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);
        
        // Upload texture coordinates
        const texcoordBuffer = this._buffers.get('texcoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STREAM_DRAW);
        
        const texcoordAttr = gl.getAttribLocation(program, 'a_texcoord');
        gl.enableVertexAttribArray(texcoordAttr);
        gl.vertexAttribPointer(texcoordAttr, 2, gl.FLOAT, false, 0, 0);
        
        // Set texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const textureUniform = gl.getUniformLocation(program, 'u_texture');
        gl.uniform1i(textureUniform, 0);
        
        // Set matrix
        const matrixUniform = gl.getUniformLocation(program, 'u_matrix');
        gl.uniformMatrix3fv(matrixUniform, false, new Float32Array([
            matrix[0], matrix[1], 0,
            matrix[2], matrix[3], 0,
            matrix[4], matrix[5], 1
        ]));
        
        // Set alpha
        const alphaUniform = gl.getUniformLocation(program, 'u_alpha');
        gl.uniform1f(alphaUniform, this.globalAlpha);
        
        // Draw as triangle strip
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Remplit un polygone
     * @private
     */
    _fillPolygon(points) {
        // Pour une implémentation complète, utiliser une librairie de triangulation
        // Ici, dessin simple pour démonstration
        const gl = this.gl;
        
        if (points.length < 6) return;
        
        // Convertir en vertices
        const vertices = new Float32Array(points);
        
        // Générer des indices pour triangulation simple
        const indices = [];
        for (let i = 1; i < points.length / 2 - 1; i++) {
            indices.push(0, i, i + 1);
        }
        
        const indexArray = new Uint16Array(indices);
        
        // Couleur de remplissage
        const color = this._parseColor(this.fillStyle);
        color[3] *= this.globalAlpha;
        
        const colors = new Float32Array(points.length / 2 * 4);
        for (let i = 0; i < points.length / 2; i++) {
            colors[i * 4] = color[0];
            colors[i * 4 + 1] = color[1];
            colors[i * 4 + 2] = color[2];
            colors[i * 4 + 3] = color[3];
        }
        
        // Dessiner
        this._drawTriangles(vertices, colors, indexArray, this._getCurrentMatrix());
    }

    /**
     * Rend un dégradé
     * @private
     */
    _renderGradient(gradientId) {
        // Implémentation simplifiée - retourne la première couleur
        const gradient = this._gradients.get(gradientId);
        if (gradient && gradient.stops.length > 0) {
            return this._parseColor(gradient.stops[0].color);
        }
        return [0, 0, 0, 1];
    }

    // ===== MÉTHODES DE GESTION DU CONTEXTE =====

    /**
     * Met à jour la matrice de projection pour le DPR
     */
    updateProjectionMatrix() {
        const gl = this.gl;
        
        // La matrice de projection met à l'échelle selon le DPR
        const scaleX = 2 / this.width * this.dpr;
        const scaleY = -2 / this.height * this.dpr; // Inverser l'axe Y
        
        // Pour le shader, nous ajoutons une transformation de base
        // qui convertit des coordonnées pixels en coordonnées NDC
        this._baseMatrix = [
            scaleX, 0, 0,
            0, scaleY, 0,
            -1, 1, 1
        ];
    }

    /**
     * Efface tout le canvas
     */
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    /**
     * Redimensionne le canvas
     * @param {number} width - Nouvelle largeur
     * @param {number} height - Nouvelle hauteur
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width * this.dpr;
        this.canvas.height = height * this.dpr;
        this.gl.viewport(0, 0, width * this.dpr, height * this.dpr);
        this.updateProjectionMatrix();
    }

    /**
     * Libère les ressources WebGL
     */
    dispose() {
        const gl = this.gl;
        
        // Supprimer les textures
        this._textures.forEach(texture => {
            gl.deleteTexture(texture);
        });
        this._textures.clear();
        
        // Supprimer les buffers
        this._buffers.forEach(buffer => {
            gl.deleteBuffer(buffer);
        });
        this._buffers.clear();
        
        // Supprimer les programmes
        Object.values(this._programs).forEach(program => {
            if (program) gl.deleteProgram(program);
        });
        
        // Vider les autres ressources
        this._gradients.clear();
        this._shaders.clear();
    }

    // ===== MÉTHODES DE COMPATIBILITÉ CANVAS 2D =====

    /**
     * Interface CanvasRenderingContext2D complète
     * Certaines méthodes sont des no-ops pour la compatibilité
     */
    setLineDash() {} // À implémenter si besoin
    getLineDash() { return []; }
    getImageData() { return { data: new Uint8ClampedArray(0), width: 0, height: 0 }; }
    putImageData() {}
    createImageData() { return { data: new Uint8ClampedArray(0), width: 0, height: 0 }; }
    createPattern() { return {}; }
    isPointInPath() { return false; }
    isPointInStroke() { return false; }
    clip() {}
    resetClip() {}
    getContextAttributes() { return this.options; }
}

export default WebGLCanvasAdapter;
