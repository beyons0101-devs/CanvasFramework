import Component from '../core/Component.js';

/**
 * Lecteur PDF dessiné sur Canvas.
 * Utilise exclusivement le système d'événements du framework :
 *   - onPress(x, y)  → appelé par checkComponentsAtPosition sur 'start' et 'end'
 *   - onMove(x, y)   → appelé sur 'move'
 * x, y sont en coordonnées monde (scrollOffset déjà soustrait par le framework).
 */
class PDFViewer extends Component {

    constructor(framework, options = {}) {
        super(framework, options);

        this.platform = framework.platform;
        this.src = options.src || null;
        this.currentPage = options.initialPage || 1;
        this.totalPages = 0;
        this.scale = options.initialScale || 0.4;
        this.rotation = 0;
        this.loading = false;
        this.error = null;

        this.showToolbar = options.showToolbar !== false;
        this.allowZoom = options.allowZoom !== false;
        this.allowNavigation = options.allowNavigation !== false;
        this.allowDownload = options.allowDownload !== false;
        this.allowPrint = options.allowPrint !== false;
        this.allowRotate = options.allowRotate !== false;
		this.toolbarColor     = options.toolbarColor     || null;
		this.toolbarTextColor = options.toolbarTextColor || '#FFFFFF';
		this.toolbarIconColor = options.toolbarIconColor || '#FFFFFF';
		this.toolbarColor = options.toolbarColor || null;
        this.allowSearch = options.allowSearch !== false;
        this.minScale = options.minScale || 0.25;
        this.maxScale = options.maxScale || 5.0;
        this.backgroundColor = options.backgroundColor || null;
        this.primaryColor = options.primaryColor || null;
        this.pageBackground = options.pageBackground || '#FFFFFF';

        this.onPageChange = options.onPageChange || (() => {});
        this.onScaleChange = options.onScaleChange || (() => {});
        this.onLoad = options.onLoad || (() => {});
        this.onErrorCb = options.onError || (() => {});

        // Layout
        this._toolbarHeight = this.showToolbar ? 52 : 0;
        this._searchOpen = false;
        this._searchQuery = '';
        this._thumbsWidth = 110;

        // PDF state
        this._pdfDoc = null;
        this._pageImages = {};
        this._thumbImages = {};

        // Scroll interne du viewer
        this._scrollY = 0;
        this._maxScrollY = 0;
        this._scrollX = 0;
        this._maxScrollX = 0;

        // Drag interne (scroll des pages)
        this._dragging = false;
        this._dragStartY = 0;
        this._dragStartScroll = 0;
        this._dragStartX = 0;
        this._dragStartScrollX = 0;
        this._pressX = undefined;
        this._pressY = undefined;

        // Hit areas — coordonnées MONDE (this.x + offset local)
        this._tbButtons = [];
        this._pageInputRect = null;
        this._retryBtn = null;
        this._searchCloseRect = null;
        this._hoveredBtn = null;

        // Spinner
        this._spinAngle = 0;
        this._spinRAF = null;

        // Couleurs Material You 3
        this.m3Colors = {
            primary: '#6750A4',
            onPrimary: '#FFFFFF',
            surfaceVariant: '#E7E0EC',
            onSurface: '#1C1B1F',
            onSurfaceVariant: '#49454F',
            outline: '#79747E',
            outlineVariant: '#CAC4D0',
            error: '#BA1A1A',
            viewerBg: '#F7F2FA',
            thumbsBg: '#EFE9F4',
            thumbBorder: '#CAC4D0',
            thumbActive: '#6750A4',
            pageShadow: 'rgba(0,0,0,0.15)',
        };

        // Couleurs Cupertino
        this.cupertinoColors = {
            primary: '#007AFF',
            onPrimary: '#FFFFFF',
            error: '#FF3B30',
            toolbarBorder: '#C6C6C8',
            viewerBg: '#D1D1D6',
            thumbsBg: '#F2F2F7',
            thumbBorder: '#C6C6C8',
            thumbActive: '#007AFF',
            pageShadow: 'rgba(0,0,0,0.15)',
            onSurfaceVariant: '#8E8E93',
            outlineVariant: '#C6C6C8',
            outline: '#C6C6C8',
        };

        this._startSpinner();
        if (this.src) this._loadPDF(this.src);

        // Gestion directe des events sur le canvas du framework
        this._canvas = framework.canvas;
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        this._canvas.addEventListener('mousedown', this._boundMouseDown);
        this._canvas.addEventListener('mousemove', this._boundMouseMove);
        this._canvas.addEventListener('mouseup', this._boundMouseUp);
        this._canvas.addEventListener('touchstart', this._boundMouseDown, {
            passive: false
        });
        this._canvas.addEventListener('touchmove', this._boundMouseMove, {
            passive: false
        });
        this._canvas.addEventListener('touchend', this._boundMouseUp, {
            passive: false
        });
    }


