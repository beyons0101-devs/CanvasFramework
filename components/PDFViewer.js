import Component from '../core/Component.js';

/**
 * Lecteur PDF entièrement dessiné sur Canvas.
 * Gère ses propres événements natifs (click, wheel, mouse, touch)
 * directement sur le canvas — aucune dépendance au framework pour les interactions.
 *
 * @class
 * @extends Component
 */
class PDFViewer extends Component {

  /**
   * @param {CanvasFramework} framework
   * @param {Object} [options={}]
   * @param {string|Uint8Array} [options.src]
   * @param {number}  [options.initialPage=1]
   * @param {number}  [options.initialScale=1.0]
   * @param {boolean} [options.showToolbar=true]
   * @param {boolean} [options.showThumbnails=false]
   * @param {boolean} [options.allowZoom=true]        - Boutons zoom
   * @param {boolean} [options.allowNavigation=true]  - Prev/next (masqué si 1 page)
   * @param {boolean} [options.allowDownload=true]
   * @param {boolean} [options.allowPrint=true]
   * @param {boolean} [options.allowRotate=true]
   * @param {boolean} [options.allowSearch=true]
   * @param {number}  [options.minScale=0.25]
   * @param {number}  [options.maxScale=5.0]
   * @param {string}  [options.backgroundColor]
   * @param {string}  [options.primaryColor]
   * @param {string}  [options.pageBackground='#FFFFFF']
   * @param {Function} [options.onPageChange]
   * @param {Function} [options.onScaleChange]
   * @param {Function} [options.onLoad]
   * @param {Function} [options.onError]
   */
  constructor(framework, options = {}) {
    super(framework, options);

    this.platform        = framework.platform;
    this.src             = options.src || null;
    this.currentPage     = options.initialPage || 1;
    this.totalPages      = 0;
    this.scale           = options.initialScale || 1.0;
    this.rotation        = 0;
    this.loading         = false;
    this.error           = null;

    this.showToolbar     = options.showToolbar     !== false;
    this.showThumbnails  = options.showThumbnails  || false;
    this.allowZoom       = options.allowZoom       !== false;
    this.allowNavigation = options.allowNavigation !== false;
    this.allowDownload   = options.allowDownload   !== false;
    this.allowPrint      = options.allowPrint      !== false;
    this.allowRotate     = options.allowRotate     !== false;
    this.allowSearch     = options.allowSearch     !== false;
    this.minScale        = options.minScale        || 0.25;
    this.maxScale        = options.maxScale        || 5.0;
    this.backgroundColor = options.backgroundColor || null;
    this.primaryColor    = options.primaryColor    || null;
    this.pageBackground  = options.pageBackground  || '#FFFFFF';

    this.onPageChange  = options.onPageChange  || (() => {});
    this.onScaleChange = options.onScaleChange || (() => {});
    this.onLoad        = options.onLoad        || (() => {});
    this.onErrorCb     = options.onError       || (() => {});

    // Layout
    this._toolbarHeight = this.showToolbar    ? 52 : 0;
    this._thumbsWidth   = 110; // toujours réservé, affiché si totalPages > 1
    this._searchOpen    = false;
    this._searchQuery   = '';

    // PDF state
    this._pdfDoc      = null;
    this._pageImages  = {};
    this._thumbImages = {};

    // Viewer scroll
    this._scrollY     = 0;
    this._maxScrollY  = 0;

    // Drag scroll (mouse)
    this._dragging        = false;
    this._dragStartY      = 0;
    this._dragStartScroll = 0;

    // Touch scroll
    this._touchStartY   = 0;
    this._touchLastY    = 0;
    this._touchVelocity = 0;
    this._momentumRAF   = null;

    // Toolbar hit areas (rebuilt each draw)
    this._tbButtons      = [];
    this._pageInputRect  = null;
    this._retryBtn       = null;
    this._searchCloseRect= null;
    this._hoveredBtn     = null;

    // Spinner
    this._spinAngle = 0;
    this._spinRAF   = null;

    // Events
    this._eventsRegistered = false;
    this._boundHandlers    = {};

    // Mouse position tracking
    this._lastMouseX = 0;
    this._lastMouseY = 0;

    // Couleurs Material You 3
    this.m3Colors = {
      primary:          '#6750A4',
      onPrimary:        '#FFFFFF',
      surfaceVariant:   '#E7E0EC',
      onSurface:        '#1C1B1F',
      onSurfaceVariant: '#49454F',
      outline:          '#79747E',
      outlineVariant:   '#CAC4D0',
      error:            '#BA1A1A',
      viewerBg:         '#F7F2FA',
      thumbsBg:         '#EFE9F4',
      thumbBorder:      '#CAC4D0',
      thumbActive:      '#6750A4',
      pageShadow:       'rgba(0,0,0,0.15)',
    };

    // Couleurs Cupertino
    this.cupertinoColors = {
      primary:          '#007AFF',
      onPrimary:        '#FFFFFF',
      error:            '#FF3B30',
      toolbarBorder:    '#C6C6C8',
      viewerBg:         '#D1D1D6',
      thumbsBg:         '#F2F2F7',
      thumbBorder:      '#C6C6C8',
      thumbActive:      '#007AFF',
      pageShadow:       'rgba(0,0,0,0.15)',
      onSurfaceVariant: '#8E8E93',
      outlineVariant:   '#C6C6C8',
      outline:          '#C6C6C8',
    };

    if (this.src) this._loadPDF(this.src);
    this._startSpinner();
  }

