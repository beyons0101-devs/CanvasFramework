import Component from '../core/Component.js';

/**
 * Composant OpenStreetMap pour Canvas avec pan, zoom, multi-touch et markers.
 * @class
 * @extends Component
 * @property {number} lat - Latitude du centre de la carte
 * @property {number} lng - Longitude du centre de la carte
 * @property {number} zoom - Niveau de zoom initial
 * @property {number} tileSize - Taille des tuiles en pixels
 * @property {Object} tiles - Cache des tuiles { "z_x_y": {img: Image, loaded: boolean} }
 * @property {number} offsetX - Décalage X pour le drag
 * @property {number} offsetY - Décalage Y pour le drag
 * @property {boolean} dragging - Si le drag est actif
 * @property {Object|null} lastTouch - Dernier point de touch/mouse {x, y}
 * @property {number} velocityX - Vitesse de glissement X pour inertie
 * @property {number} velocityY - Vitesse de glissement Y pour inertie
 * @property {number} friction - Friction pour inertie
 * @property {number} inertiaThreshold - Seuil minimal pour l'inertie
 * @property {Array} markers - Liste des markers {lat, lng, icon}
 * @property {number} maxZoom - Zoom max
 * @property {number} minZoom - Zoom min
 * @property {number|null} lastTouchDistance - Distance entre deux touches pour pinch zoom
 */
class OpenStreetMap extends Component {
  /**
   * Crée une instance de OpenStreetMap
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {number} [options.lat=0] - Latitude initiale
   * @param {number} [options.lng=0] - Longitude initiale
   * @param {number} [options.zoom=2] - Niveau de zoom initial
   * @param {number} [options.tileSize=256] - Taille des tuiles
   * @param {Array} [options.markers=[]] - Liste de markers {lat, lng, icon}
   */
  constructor(framework, options = {}) {
    super(framework, options);

	this.x = options.x || 0;
	this.y = options.y || 0;
	this.width = options.width || framework.canvas.width;
	this.height = options.height || framework.canvas.height;
  
    this.lat = options.lat || 0;
    this.lng = options.lng || 0;
    this.zoom = options.zoom || 2;
    this.tileSize = options.tileSize || 256;
    this.tiles = {};

    this.offsetX = 0;
    this.offsetY = 0;
    this.dragging = false;
    this.lastTouch = null;

    this.velocityX = 0;
    this.velocityY = 0;
    this.friction = 0.92;
    this.inertiaThreshold = 0.1;

    this.markers = options.markers || [];
    this.maxZoom = 19;
    this.minZoom = 1;

    this.lastTouchDistance = null;

    // Événements souris
    framework.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    framework.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    framework.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Événements tactiles
    framework.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    framework.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    framework.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  /**
   * Convertit lat/lng en coordonnées de tuiles
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} zoom - Niveau de zoom
   * @returns {Object} {x, y} coordonnées de la tuile
   */
  latLngToTileXY(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const x = n * ((lng + 180) / 360);
    const latRad = lat * Math.PI / 180;
    const y = n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2;
    return { x, y };
  }

  /**
   * Convertit coordonnées de tuiles en lat/lng
   * @param {number} x - Coordonnée X de la tuile
   * @param {number} y - Coordonnée Y de la tuile
   * @param {number} zoom - Niveau de zoom
   * @returns {Object} {lat, lng}
   */
  tileXYToLatLng(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lat, lng };
  }

  /**
   * Charge une tuile OpenStreetMap
   * @param {number} z - Zoom
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {Object} {img: Image, loaded: boolean}
   */
  loadTile(z, x, y) {
    const key = `${z}_${x}_${y}`;
    if (this.tiles[key]) return this.tiles[key];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    this.tiles[key] = { img, loaded: false };
    img.onload = () => { this.tiles[key].loaded = true; this.framework.markComponentDirty(this); };
    return this.tiles[key];
  }