    _getPos(e) {
        const rect = this._canvas.getBoundingClientRect();
        let src;
        if (e.changedTouches && e.changedTouches.length > 0) {
            src = e.changedTouches[0];
        } else if (e.touches && e.touches.length > 0) {
            src = e.touches[0];
        } else {
            src = e;
        }
        return {
            x: src.clientX - rect.left,
            y: src.clientY - rect.top
        };
    }

    _isInMe(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    _onMouseDown(e) {
        const {
            x,
            y
        } = this._getPos(e);
        if (!this._isInMe(x, y)) return;
        this._pressX = x;
        this._pressY = y;
        this._dragging = false;
        this._dragStartScroll = this._scrollY;
    }

    _onMouseMove(e) {
        const {
            x,
            y
        } = this._getPos(e);
        if (!this._isInMe(x, y)) return;
        this._checkHover(x, y);

        if (this._pressX !== undefined) {
            const vr = this._viewerRect;
            const inViewer = this._pressX >= vr.x && this._pressX <= vr.x + vr.w &&
                this._pressY >= vr.y && this._pressY <= vr.y + vr.h;
            if (inViewer) {
                const dx = Math.abs(x - this._pressX);
                const dy = Math.abs(y - this._pressY);
                if (dx > 5 || dy > 5 || this._dragging) {
                    if (!this._dragging) {
                        this._dragging = true;
                        this._dragStartY = this._pressY;
                        this._dragStartX = this._pressX;
                        this._dragStartScroll = this._scrollY;
                        this._dragStartScrollX = this._scrollX;
                    }
                    this._scrollY = Math.max(0, Math.min(this._maxScrollY,
                        this._dragStartScroll + (this._dragStartY - y)));
                    this._scrollX = Math.max(0, Math.min(this._maxScrollX,
                        this._dragStartScrollX + (this._dragStartX - x)));
                    this._syncPage();
                    this.markDirty();
                }
            }
        }
    }

    _onMouseUp(e) {
        const {
            x,
            y
        } = this._getPos(e);
        if (!this._isInMe(x, y)) {
            this._pressX = undefined;
            this._pressY = undefined;
            return;
        }
        if (!this._dragging && this._pressX !== undefined) {
            this._handleClick(x, y); // ← x,y directs, pas de surprise
        }
        this._pressX = undefined;
        this._pressY = undefined;
        this._dragging = false;
    }

    destroy() {
        this._canvas.removeEventListener('mousedown', this._boundMouseDown);
        this._canvas.removeEventListener('mousemove', this._boundMouseMove);
        this._canvas.removeEventListener('mouseup', this._boundMouseUp);
        this._canvas.removeEventListener('touchstart', this._boundMouseDown);
        this._canvas.removeEventListener('touchmove', this._boundMouseMove);
        this._canvas.removeEventListener('touchend', this._boundMouseUp);
        if (this._spinRAF) cancelAnimationFrame(this._spinRAF);
        this._pdfDoc = null;
        super.destroy?.();
    }
    // ─── Couleurs ────────────────────────────────────────────────────────────────

    get _colors() {
        return this.platform === 'material' ? this.m3Colors : this.cupertinoColors;
    }
    get _primary() {
        return this.primaryColor || this._colors.primary;
    }
    get _isMat() {
        return this.platform === 'material';
    }

    // ─── Géométrie en coordonnées MONDE ──────────────────────────────────────────

    get _tbRect() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this._toolbarHeight
        };
    }
    get _sbRect() {
        return {
            x: this.x,
            y: this.y + this._toolbarHeight,
            w: this.width,
            h: this._searchOpen ? 44 : 0
        };
    }
    get _activeThumbsWidth() {
        return this.totalPages > 1 ? this._thumbsWidth : 0;
    }
    get _viewerRect() {
        const top = this._toolbarHeight + this._sbRect.h;
        return {
            x: this.x + this._activeThumbsWidth,
            y: this.y + top,
            w: this.width - this._activeThumbsWidth,
            h: this.height - top,
        };
    }
    get _thumbRect() {
        const top = this._toolbarHeight + this._sbRect.h;
        return {
            x: this.x,
            y: this.y + top,
            w: this._thumbsWidth,
            h: this.height - top
        };
    }

    // ─── Événements framework ────────────────────────────────────────────────────
    // Le framework (checkComponentsAtPosition) appelle :
    //   onPress(x, y)  sur 'start' avec comp.pressed = true
    //   onPress(x, y)  sur 'end'   avec comp.pressed = false  (via onClick fallback)
    //   onMove(x, y)   sur 'move'
    //
    // ATTENTION : le framework appelle onPress sur 'start' ET onClick sur 'end'.
    // On surcharge onClick pour le clic final, et onPress pour le press initial.



    // onClick est appelé par le framework sur 'end' quand comp.pressed était true
    // On le remplace ici pour recevoir les coordonnées via onPress qu'on a mémorisé.
    // Mais le framework appelle onClick() sans args... On utilise donc une autre approche :
    // on surcharge handleClick via _lastPressX/Y mémorisés dans onPress.



    // ─── Logique de clic ─────────────────────────────────────────────────────────

    _handleClick(x, y) {
        console.log('_handleClick', x, y, 'thumbRect', this._thumbRect);
        // Retry
        if (this._retryBtn) {
            const r = this._retryBtn;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                if (this.src) this._loadPDF(this.src);
                return;
            }
        }

        // Fermer recherche
        if (this._searchCloseRect) {
            const r = this._searchCloseRect;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                this._toggleSearch();
                return;
            }
        }

        // Boutons toolbar
        for (const b of this._tbButtons) {
            if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                this._handleBtn(b.id);
                return;
            }
        }

        // Indicateur de page
        if (this._pageInputRect) {
            const r = this._pageInputRect;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                this._promptPage();
                return;
            }
        }

        // Miniatures
        if (this.totalPages > 1) {
            const tr = this._thumbRect;
            if (x >= tr.x && x <= tr.x + tr.w && y >= tr.y && y <= tr.y + tr.h) {
                let ty = tr.y + 8;
                for (let p = 1; p <= this.totalPages; p++) {
                    const img = this._thumbImages[p];
                    const tw = tr.w - 16;
                    const th = img ? Math.round(img.height * tw / img.width) : 70;
                    if (y >= ty && y <= ty + th) {
                        this.goToPage(p);
                        return;
                    }
                    ty += th + 18;
                }
            }
        }
    }

    _checkHover(x, y) {
        let hover = null;
        for (const b of this._tbButtons) {
            if (!b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                hover = b.id;
                break;
            }
        }
        if (!hover && this._searchCloseRect) {
            const r = this._searchCloseRect;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) hover = 'searchClose';
        }
        if (!hover && this._retryBtn) {
            const r = this._retryBtn;
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) hover = 'retry';
        }
        if (hover !== this._hoveredBtn) {
            this._hoveredBtn = hover;
            this.markDirty();
        }
    }

    // ─── Spinner ─────────────────────────────────────────────────────────────────

    _startSpinner() {
        const tick = () => {
            if (this.loading) {
                this._spinAngle = (this._spinAngle + 0.08) % (Math.PI * 2);
                this.markDirty();
            }
            this._spinRAF = requestAnimationFrame(tick);
        };
        this._spinRAF = requestAnimationFrame(tick);
    }

    // ─── PDF.js ──────────────────────────────────────────────────────────────────

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
        this.loading = true;
        this.error = null;
        this._pageImages = {};
        this._thumbImages = {};
        this._scrollY = 0;
        this.markDirty();
        try {
            const lib = await this._loadPDFJS();
            const task = lib.getDocument(typeof src === 'string' ? src : {
                data: src
            });
            this._pdfDoc = await task.promise;
            this.totalPages = this._pdfDoc.numPages;
            const promises = [];
            for (let p = 1; p <= this.totalPages; p++) {
                promises.push(this._renderPage(p), this._renderThumb(p));
            }
            await Promise.all(promises);
            this.loading = false;
            this._computeMaxScroll();
            this.onLoad(this.totalPages);
            this.markDirty();
        } catch (err) {
            this.loading = false;
            this.error = err.message || 'Erreur de chargement';
            this.onErrorCb(this.error);
            this.markDirty();
        }
    }

    async _renderPage(p) {
        try {
            const page = await this._pdfDoc.getPage(p);
            const vp = page.getViewport({
                scale: this.scale,
                rotation: this.rotation
            });
            const off = new OffscreenCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
            await page.render({
                canvasContext: off.getContext('2d'),
                viewport: vp
            }).promise;
            this._pageImages[p] = await createImageBitmap(off);
        } catch (err) {
            console.error(`Erreur page ${p}:`, err);
        }
    }

    async _renderThumb(p) {
        try {
            const page = await this._pdfDoc.getPage(p);
            const vp = page.getViewport({
                scale: 0.18,
                rotation: this.rotation
            });
            const off = new OffscreenCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
            await page.render({
                canvasContext: off.getContext('2d'),
                viewport: vp
            }).promise;
            this._thumbImages[p] = await createImageBitmap(off);
        } catch (err) {
            console.error(`Erreur miniature ${p}:`, err);
        }
    }

    async _reRenderAll() {
        if (!this._pdfDoc) return;
        this._pageImages = {};
        this._thumbImages = {};
        this._scrollX = 0; // ← ajouter
        this.loading = true;
        this.markDirty();
        const promises = [];
        for (let p = 1; p <= this.totalPages; p++) {
            promises.push(this._renderPage(p), this._renderThumb(p));
        }
        await Promise.all(promises);
        this.loading = false;
        this._computeMaxScroll();
        this._scrollY = Math.min(this._scrollY, this._maxScrollY);
        this.markDirty();
    }

    // ─── Scroll interne ───────────────────────────────────────────────────────────

    _computeMaxScroll() {
        const vr = this._viewerRect;
        let totalH = 16;
        let maxW = 0;
        for (let p = 1; p <= this.totalPages; p++) {
            totalH += (this._pageImages[p] ? this._pageImages[p].height : 200) + 16;
            const w = this._pageImages[p] ? this._pageImages[p].width : 0;
            if (w > maxW) maxW = w;
        }
        this._maxScrollY = Math.max(0, totalH - vr.h);
        this._maxScrollX = Math.max(0, maxW + 32 - vr.w);
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

    // ─── Dessin ───────────────────────────────────────────────────────────────────

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        this._rr(ctx, this.x, this.y, this.width, this.height, this._isMat ? 4 : 12);
        ctx.clip();

        ctx.fillStyle = this.backgroundColor || this._colors.viewerBg;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.totalPages > 1) this._drawThumbs(ctx);
        this._drawViewer(ctx);
        if (this.showToolbar) this._drawToolbar(ctx);
        if (this._searchOpen) this._drawSearchBar(ctx);

        ctx.strokeStyle = this._isMat ? 'rgba(0,0,0,0.12)' : (this._colors.toolbarBorder || '#C6C6C8');
        ctx.lineWidth = 1;
        ctx.beginPath();
        this._rr(ctx, this.x, this.y, this.width, this.height, this._isMat ? 4 : 12);
        ctx.stroke();

        ctx.restore();
    }

    _drawViewer(ctx) {
        const vr = this._viewerRect;
        ctx.save();
        ctx.beginPath();
        ctx.rect(vr.x, vr.y, vr.w, vr.h);
        ctx.clip();
        ctx.fillStyle = this._colors.viewerBg;
        ctx.fillRect(vr.x, vr.y, vr.w, vr.h);

        const hasImages = Object.keys(this._pageImages).length > 0;
        if (this.loading && !hasImages) this._drawLoading(ctx, vr);
        else if (this.error && !hasImages) this._drawError(ctx, vr);
        else if (!this.totalPages && !this.loading) this._drawEmpty(ctx, vr);
        else this._drawPages(ctx, vr);

        ctx.restore();
    }

    _drawPages(ctx, vr) {
        const pad = 16;
        let y = vr.y + pad - this._scrollY;

        for (let p = 1; p <= this.totalPages; p++) {
            const img = this._pageImages[p];
            const ph = img ? img.height : 200;
            const pw = img ? img.width : vr.w - pad * 2;

            // Centrer si plus petit que le viewer, sinon scroll horizontal
            const baseX = this._maxScrollX > 0 ?
                vr.x + pad - this._scrollX :
                vr.x + (vr.w - pw) / 2;

            if (y + ph >= vr.y && y <= vr.y + vr.h) {
                ctx.shadowColor = this._colors.pageShadow;
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = this.pageBackground;
                ctx.fillRect(baseX, y, pw, ph);
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                if (img) {
                    ctx.drawImage(img, 0, 0, img.width, img.height, baseX, y, pw, ph);
                } else {
                    ctx.fillStyle = '#ccc';
                    ctx.font = '13px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`Page ${p}…`, baseX + pw / 2, y + ph / 2);
                }

                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${p} / ${this.totalPages}`, baseX + pw - 6, y + ph - 4);
            }
            y += ph + pad;
        }
        this._drawScrollbar(ctx, vr);
        this._drawScrollbarH(ctx, vr);
    }

    _drawScrollbarH(ctx, vr) {
        if (this._maxScrollX <= 0) return;
        const th = 5,
            tr = 3;
        const ty = vr.y + vr.h - th - 3;
        const tx = vr.x + 4,
            tw = vr.w - 8;
        const ratio = vr.w / (vr.w + this._maxScrollX);
        const thumbW = Math.max(24, tw * ratio);
        const thumbX = tx + (this._scrollX / this._maxScrollX) * (tw - thumbW);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        this._rr(ctx, tx, ty, tw, th, tr);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        this._rr(ctx, thumbX, ty, thumbW, th, tr);
        ctx.fill();
    }

    _drawScrollbar(ctx, vr) {
        if (this._maxScrollY <= 0) return;
        const tw = 5,
            tr = 3;
        const tx = vr.x + vr.w - tw - 3;
        const ty = vr.y + 4,
            th = vr.h - 8;
        const ratio = vr.h / (vr.h + this._maxScrollY);
        const thumbH = Math.max(24, th * ratio);
        const thumbY = ty + (this._scrollY / this._maxScrollY) * (th - thumbH);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        this._rr(ctx, tx, ty, tw, th, tr);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        this._rr(ctx, tx, thumbY, tw, thumbH, tr);
        ctx.fill();
    }

    _drawLoading(ctx, vr) {
        const cx = vr.x + vr.w / 2,
            cy = vr.y + vr.h / 2 - 20;
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
        const cx = vr.x + vr.w / 2,
            cy = vr.y + vr.h / 2 - 20;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = this._colors.onSurfaceVariant || '#49454F';
        ctx.beginPath();
        const fx = cx - 20,
            fy = cy - 26;
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
        const cx = vr.x + vr.w / 2,
            cy = vr.y + vr.h / 2 - 30;
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
        const bx = cx - 48,
            by = cy + 62;
        this._retryBtn = {
            x: bx,
            y: by,
            w: 96,
            h: 30
        };
        ctx.fillStyle = this._hoveredBtn === 'retry' ? this._primary + 'dd' : this._primary;
        this._rr(ctx, bx, by, 96, 30, this._isMat ? 15 : 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '13px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('Réessayer', cx, by + 15);
    }

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
            const tw = tr.w - 16;
            const th = img ? Math.round(img.height * tw / img.width) : 70;
            const tx = tr.x + 8;
            if (ty + th > tr.y && ty < tr.y + tr.h) {
                const active = p === this.currentPage;
                ctx.strokeStyle = active ? this._colors.thumbActive : this._colors.thumbBorder;
                ctx.lineWidth = active ? 2 : 1;
                this._rr(ctx, tx, ty, tw, th, 3);
                if (img) {
                    ctx.drawImage(img, tx, ty, tw, th);
                    ctx.stroke();
                } else {
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

    _drawToolbar(ctx) {
	  const tb = this._tbRect;
	  ctx.fillStyle = this.toolbarColor || this._primary;
	  ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
	  if (!this._isMat) {
		ctx.strokeStyle = this._colors.toolbarBorder || '#C6C6C8'; ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(tb.x, tb.y+tb.h); ctx.lineTo(tb.x+tb.w, tb.y+tb.h); ctx.stroke();
	  }

	  ctx.save(); ctx.beginPath(); ctx.rect(tb.x, tb.y, tb.w, tb.h); ctx.clip();

	  this._tbButtons     = [];
	  this._pageInputRect = null;

	  let cx = tb.x + 12;
	  const my = tb.y + tb.h / 2;

	  // Titre
	  const title = typeof this.src === 'string' ? (this.src.split('/').pop() || 'Document.pdf') : 'Document.pdf';
	  ctx.fillStyle = this.toolbarTextColor;
	  ctx.font = `${this._isMat ? '500' : '600'} ${this._isMat ? 15 : 16}px sans-serif`;
	  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
	  let t = title.length > 8 ? title.slice(0, 8) + '…' : title;
	  ctx.fillText(t, cx, my);

	  // Navigation
	  if (this.totalPages > 1 && this.allowNavigation) {
		cx = tb.x + tb.w - 240;
		cx = this._btn(ctx, cx, my, 'prev', this._icChevron('left'), 0, this.currentPage <= 1);
		ctx.fillStyle = this.toolbarTextColor;
		ctx.font = '13px sans-serif';
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(`${this.currentPage}/${this.totalPages}`, cx + 20, my);
		this._pageInputRect = { x: cx, y: my - 16, w: 44, h: 32 };
		cx += 44;
		cx = this._btn(ctx, cx, my, 'next', this._icChevron('right'), 0, this.currentPage >= this.totalPages);
		cx += 8;
	  }

	  // Zoom
	  cx = tb.x + tb.w - 120;
	  if (this.allowZoom) {
		cx = this._btn(ctx, cx, my, 'zoomOut', '−', 20, this.scale <= this.minScale);
		ctx.fillStyle = this.toolbarTextColor;
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(`${Math.round(this.scale * 100)}%`, cx + 20, my);
		cx += 44;
		cx = this._btn(ctx, cx, my, 'zoomIn', '+', 20, this.scale >= this.maxScale);
	  }

	  ctx.restore();
	}

    _btn(ctx, x, y, id, content, fontSize = 0, disabled = false) {
	  const bw = 32, bh = 32, bx = x, by = y - 16;
	  if (this._hoveredBtn === id && !disabled) {
		ctx.fillStyle = this.toolbarIconColor + '38';
		this._rr(ctx, bx, by, bw, bh, this._isMat ? 4 : 6); ctx.fill();
	  }
	  this._tbButtons.push({ id, x: bx, y: by, w: bw, h: bh, disabled });
	  ctx.globalAlpha = disabled ? 0.35 : 1;
	  if (typeof content === 'string' && content.length <= 2) {
		ctx.fillStyle = this.toolbarIconColor;
		ctx.font = `${fontSize || 18}px sans-serif`;
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(content, bx + bw/2, y);
	  } else {
		ctx.save(); ctx.translate(bx + 7, y - 9);
		ctx.strokeStyle = this.toolbarIconColor;
		ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
		ctx.stroke(new Path2D(content));
		ctx.restore();
	  }
	  ctx.globalAlpha = 1;
	  return x + bw + 4;
	}

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

        const fw = sb.w - 24 - 38,
            fh = sb.h - 16;
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
        this._searchCloseRect = {
            x: clx,
            y: sb.y,
            w: 34,
            h: sb.h
        };
        ctx.fillStyle = this._hoveredBtn === 'searchClose' ? '#444' : '#666';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', clx + 17, sb.y + sb.h / 2);
    }

    // ─── Actions ─────────────────────────────────────────────────────────────────

    _handleBtn(id) {
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
        this.markDirty();
    }

    _setScale(s) {
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, Math.round(s * 100) / 100));
        this.onScaleChange(this.scale);
        this._reRenderAll();
    }

    async _fitToWidth() {
        if (!this._pdfDoc) return;
        const vp = (await this._pdfDoc.getPage(1)).getViewport({
            scale: 1
        });
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
        this.markDirty();
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
        this._scrollY = Math.max(0, Math.min(this._maxScrollY, this._pageScrollOffset(page) - 8));
        this.onPageChange(page, this.totalPages);
        this.markDirty();
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

    // ─── Icônes ──────────────────────────────────────────────────────────────────

    _icChevron(d) {
        return d === 'left' ? 'M12 3 L5 9 L12 15' : 'M6 3 L13 9 L6 15';
    }

    // ─── roundRect ───────────────────────────────────────────────────────────────

    _rr(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    isPointInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }


}

export default PDFViewer;