  // ─── Couleurs & géométrie ────────────────────────────────────────────────────

  get _colors()  { return this.platform === 'material' ? this.m3Colors : this.cupertinoColors; }
  get _primary() { return this.primaryColor || this._colors.primary; }
  get _isMat()   { return this.platform === 'material'; }

  get _tbRect() {
    return { x: this.x, y: this.y, w: this.width, h: this._toolbarHeight };
  }
  get _sbRect() {
    return { x: this.x, y: this.y + this._toolbarHeight, w: this.width, h: this._searchOpen ? 44 : 0 };
  }
  get _activeThumbsWidth() { return this.totalPages > 1 ? this._thumbsWidth : 0; }
  get _viewerRect() {
    const top = this._toolbarHeight + this._sbRect.h;
    return { x: this.x + this._activeThumbsWidth, y: this.y + top, w: this.width - this._activeThumbsWidth, h: this.height - top };
  }
  get _thumbRect() {
    const top = this._toolbarHeight + this._sbRect.h;
    return { x: this.x, y: this.y + top, w: this._thumbsWidth, h: this.height - top };
  }

  // ─── Conversion événements → coordonnées canvas ──────────────────────────────

  _evtToXY(e) {
    const canvas = this.framework.canvas;
    const rect   = canvas.getBoundingClientRect();
    // Ratio CSS vs canvas réel
    const sx = canvas.width  / rect.width;
    const sy = canvas.height / rect.height;
    let cx, cy;
    if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    // On ajoute le scrollOffset du framework pour être en coordonnées "monde"
    const worldY = (cy - rect.top) * sy + (this.framework.scrollOffset || 0);
    return { x: (cx - rect.left) * sx, y: worldY };
  }

  _inSelf(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  _inViewer(x, y) {
    const v = this._viewerRect;
    return x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h;
  }

  // ─── Enregistrement des événements natifs (one-shot) ─────────────────────────

  _registerEvents() {
    if (this._eventsRegistered) return;
    this._eventsRegistered = true;
    const canvas = this.framework.canvas;

    // ── Mouse ──
    const onMouseDown = (e) => {
      const { x, y } = this._evtToXY(e);
      if (!this._inSelf(x, y)) return;
      
      // Vérifier si on clique sur la toolbar ou les miniatures
      const inToolbar = this.showToolbar && y >= this._tbRect.y && y <= this._tbRect.y + this._tbRect.h;
      const inThumbs = this.totalPages > 1 && x >= this._thumbRect.x && x <= this._thumbRect.x + this._thumbRect.w;
      
      if (inToolbar || inThumbs) {
        // Ne pas démarrer le drag pour les interactions toolbar/miniatures
        return;
      }
      
      if (this._inViewer(x, y)) {
        this._dragging = true;
        this._dragStartY = y;
        this._dragStartScroll = this._scrollY;
        if (this._momentumRAF) { 
          cancelAnimationFrame(this._momentumRAF); 
          this._momentumRAF = null; 
        }
      }
    };

    const onMouseMove = (e) => {
      const { x, y } = this._evtToXY(e);
      this._lastMouseX = x;
      this._lastMouseY = y;
      
      // Hover - toujours vérifier le survol
      if (this._inSelf(x, y)) {
        this._checkHover(x, y);
      } else if (this._hoveredBtn !== null) {
        this._hoveredBtn = null;
        this._redraw();
      }
      
      // Drag
      if (this._dragging) {
        this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._dragStartScroll + (this._dragStartY - y)));
        this._syncPage();
        this._redraw();
      }
    };

    const onMouseUp = () => { 
      this._dragging = false; 
    };

    const onMouseLeave = () => {
      this._dragging = false;
      this._hoveredBtn = null;
      this._redraw();
    };

    // ── Click ──
    const onClick = (e) => {
      const { x, y } = this._evtToXY(e);
      if (!this._inSelf(x, y)) return;
      this._handleClick(x, y);
    };