  /**
   * Dessine la carte et les markers
   * @param {CanvasRenderingContext2D} ctx - Contexte Canvas
   */
   draw(ctx) {
	  ctx.save();

	  // CORRECTION : Arrondir le zoom pour les tuiles
	  const zoomLevel = Math.floor(this.zoom);
	  
	  const { x: tileX, y: tileY } = this.latLngToTileXY(this.lat, this.lng, zoomLevel);
	  const tilesX = Math.ceil(this.width / this.tileSize) + 2;
	  const tilesY = Math.ceil(this.height / this.tileSize) + 2;
	  const startX = Math.floor(tileX - tilesX / 2);
	  const startY = Math.floor(tileY - tilesY / 2);

	  for (let dx = 0; dx < tilesX; dx++) {
		for (let dy = 0; dy < tilesY; dy++) {
		  const tx = startX + dx;
		  const ty = startY + dy;
		  
		  // Utiliser zoomLevel arrondi
		  const tile = this.loadTile(zoomLevel, tx, ty);
		  const px = (tx - tileX) * this.tileSize + this.width / 2 + this.offsetX;
		  const py = (ty - tileY) * this.tileSize + this.height / 2 + this.offsetY;

		  if (tile.loaded) {
			ctx.drawImage(tile.img, px, py, this.tileSize, this.tileSize);
		  } else {
			ctx.fillStyle = '#E0E0E0';
			ctx.fillRect(px, py, this.tileSize, this.tileSize);
		  }
		}
	  }

	  // Dessiner les markers avec le zoom arrondi aussi
	  for (let marker of this.markers) {
		const { x, y } = this.latLngToTileXY(marker.lat, marker.lng, zoomLevel);
		const screenX = (x - tileX) * this.tileSize + this.width / 2 + this.offsetX;
		const screenY = (y - tileY) * this.tileSize + this.height / 2 + this.offsetY;

		if (marker.icon) {
		  ctx.drawImage(marker.icon, screenX - marker.icon.width / 2, screenY - marker.icon.height, marker.icon.width, marker.icon.height);
		} else {
		  ctx.fillStyle = 'red';
		  ctx.beginPath();
		  ctx.arc(screenX, screenY, 6, 0, 2 * Math.PI);
		  ctx.fill();
		}
	  }

	  ctx.restore();
	  this.updateInertia();
  }

  /** @private */
  handleDragStart(x, y) {
    this.dragging = true;
    this.lastTouch = { x, y };
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /** @private */
  handleDragMove(x, y) {
    if (!this.dragging) return;
    const dx = x - this.lastTouch.x;
    const dy = y - this.lastTouch.y;
    this.offsetX += dx;
    this.offsetY += dy;
    this.velocityX = dx;
    this.velocityY = dy;
    this.lastTouch = { x, y };
    this.framework.markComponentDirty(this);
  }

  /** @private */
  handleDragEnd() {
    this.dragging = false;
  }

  /** @private */
  updateInertia() {
    if (!this.dragging && (Math.abs(this.velocityX) > this.inertiaThreshold || Math.abs(this.velocityY) > this.inertiaThreshold)) {
      this.offsetX += this.velocityX;
      this.offsetY += this.velocityY;
      this.velocityX *= this.friction;
      this.velocityY *= this.friction;
      this.framework.markComponentDirty(this);
    } else {
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  /** @private */
  updateCenter() {
    const { x: tileX, y: tileY } = this.latLngToTileXY(this.lat, this.lng, this.zoom);
    const newTileX = tileX - this.offsetX / this.tileSize;
    const newTileY = tileY - this.offsetY / this.tileSize;
    const { lat, lng } = this.tileXYToLatLng(newTileX, newTileY, this.zoom);
    this.lat = lat;
    this.lng = lng;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /** @param {MouseEvent} e */
  onMouseDown(e) { this.handleDragStart(e.clientX, e.clientY); }

  /** @param {MouseEvent} e */
  onMouseMove(e) { this.handleDragMove(e.clientX, e.clientY); }

  /** @param {MouseEvent} e */
  onMouseUp(e) { this.handleDragEnd(); this.updateCenter(); }

  /** @param {TouchEvent} e */
  onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.handleDragStart(t.clientX, t.clientY);
    } else if (e.touches.length === 2) {
      this.lastTouchDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
    }
  }

  /** @param {TouchEvent} e */
  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.handleDragMove(t.clientX, t.clientY);
    } else if (e.touches.length === 2) {
      const newDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
      if (this.lastTouchDistance) {
        const zoomChange = Math.log2(newDistance / this.lastTouchDistance);
        this.zoom += zoomChange;
        this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom));
        this.lastTouchDistance = newDistance;
        this.framework.markComponentDirty(this);
      }
    }
  }

  /** @param {TouchEvent} e */
  onTouchEnd(e) {
    e.preventDefault();
    this.handleDragEnd();
    this.updateCenter();
    this.lastTouchDistance = null;
  }

  /**
   * Calcule la distance entre deux touches
   * @param {Touch} t1 
   * @param {Touch} t2 
   * @returns {number} distance en pixels
   */
  getTouchDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  /**
   * Vérifie si un point est dans le composant
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean}
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
  }

  /**
   * Ajoute un marker à la carte
   * @param {Object} marker - {lat, lng, icon}
   */
  addMarker(marker) {
    this.markers.push(marker);
    this.framework.markComponentDirty(this);
  }
}

export default OpenStreetMap;