    // ── Wheel ──
    const onWheel = (e) => {
      const { x, y } = this._evtToXY(e);
      if (!this._inSelf(x, y)) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (e.ctrlKey || e.metaKey) {
        // Zoom avec Ctrl+molette
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this._setScale(this.scale + delta);
      } else {
        // Scroll normal
        if (this._inViewer(x, y)) {
          this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._scrollY + e.deltaY));
          this._syncPage();
          this._redraw();
        }
      }
    };

    // ── Touch ──
    const onTouchStart = (e) => {
      const { x, y } = this._evtToXY(e);
      if (!this._inSelf(x, y)) return;
      
      // Vérifier si on touche la toolbar ou les miniatures
      const inToolbar = this.showToolbar && y >= this._tbRect.y && y <= this._tbRect.y + this._tbRect.h;
      const inThumbs = this.totalPages > 1 && x >= this._thumbRect.x && x <= this._thumbRect.x + this._thumbRect.w;
      
      if (inToolbar || inThumbs) {
        return;
      }
      
      if (this._inViewer(x, y)) {
        this._dragging = true;
        this._touchStartY = y;
        this._touchLastY = y;
        this._touchVelocity = 0;
        this._dragStartScroll = this._scrollY;
        if (this._momentumRAF) { 
          cancelAnimationFrame(this._momentumRAF); 
          this._momentumRAF = null; 
        }
        e.preventDefault();
      }
    };

    const onTouchMove = (e) => {
      if (!this._dragging) return;
      const { y } = this._evtToXY(e);
      this._touchVelocity = this._touchLastY - y;
      this._touchLastY = y;
      this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._dragStartScroll + (this._touchStartY - y)));
      this._syncPage();
      this._redraw();
      e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      
      // Vérifier si c'était un tap (pas de mouvement)
      if (Math.abs(this._touchVelocity) < 0.5) {
        const { x, y } = this._evtToXY(e);
        this._handleClick(x, y);
        return;
      }
      
      // Momentum
      let v = this._touchVelocity;
      const momentum = () => {
        if (Math.abs(v) < 0.5) return;
        this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._scrollY + v));
        v *= 0.92;
        this._syncPage();
        this._redraw();
        this._momentumRAF = requestAnimationFrame(momentum);
      };
      this._momentumRAF = requestAnimationFrame(momentum);
    };

    // Ajout des écouteurs
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click',      onClick);
    canvas.addEventListener('wheel',      onWheel,      { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    this._boundHandlers = { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onClick, onWheel, onTouchStart, onTouchMove, onTouchEnd };
  }

  _checkHover(x, y) {
    let hover = null;
    
    // Vérifier les boutons de la toolbar
    for (const b of this._tbButtons) {
      if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { 
        hover = b.id; 
        break; 
      }
    }
    
    // Vérifier le bouton de fermeture de recherche
    if (this._searchCloseRect && !hover) {
      const r = this._searchCloseRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        hover = 'searchClose';
      }
    }
    
    // Vérifier le bouton de réessai
    if (this._retryBtn && !hover) {
      const r = this._retryBtn;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        hover = 'retry';
      }
    }
    
    if (hover !== this._hoveredBtn) { 
      this._hoveredBtn = hover; 
      this._redraw(); 
    }
  }

  _redraw() {
    if (this.framework && this.framework.redraw) this.framework.redraw();
  }

  // ─── Spinner ─────────────────────────────────────────────────────────────────

  _startSpinner() {
    const tick = () => {
      if (this.loading) { 
        this._spinAngle = (this._spinAngle + 0.08) % (Math.PI * 2); 
        this._redraw(); 
      }
      this._spinRAF = requestAnimationFrame(tick);
    };
    this._spinRAF = requestAnimationFrame(tick);
  }

  // ─── Chargement PDF.js ───────────────────────────────────────────────────────

  async _loadPDFJS() {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error('Impossible de charger PDF.js'));
      document.head.appendChild(s);
    });
  }

  async _loadPDF(src) {
    this.loading      = true;
    this.error        = null;
    this._pageImages  = {};
    this._thumbImages = {};
    this._scrollY     = 0;
    this._redraw();
    try {
      const lib  = await this._loadPDFJS();
      const task = lib.getDocument(typeof src === 'string' ? src : { data: src });
      this._pdfDoc    = await task.promise;
      this.totalPages = this._pdfDoc.numPages;
      
      // Charger les pages de manière asynchrone sans bloquer
      const loadPromises = [];
      for (let p = 1; p <= this.totalPages; p++) {
        loadPromises.push(this._renderPage(p));
        loadPromises.push(this._renderThumb(p));
      }
      
      await Promise.all(loadPromises);
      
      this.loading = false;
      this._computeMaxScroll();
      this.onLoad(this.totalPages);
      this._redraw();
    } catch (err) {
      this.loading = false;
      this.error   = err.message || 'Erreur de chargement';
      this.onErrorCb(this.error);
      this._redraw();
    }
  }

  async _renderPage(p) {
    try {
      const page = await this._pdfDoc.getPage(p);
      const vp   = page.getViewport({ scale: this.scale, rotation: this.rotation });
      const off  = new OffscreenCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
      await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;
      this._pageImages[p] = await createImageBitmap(off);
    } catch (err) {
      console.error(`Erreur rendu page ${p}:`, err);
    }
  }

  async _renderThumb(p) {
    try {
      const page = await this._pdfDoc.getPage(p);
      const vp   = page.getViewport({ scale: 0.18, rotation: this.rotation });
      const off  = new OffscreenCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
      await page.render({ canvasContext: off.getContext('2d'), viewport: vp }).promise;
      this._thumbImages[p] = await createImageBitmap(off);
    } catch (err) {
      console.error(`Erreur rendu miniature ${p}:`, err);
    }
  }

  async _reRenderAll() {
    if (!this._pdfDoc) return;
    this._pageImages = {}; 
    this._thumbImages = {};
    this.loading = true; 
    this._redraw();
    
    const loadPromises = [];
    for (let p = 1; p <= this.totalPages; p++) {
      loadPromises.push(this._renderPage(p));
      loadPromises.push(this._renderThumb(p));
    }
    
    await Promise.all(loadPromises);
    
    this.loading = false;
    this._computeMaxScroll();
    this._scrollY = Math.min(this._scrollY, this._maxScrollY);
    this._redraw();
  }

  // ─── Layout & scroll ─────────────────────────────────────────────────────────

  _computeMaxScroll() {
    const vr = this._viewerRect;
    let total = 16;
    for (let p = 1; p <= this.totalPages; p++) {
      total += (this._pageImages[p] ? this._pageImages[p].height : 200) + 16;
    }
    this._maxScrollY = Math.max(0, total - vr.h);
  }

  _pageScrollOffset(pageNum) {
    let y = 16;
    for (let p = 1; p < pageNum; p++) {
      y += (this._pageImages[p] ? this._pageImages[p].height : 200) + 16;
    }
    return y;
  }

  _syncPage() {
    if (!this.totalPages) return;
    const mid = this._scrollY + this._viewerRect.h / 2;
    let y = 16;
    for (let p = 1; p <= this.totalPages; p++) {
      const h = this._pageImages[p] ? this._pageImages[p].height : 200;
      if (mid <= y + h || p === this.totalPages) {
        if (p !== this.currentPage) { 
          this.currentPage = p; 
          this.onPageChange(p, this.totalPages); 
        }
        return;
      }
      y += h + 16;
    }
  }

  // ─── Dessin principal ────────────────────────────────────────────────────────

  draw(ctx) {
    this._registerEvents(); // one-shot

    ctx.save();
    // Clip global
    ctx.beginPath();
    this._rr(ctx, this.x, this.y, this.width, this.height, this._isMat ? 4 : 12);
    ctx.clip();

    // Fond
    ctx.fillStyle = this.backgroundColor || this._colors.viewerBg;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if (this.totalPages > 1) this._drawThumbs(ctx);
    this._drawViewer(ctx);
    if (this.showToolbar)    this._drawToolbar(ctx);
    if (this._searchOpen)    this._drawSearchBar(ctx);

    // Bordure
    ctx.strokeStyle = this._isMat ? 'rgba(0,0,0,0.12)' : (this._colors.toolbarBorder || '#C6C6C8');
    ctx.lineWidth   = 1;
    ctx.beginPath();
    this._rr(ctx, this.x, this.y, this.width, this.height, this._isMat ? 4 : 12);
    ctx.stroke();

    ctx.restore();
    
    // Restaurer le hover pour le prochain frame
    if (this._hoveredBtn && this._inSelf(this._lastMouseX, this._lastMouseY)) {
      // Le hover sera redessiné au prochain move
    }
  }

  // ─── Zone viewer ─────────────────────────────────────────────────────────────

  _drawViewer(ctx) {
    const vr = this._viewerRect;
    ctx.save();
    ctx.beginPath(); ctx.rect(vr.x, vr.y, vr.w, vr.h); ctx.clip();
    ctx.fillStyle = this._colors.viewerBg;
    ctx.fillRect(vr.x, vr.y, vr.w, vr.h);

    const hasImages = Object.keys(this._pageImages).length > 0;
    if      (this.loading && !hasImages)               this._drawLoading(ctx, vr);
    else if (this.error   && !hasImages)               this._drawError(ctx, vr);
    else if (!this.totalPages && !this.loading)        this._drawEmpty(ctx, vr);
    else                                               this._drawPages(ctx, vr);

    ctx.restore();
  }

  _drawPages(ctx, vr) {
    const pad = 16;
    let y = vr.y + pad - this._scrollY;

    for (let p = 1; p <= this.totalPages; p++) {
      const img = this._pageImages[p];
      const ph  = img ? img.height : 200;
      // Largeur : on respecte la vraie largeur de la page rendue, mais on ne dépasse pas le viewer
      const pw  = img ? Math.min(img.width, vr.w - pad * 2) : vr.w - pad * 2;
      const px  = vr.x + (vr.w - pw) / 2;

      // Dessin uniquement si la page est dans la zone visible
      if (y + ph >= vr.y && y <= vr.y + vr.h) {
        ctx.shadowColor   = this._colors.pageShadow;
        ctx.shadowBlur    = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle     = this.pageBackground;
        ctx.fillRect(px, y, pw, ph);
        ctx.shadowBlur = 0; 
        ctx.shadowOffsetY = 0;

        if (img) {
          ctx.drawImage(img, 0, 0, img.width, img.height, px, y, pw, ph);
        } else {
          ctx.fillStyle = '#ccc'; 
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'center'; 
          ctx.textBaseline = 'middle';
          ctx.fillText(`Page ${p}…`, px + pw / 2, y + ph / 2);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.28)'; 
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right'; 
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${p} / ${this.totalPages}`, px + pw - 6, y + ph - 4);
      }

      y += ph + pad;
    }

    this._drawScrollbar(ctx, vr);
  }

  _drawScrollbar(ctx, vr) {
    if (this._maxScrollY <= 0) return;
    const tw = 5, tr = 3;
    const tx = vr.x + vr.w - tw - 3;
    const ty = vr.y + 4, th = vr.h - 8;
    const ratio  = vr.h / (vr.h + this._maxScrollY);
    const thumbH = Math.max(24, th * ratio);
    const thumbY = ty + (this._scrollY / this._maxScrollY) * (th - thumbH);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; 
    this._rr(ctx, tx, ty, tw, th, tr); 
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; 
    this._rr(ctx, tx, thumbY, tw, thumbH, tr); 
    ctx.fill();
  }

  // ─── États visuels ───────────────────────────────────────────────────────────

  _drawLoading(ctx, vr) {
    const cx = vr.x + vr.w / 2, cy = vr.y + vr.h / 2 - 20;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; 
    ctx.lineWidth = 4;
    ctx.beginPath(); 
    ctx.arc(cx, cy, 22, 0, Math.PI * 2); 
    ctx.stroke();
    ctx.strokeStyle = this._primary; 
    ctx.lineWidth = 4; 
    ctx.lineCap = 'round';
    ctx.beginPath(); 
    ctx.arc(cx, cy, 22, this._spinAngle, this._spinAngle + 1.3); 
    ctx.stroke();
    ctx.fillStyle = this._colors.onSurfaceVariant || '#49454F';
    ctx.font = '13px sans-serif'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Chargement...', cx, cy + 32);
  }

  _drawEmpty(ctx, vr) {
    const cx = vr.x + vr.w / 2, cy = vr.y + vr.h / 2 - 20;
    ctx.globalAlpha = 0.35; 
    ctx.fillStyle = this._colors.onSurfaceVariant || '#49454F';
    ctx.beginPath();
    const fx = cx - 20, fy = cy - 26;
    ctx.moveTo(fx + 6, fy); 
    ctx.lineTo(fx + 28, fy); 
    ctx.lineTo(fx + 40, fy + 14);
    ctx.lineTo(fx + 40, fy + 54); 
    ctx.quadraticCurveTo(fx + 40, fy + 58, fx + 36, fy + 58);
    ctx.lineTo(fx + 4, fy + 58); 
    ctx.quadraticCurveTo(fx, fy + 58, fx, fy + 54);
    ctx.lineTo(fx, fy + 6); 
    ctx.quadraticCurveTo(fx, fy, fx + 6, fy);
    ctx.closePath(); 
    ctx.fill();
    ctx.globalAlpha = 1; 
    ctx.fillStyle = this._colors.onSurfaceVariant || '#49454F';
    ctx.font = '13px sans-serif'; 
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'top';
    ctx.fillText('Aucun document chargé', cx, cy + 42);
  }

  _drawError(ctx, vr) {
    const cx = vr.x + vr.w / 2, cy = vr.y + vr.h / 2 - 30;
    const err = this._colors.error || '#BA1A1A';
    ctx.fillStyle = err; 
    ctx.beginPath(); 
    ctx.arc(cx, cy, 24, 0, Math.PI * 2); 
    ctx.fill();
    ctx.fillStyle = '#fff'; 
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle'; 
    ctx.fillText('!', cx, cy);
    ctx.fillStyle = err; 
    ctx.font = '13px sans-serif'; 
    ctx.textBaseline = 'top';
    ctx.fillText((this.error || 'Erreur').substring(0, 60), cx, cy + 34);
    const bx = cx - 48, by = cy + 62;
    this._retryBtn = { x: bx, y: by, w: 96, h: 30 };
    
    // Hover effect
    if (this._hoveredBtn === 'retry') {
      ctx.fillStyle = this._primary + 'dd';
    } else {
      ctx.fillStyle = this._primary;
    }
    this._rr(ctx, bx, by, 96, 30, this._isMat ? 15 : 8); 
    ctx.fill();
    ctx.fillStyle = '#fff'; 
    ctx.font = '13px sans-serif'; 
    ctx.textBaseline = 'middle';
    ctx.fillText('Réessayer', cx, by + 15);
  }

  // ─── Miniatures ──────────────────────────────────────────────────────────────

  _drawThumbs(ctx) {
    const tr = this._thumbRect;
    ctx.fillStyle = this._colors.thumbsBg; 
    ctx.fillRect(tr.x, tr.y, tr.w, tr.h);
    ctx.strokeStyle = this._colors.thumbBorder; 
    ctx.lineWidth = 1;
    ctx.beginPath(); 
    ctx.moveTo(tr.x + tr.w, tr.y); 
    ctx.lineTo(tr.x + tr.w, tr.y + tr.h); 
    ctx.stroke();

    ctx.save(); 
    ctx.beginPath(); 
    ctx.rect(tr.x, tr.y, tr.w, tr.h); 
    ctx.clip();
    let ty = tr.y + 8;
    for (let p = 1; p <= this.totalPages; p++) {
      const img = this._thumbImages[p];
      const tw  = tr.w - 16;
      const th  = img ? Math.round(img.height * tw / img.width) : 70;
      const tx  = tr.x + 8;
      if (ty + th > tr.y && ty < tr.y + tr.h) {
        const active = p === this.currentPage;
        ctx.strokeStyle = active ? this._colors.thumbActive : this._colors.thumbBorder;
        ctx.lineWidth   = active ? 2 : 1;
        this._rr(ctx, tx, ty, tw, th, 3);
        if (img) { 
          ctx.drawImage(img, tx, ty, tw, th); 
          ctx.stroke(); 
        }
        else { 
          ctx.fillStyle = '#fff'; 
          ctx.fill(); 
          ctx.stroke(); 
        }
        ctx.fillStyle = '#666'; 
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'top';
        ctx.fillText(p, tx + tw / 2, ty + th + 2);
      }
      ty += th + 18;
    }
    ctx.restore();
  }

  // ─── Toolbar ─────────────────────────────────────────────────────────────────

  _drawToolbar(ctx) {
    const tb = this._tbRect;
    ctx.fillStyle = this._primary; 
    ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
    if (!this._isMat) {
      ctx.strokeStyle = this._colors.toolbarBorder || '#C6C6C8'; 
      ctx.lineWidth = 1;
      ctx.beginPath(); 
      ctx.moveTo(tb.x, tb.y + tb.h); 
      ctx.lineTo(tb.x + tb.w, tb.y + tb.h); 
      ctx.stroke();
    }

    ctx.save(); 
    ctx.beginPath(); 
    ctx.rect(tb.x, tb.y, tb.w, tb.h); 
    ctx.clip();

    this._tbButtons     = [];
    this._pageInputRect = null;
    let cx = tb.x + 12;
    const my = tb.y + tb.h / 2;

    // Titre
    const title = typeof this.src === 'string' ? (this.src.split('/').pop() || 'Document.pdf') : 'Document.pdf';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${this._isMat ? '500' : '600'} ${this._isMat ? 15 : 16}px sans-serif`;
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'middle';
    
    // Calcul de la largeur disponible pour le titre
    let availableWidth = tb.w - 200; // Réserver de l'espace pour les boutons
    
    let t = title;
    while (ctx.measureText(t).width > availableWidth && t.length > 2) {
      t = t.slice(0, -1);
    }
    if (t !== title) t += '…';
    ctx.fillText(t, cx, my);

    // Boutons de navigation (si plus d'une page)
    if (this.totalPages > 1 && this.allowNavigation) {
      cx = tb.x + tb.w - 240;
      
      // Page précédente
      cx = this._btn(ctx, cx, my, 'prev', this._icChevron('left'), 0, this.currentPage <= 1);
      
      // Indicateur de page
      const pageText = `${this.currentPage}/${this.totalPages}`;
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; 
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle';
      ctx.fillText(pageText, cx + 20, my);
      
      // Enregistrer la zone cliquable pour l'indicateur de page
      this._pageInputRect = { x: cx, y: my - 16, w: 44, h: 32 };
      
      cx += 44;
      
      // Page suivante
      cx = this._btn(ctx, cx, my, 'next', this._icChevron('right'), 0, this.currentPage >= this.totalPages);
      
      cx += 8; // Séparateur
    }

    // Boutons de zoom (toujours à droite)
    cx = tb.x + tb.w - 120;
    
    // Zoom out
    if (this.allowZoom) {
      cx = this._btn(ctx, cx, my, 'zoomOut', '−', 20, this.scale <= this.minScale);
      
      // Pourcentage
      const zl = `${Math.round(this.scale * 100)}%`;
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; 
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle';
      ctx.fillText(zl, cx + 20, my);
      
      cx += 44;
      
      // Zoom in
      cx = this._btn(ctx, cx, my, 'zoomIn', '+', 20, this.scale >= this.maxScale);
    }

    ctx.restore();
  }

  _btn(ctx, x, y, id, content, fontSize = 0, disabled = false) {
    const bw = 32, bh = 32, bx = x, by = y - 16;
    
    // Hover effect
    if (this._hoveredBtn === id && !disabled) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; 
      this._rr(ctx, bx, by, bw, bh, this._isMat ? 4 : 6); 
      ctx.fill();
    }
    
    this._tbButtons.push({ id, x: bx, y: by, w: bw, h: bh, disabled });
    ctx.globalAlpha = disabled ? 0.35 : 1;
    
    const isText = typeof content === 'string' && content.length <= 2;
    if (isText) {
      ctx.fillStyle = '#fff'; 
      ctx.font = `${fontSize || 18}px sans-serif`;
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle';
      ctx.fillText(content, bx + bw / 2, y);
    } else {
      // C'est un chemin SVG
      ctx.save();
      ctx.translate(bx + 7, y - 9);
      ctx.strokeStyle = '#fff'; 
      ctx.lineWidth = 2; 
      ctx.lineCap = 'round'; 
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(content));
      ctx.restore();
    }
    
    ctx.globalAlpha = 1;
    return x + bw + 4;
  }

  // ─── Barre de recherche ───────────────────────────────────────────────────────

  _drawSearchBar(ctx) {
    const sb = this._sbRect; 
    if (sb.h === 0) return;
    
    ctx.fillStyle = this._isMat ? this.m3Colors.surfaceVariant : '#F2F2F7';
    ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
    ctx.strokeStyle = this._colors.outlineVariant || '#C6C6C8'; 
    ctx.lineWidth = 1;
    ctx.beginPath(); 
    ctx.moveTo(sb.x, sb.y + sb.h); 
    ctx.lineTo(sb.x + sb.w, sb.y + sb.h); 
    ctx.stroke();

    const fw = sb.w - 24 - 38, fh = sb.h - 16;
    ctx.fillStyle = '#fff'; 
    this._rr(ctx, sb.x + 12, sb.y + 8, fw, fh, this._isMat ? 4 : 8); 
    ctx.fill();
    ctx.strokeStyle = this._colors.outline || '#C6C6C8';
    this._rr(ctx, sb.x + 12, sb.y + 8, fw, fh, this._isMat ? 4 : 8); 
    ctx.stroke();
    ctx.fillStyle = this._searchQuery ? '#000' : '#999';
    ctx.font = '13px sans-serif'; 
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'middle';
    ctx.fillText(this._searchQuery || 'Rechercher...', sb.x + 20, sb.y + sb.h / 2);

    const clx = sb.x + sb.w - 34;
    this._searchCloseRect = { x: clx, y: sb.y, w: 34, h: sb.h };
    
    // Hover effect pour le bouton de fermeture
    if (this._hoveredBtn === 'searchClose') {
      ctx.fillStyle = '#444';
    } else {
      ctx.fillStyle = '#666';
    }
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', clx + 17, sb.y + sb.h / 2);
  }

  // ─── Gestion des clics ───────────────────────────────────────────────────────

  _handleClick(x, y) {
    console.log('Click at', x, y); // Debug
    
    // Retry
    if (this._retryBtn) {
      const r = this._retryBtn;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        console.log('Retry clicked');
        if (this.src) this._loadPDF(this.src); 
        return;
      }
    }
    
    // Fermer recherche
    if (this._searchCloseRect) {
      const r = this._searchCloseRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        console.log('Search close clicked');
        this._toggleSearch(); 
        return;
      }
    }
    
    // Toolbar
    for (const b of this._tbButtons) {
      if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        console.log('Button clicked:', b.id);
        this._handleBtn(b.id); 
        return;
      }
    }
    
    // Indicateur de page (pour navigation)
    if (this._pageInputRect) {
      const r = this._pageInputRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        console.log('Page indicator clicked');
        this._promptPage(); 
        return;
      }
    }
    
    // Miniatures
    if (this.totalPages > 1) {
      const tr = this._thumbRect;
      if (x >= tr.x && x <= tr.x + tr.w) {
        let ty = tr.y + 8;
        for (let p = 1; p <= this.totalPages; p++) {
          const img = this._thumbImages[p];
          const tw  = tr.w - 16;
          const th  = img ? Math.round(img.height * tw / img.width) : 70;
          if (y >= ty && y <= ty + th) { 
            console.log('Thumbnail clicked:', p);
            this.goToPage(p); 
            return; 
          }
          ty += th + 18;
        }
      }
    }
  }

  _handleBtn(id) {
    console.log('Handling button:', id);
    switch (id) {
      case 'prev':     
        this.goToPreviousPage();            
        break;
      case 'next':     
        this.goToNextPage();                
        break;
      case 'zoomIn':   
        this._setScale(this.scale + 0.25);  
        break;
      case 'zoomOut':  
        this._setScale(this.scale - 0.25);  
        break;
      case 'zoomFit':  
        this._fitToWidth();                 
        break;
      case 'rotate':   
        this._rotate();                     
        break;
      case 'search':   
        this._toggleSearch();               
        break;
      case 'download': 
        this._download();                   
        break;
      case 'print':    
        this._print();                      
        break;
    }
    this._redraw();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  _setScale(s) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, Math.round(s * 100) / 100));
    this.onScaleChange(this.scale);
    this._reRenderAll();
  }

  async _fitToWidth() {
    if (!this._pdfDoc) return;
    const vp = (await this._pdfDoc.getPage(1)).getViewport({ scale: 1 });
    this._setScale((this._viewerRect.w - 32) / vp.width);
  }

  _rotate() { 
    this.rotation = (this.rotation + 90) % 360; 
    this._reRenderAll(); 
  }

  _download() {
    if (typeof this.src !== 'string') return;
    const a = document.createElement('a');
    a.href = this.src; 
    a.download = this.src.split('/').pop() || 'document.pdf'; 
    a.click();
  }

  _print() {
    if (typeof this.src !== 'string') return;
    const w = window.open(this.src);
    if (w) w.addEventListener('load', () => w.print());
  }

  _toggleSearch() {
    this._searchOpen = !this._searchOpen;
    this._computeMaxScroll();
    this._redraw();
  }

  _promptPage() {
    const v = prompt(`Aller à la page (1–${this.totalPages}) :`, this.currentPage);
    if (v !== null) { 
      const p = parseInt(v); 
      if (p >= 1 && p <= this.totalPages) this.goToPage(p); 
    }
  }

  // ─── Navigation publique ─────────────────────────────────────────────────────

  goToPage(page) {
    if (!this._pdfDoc || page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this._scrollY    = Math.max(0, Math.min(this._maxScrollY, this._pageScrollOffset(page) - 8));
    this.onPageChange(page, this.totalPages);
    this._redraw();
  }

  goToPreviousPage() { 
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1); 
  }
  
  goToNextPage() { 
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); 
  }

  // ─── API publique ─────────────────────────────────────────────────────────────

  load(src) {
    this.src = src; 
    this._pdfDoc = null;
    this._pageImages = {}; 
    this._thumbImages = {}; 
    this._scrollY = 0;
    this._loadPDF(src);
  }

  setScale(s) { 
    this._setScale(s); 
  }

  async getMetadata() { 
    return this._pdfDoc ? this._pdfDoc.getMetadata() : null; 
  }

  // ─── Icônes SVG paths (18×18 viewbox) ────────────────────────────────────────

  _icChevron(d) { 
    return d === 'left' ? 'M12 3 L5 9 L12 15' : 'M6 3 L13 9 L6 15'; 
  }
  
  _icFit() { 
    return 'M11 1 L17 1 L17 7 M1 11 L1 17 L7 17 M17 1 L10 8 M1 17 L8 10'; 
  }
  
  _icRotate() { 
    return 'M1 4 L1 9 L6 9 M2 11.5 A8 8 0 1 0 4 4.5'; 
  }
  
  _icSearch() { 
    return 'M7.5 13.5 A6 6 0 1 0 7.5 1.5 A6 6 0 1 0 7.5 13.5 M12 12 L17 17'; 
  }
  
  _icDownload() { 
    return 'M9 1 L9 11 M5 7 L9 11 L13 7 M1 14 L1 17 L17 17 L17 14'; 
  }
  
  _icPrint() { 
    return 'M4 7 L4 1 L14 1 L14 7 M4 15 L14 15 L14 11 L4 11 Z M1 7 L17 7 L17 14 L1 14 Z'; 
  }

  // ─── Utilitaire roundRect ─────────────────────────────────────────────────────

  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);       
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  destroy() {
    if (this._spinRAF)     cancelAnimationFrame(this._spinRAF);
    if (this._momentumRAF) cancelAnimationFrame(this._momentumRAF);
    const canvas = this.framework && this.framework.canvas;
    if (canvas && this._eventsRegistered) {
      const h = this._boundHandlers;
      canvas.removeEventListener('mousedown',  h.onMouseDown);
      canvas.removeEventListener('mousemove',  h.onMouseMove);
      canvas.removeEventListener('mouseup',    h.onMouseUp);
      canvas.removeEventListener('mouseleave', h.onMouseLeave);
      canvas.removeEventListener('click',      h.onClick);
      canvas.removeEventListener('wheel',      h.onWheel);
      canvas.removeEventListener('touchstart', h.onTouchStart);
      canvas.removeEventListener('touchmove',  h.onTouchMove);
      canvas.removeEventListener('touchend',   h.onTouchEnd);
      canvas.removeEventListener('touchcancel', h.onTouchEnd);
    }
    this._pdfDoc = null;
    if (super.destroy) super.destroy();
  }
}

export default PDFViewer;
