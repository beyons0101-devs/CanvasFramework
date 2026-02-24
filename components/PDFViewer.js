import Component from '../core/Component.js';

/**
 * Lecteur PDF embarqué avec styles Material You et Cupertino.
 * Supporte : affichage multi-pages, zoom, navigation, miniature, recherche,
 * téléchargement, impression, plein-écran, rotation.
 *
 * Utilise PDF.js (CDN) pour le rendu. La lib est chargée automatiquement.
 *
 * @class
 * @extends Component
 * @property {string} platform - 'material' ou 'cupertino'
 * @property {string|Uint8Array|null} src - URL ou données binaires du PDF
 * @property {number} currentPage - Page courante (1-based)
 * @property {number} totalPages - Nombre total de pages
 * @property {number} scale - Niveau de zoom (1 = 100%)
 * @property {number} rotation - Rotation en degrés (0, 90, 180, 270)
 * @property {boolean} loading - Chargement en cours
 * @property {string|null} error - Message d'erreur
 */
class PDFViewer extends Component {

  /**
   * @param {CanvasFramework} framework
   * @param {Object} [options={}]
   * @param {string|Uint8Array} [options.src] - URL ou données binaires du PDF
   * @param {number}  [options.initialPage=1] - Page initiale
   * @param {number}  [options.initialScale=1.0] - Zoom initial
   * @param {boolean} [options.showToolbar=true] - Afficher la toolbar
   * @param {boolean} [options.showThumbnails=false] - Afficher le panneau miniatures
   * @param {boolean} [options.allowDownload=true] - Bouton de téléchargement
   * @param {boolean} [options.allowPrint=true] - Bouton d'impression
   * @param {boolean} [options.allowFullscreen=true] - Bouton plein écran
   * @param {boolean} [options.allowRotate=true] - Bouton rotation
   * @param {boolean} [options.allowSearch=true] - Bouton recherche
   * @param {number}  [options.minScale=0.25] - Zoom minimum
   * @param {number}  [options.maxScale=5.0] - Zoom maximum
   * @param {string}  [options.backgroundColor] - Fond global
   * @param {string}  [options.primaryColor] - Couleur primaire (toolbar)
   * @param {string}  [options.pageBackground='#FFFFFF'] - Fond page
   * @param {Function} [options.onPageChange] - Callback(page, total)
   * @param {Function} [options.onScaleChange] - Callback(scale)
   * @param {Function} [options.onLoad] - Callback(totalPages) après chargement
   * @param {Function} [options.onError] - Callback(errorMessage)
   */
  constructor(framework, options = {}) {
    super(framework, options);

    this.platform       = framework.platform;
    this.src            = options.src || null;
    this.currentPage    = options.initialPage || 1;
    this.totalPages     = 0;
    this.scale          = options.initialScale || 1.0;
    this.rotation       = 0;
    this.loading        = false;
    this.error          = null;
    this.showToolbar    = options.showToolbar !== false;
    this.showThumbnails = options.showThumbnails || false;
    this.allowDownload  = options.allowDownload !== false;
    this.allowPrint     = options.allowPrint !== false;
    this.allowFullscreen= options.allowFullscreen !== false;
    this.allowRotate    = options.allowRotate !== false;
    this.allowSearch    = options.allowSearch !== false;
    this.minScale       = options.minScale || 0.25;
    this.maxScale       = options.maxScale || 5.0;
    this.backgroundColor= options.backgroundColor || null;
    this.primaryColor   = options.primaryColor || null;
    this.pageBackground = options.pageBackground || '#FFFFFF';

    // Callbacks
    this.onPageChange  = options.onPageChange  || (() => {});
    this.onScaleChange = options.onScaleChange || (() => {});
    this.onLoad        = options.onLoad        || (() => {});
    this.onErrorCb     = options.onError       || (() => {});

    // État interne DOM
    this._containerEl   = null;
    this._toolbarEl     = null;
    this._viewerEl      = null;
    this._thumbsEl      = null;
    this._searchBarEl   = null;
    this._mounted       = false;
    this._pdfDoc        = null;
    this._pageCanvases  = {};
    this._thumbCanvases = {};
    this._renderTask    = null;
    this._searchOpen    = false;
    this._searchQuery   = '';
    this._fullscreen    = false;

    this._toolbarHeight   = this.showToolbar    ? 52 : 0;
    this._thumbsWidth     = this.showThumbnails ? 120 : 0;

    // Couleurs Material You 3
    this.m3Colors = {
      primary:          '#6750A4',
      onPrimary:        '#FFFFFF',
      surface:          '#FFFBFE',
      surfaceVariant:   '#E7E0EC',
      onSurface:        '#1C1B1F',
      onSurfaceVariant: '#49454F',
      outline:          '#79747E',
      outlineVariant:   '#CAC4D0',
      error:            '#BA1A1A',
      shadow:           '#00000040',
      toolbarBg:        '#6750A4',
      toolbarText:      '#FFFFFF',
      viewerBg:         '#F7F2FA',
      thumbsBg:         '#EFE9F4',
      thumbBorder:      '#CAC4D0',
      thumbActive:      '#6750A4',
      pageBox:          '#FFFFFF',
      pageShadow:       '#00000026',
    };

    // Couleurs Cupertino
    this.cupertinoColors = {
      primary:     '#007AFF',
      onPrimary:   '#FFFFFF',
      surface:     '#FFFFFF',
      error:       '#FF3B30',
      toolbarBg:   '#F2F2F7',
      toolbarText: '#000000',
      toolbarBorder:'#C6C6C8',
      viewerBg:    '#D1D1D6',
      thumbsBg:    '#F2F2F7',
      thumbBorder: '#C6C6C8',
      thumbActive: '#007AFF',
      pageBox:     '#FFFFFF',
      pageShadow:  '#00000026',
    };
  }

  get _colors() {
    return this.platform === 'material' ? this.m3Colors : this.cupertinoColors;
  }

  get _primary() {
    return this.primaryColor || this._colors.primary;
  }

  // ─── Chargement PDF.js ────────────────────────────────────────────────────────

  /**
   * Charge PDF.js depuis CDN si non disponible
   * @returns {Promise<Object>} pdfjsLib
   * @private
   */
  async _loadPDFJS() {
    if (window.pdfjsLib) return window.pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error('Impossible de charger PDF.js'));
      document.head.appendChild(script);
    });
  }

  // ─── Montage DOM ─────────────────────────────────────────────────────────────

  /**
   * Monte le composant DOM complet sur le canvas
   * @private
   */
  _mount() {
    if (this._mounted) return;
    this._mounted = true;

    const canvas   = this.framework.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const isMat    = this.platform === 'material';
    const colors   = this._colors;

    // Conteneur principal
    this._containerEl = document.createElement('div');
    this._containerEl.style.cssText = `
      position: fixed;
      left: ${canvasRect.left + this.x}px;
      top: ${canvasRect.top + this.y}px;
      width: ${this.width}px;
      height: ${this.height}px;
      display: flex;
      flex-direction: column;
      z-index: 1000;
      overflow: hidden;
      border-radius: ${isMat ? '4px' : '12px'};
      background: ${this.backgroundColor || colors.viewerBg};
      box-shadow: ${isMat ? '0 4px 16px ' + colors.shadow : '0 2px 12px ' + colors.pageShadow};
      box-sizing: border-box;
      font-family: ${isMat ? "'Roboto', sans-serif" : "-apple-system, BlinkMacSystemFont, sans-serif"};
    `;

    // Toolbar
    if (this.showToolbar) {
      this._toolbarEl = this._buildToolbar();
      this._containerEl.appendChild(this._toolbarEl);
    }

    // Barre de recherche
    this._searchBarEl = this._buildSearchBar();
    this._containerEl.appendChild(this._searchBarEl);

    // Corps principal (miniatures + visionneuse)
    const body = document.createElement('div');
    body.style.cssText = `
      display: flex;
      flex: 1;
      overflow: hidden;
    `;

    // Panneau miniatures
    if (this.showThumbnails) {
      this._thumbsEl = this._buildThumbnailsPanel();
      body.appendChild(this._thumbsEl);
    }

    // Zone de visualisation
    this._viewerEl = document.createElement('div');
    this._viewerEl.style.cssText = `
      flex: 1;
      overflow: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      gap: 12px;
      background: ${colors.viewerBg};
      box-sizing: border-box;
      scroll-behavior: smooth;
    `;

    // Événements scroll → sync page courante
    this._viewerEl.addEventListener('scroll', () => this._onViewerScroll());

    // Zoom à la molette
    this._viewerEl.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this._setScale(this.scale + delta);
      }
    }, { passive: false });

    body.appendChild(this._viewerEl);
    this._containerEl.appendChild(body);
    document.body.appendChild(this._containerEl);

    // Charger le PDF si src fournie
    if (this.src) this._loadPDF(this.src);
    else this._renderEmptyState();
  }

  // ─── Toolbar ──────────────────────────────────────────────────────────────────

  _buildToolbar() {
    const isMat  = this.platform === 'material';
    const colors = this._colors;

    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${isMat ? 4 : 2}px;
      padding: 0 ${isMat ? 12 : 8}px;
      height: ${this._toolbarHeight}px;
      background: ${this._primary};
      color: ${colors.onPrimary};
      flex-shrink: 0;
      box-shadow: ${isMat ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'};
      border-bottom: ${isMat ? 'none' : `1px solid ${colors.toolbarBorder || '#C6C6C8'}`};
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Titre / Nom de fichier
    const title = document.createElement('span');
    title.id = 'pdf_title';
    title.style.cssText = `
      flex: 1;
      font-size: ${isMat ? 16 : 17}px;
      font-weight: ${isMat ? '500' : '600'};
      color: ${colors.onPrimary};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    title.textContent = typeof this.src === 'string'
      ? this.src.split('/').pop() || 'Document.pdf'
      : 'Document.pdf';
    toolbar.appendChild(title);

    // Groupe navigation
    const navGroup = document.createElement('div');
    navGroup.style.cssText = `display: flex; align-items: center; gap: 4px;`;

    // Bouton page précédente
    const btnPrev = this._makeToolbarBtn(this._svgChevron('left'), 'Page précédente');
    btnPrev.id = 'pdf_btn_prev';
    btnPrev.addEventListener('click', () => this.goToPreviousPage());

    // Input page
    this._pageInput = document.createElement('input');
    this._pageInput.type = 'text';
    this._pageInput.value = '1';
    this._pageInput.style.cssText = `
      width: 40px;
      height: 28px;
      text-align: center;
      border: none;
      border-radius: ${isMat ? 4 : 6}px;
      background: rgba(255,255,255,0.2);
      color: white;
      font-size: 14px;
      outline: none;
    `;
    this._pageInput.addEventListener('change', () => {
      const p = parseInt(this._pageInput.value);
      if (p >= 1 && p <= this.totalPages) this.goToPage(p);
      else this._pageInput.value = this.currentPage;
    });

    this._pageTotalLabel = document.createElement('span');
    this._pageTotalLabel.style.cssText = `font-size: 14px; color: rgba(255,255,255,0.8);`;
    this._pageTotalLabel.textContent = '/ -';

    // Bouton page suivante
    const btnNext = this._makeToolbarBtn(this._svgChevron('right'), 'Page suivante');
    btnNext.id = 'pdf_btn_next';
    btnNext.addEventListener('click', () => this.goToNextPage());

    navGroup.appendChild(btnPrev);
    navGroup.appendChild(this._pageInput);
    navGroup.appendChild(this._pageTotalLabel);
    navGroup.appendChild(btnNext);
    toolbar.appendChild(navGroup);

    // Séparateur
    toolbar.appendChild(this._makeSep());

    // Zoom
    const zoomGroup = document.createElement('div');
    zoomGroup.style.cssText = `display: flex; align-items: center; gap: 4px;`;

    const btnZoomOut = this._makeToolbarBtn('−', 'Dézoomer');
    btnZoomOut.style.fontSize = '20px';
    btnZoomOut.addEventListener('click', () => this._setScale(this.scale - 0.25));

    this._scaleLabel = document.createElement('span');
    this._scaleLabel.style.cssText = `
      font-size: 13px; color: rgba(255,255,255,0.9);
      min-width: 40px; text-align: center;
    `;
    this._scaleLabel.textContent = '100%';

    const btnZoomIn = this._makeToolbarBtn('+', 'Zoomer');
    btnZoomIn.style.fontSize = '20px';
    btnZoomIn.addEventListener('click', () => this._setScale(this.scale + 0.25));

    // Bouton zoom automatique
    const btnZoomFit = this._makeToolbarBtn(this._svgFit(), 'Ajuster à la page');
    btnZoomFit.addEventListener('click', () => this._fitToWidth());

    zoomGroup.appendChild(btnZoomOut);
    zoomGroup.appendChild(this._scaleLabel);
    zoomGroup.appendChild(btnZoomIn);
    zoomGroup.appendChild(btnZoomFit);
    toolbar.appendChild(zoomGroup);

    // Outils supplémentaires
    if (this.allowRotate || this.allowSearch || this.allowDownload || this.allowPrint || this.allowFullscreen) {
      toolbar.appendChild(this._makeSep());
    }

    if (this.allowRotate) {
      const btnRotate = this._makeToolbarBtn(this._svgRotate(), 'Rotation 90°');
      btnRotate.addEventListener('click', () => this._rotate());
      toolbar.appendChild(btnRotate);
    }

    if (this.allowSearch) {
      const btnSearch = this._makeToolbarBtn(this._svgSearch(), 'Rechercher');
      btnSearch.addEventListener('click', () => this._toggleSearch());
      toolbar.appendChild(btnSearch);
    }

    if (this.allowDownload) {
      const btnDl = this._makeToolbarBtn(this._svgDownload(), 'Télécharger');
      btnDl.addEventListener('click', () => this._download());
      toolbar.appendChild(btnDl);
    }

    if (this.allowPrint) {
      const btnPrint = this._makeToolbarBtn(this._svgPrint(), 'Imprimer');
      btnPrint.addEventListener('click', () => this._print());
      toolbar.appendChild(btnPrint);
    }

    if (this.allowFullscreen) {
      const btnFs = this._makeToolbarBtn(this._svgFullscreen(), 'Plein écran');
      btnFs.addEventListener('click', () => this._toggleFullscreen());
      toolbar.appendChild(btnFs);
    }

    return toolbar;
  }

  _makeToolbarBtn(content, title) {
    const btn = document.createElement('button');
    btn.innerHTML = content;
    btn.title = title;
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: none;
      border-radius: ${this.platform === 'material' ? 4 : 6}px;
      background: transparent;
      color: white;
      cursor: pointer;
      padding: 0;
      transition: background 0.15s;
      flex-shrink: 0;
    `;
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.2)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    return btn;
  }

  _makeSep() {
    const sep = document.createElement('div');
    sep.style.cssText = `width:1px; height:24px; background:rgba(255,255,255,0.3); margin:0 4px; flex-shrink:0;`;
    return sep;
  }

  // ─── Barre de recherche ───────────────────────────────────────────────────────

  _buildSearchBar() {
    const isMat = this.platform === 'material';
    const bar = document.createElement('div');
    bar.style.cssText = `
      display: none;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: ${isMat ? this.m3Colors.surfaceVariant : '#F2F2F7'};
      border-bottom: 1px solid ${isMat ? this.m3Colors.outlineVariant : '#C6C6C8'};
      flex-shrink: 0;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Rechercher dans le document...';
    input.style.cssText = `
      flex: 1;
      border: 1px solid ${isMat ? this.m3Colors.outline : '#C6C6C8'};
      border-radius: ${isMat ? 4 : 8}px;
      padding: 6px 10px;
      font-size: 14px;
      outline: none;
      background: white;
    `;

    const btnClose = document.createElement('button');
    btnClose.innerHTML = '✕';
    btnClose.style.cssText = `
      border: none; background: transparent; cursor: pointer;
      font-size: 16px; color: ${isMat ? this.m3Colors.onSurfaceVariant : '#8E8E93'};
    `;
    btnClose.addEventListener('click', () => this._toggleSearch());

    bar.appendChild(input);
    bar.appendChild(btnClose);
    this._searchInput = input;
    return bar;
  }

  _toggleSearch() {
    this._searchOpen = !this._searchOpen;
    this._searchBarEl.style.display = this._searchOpen ? 'flex' : 'none';
    if (this._searchOpen) this._searchInput.focus();
  }

  // ─── Panneau miniatures ───────────────────────────────────────────────────────

  _buildThumbnailsPanel() {
    const isMat = this.platform === 'material';
    const panel = document.createElement('div');
    panel.style.cssText = `
      width: ${this._thumbsWidth}px;
      height: 100%;
      overflow-y: auto;
      background: ${this._colors.thumbsBg};
      border-right: 1px solid ${this._colors.thumbBorder};
      padding: 8px;
      box-sizing: border-box;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      scrollbar-width: thin;
    `;
    return panel;
  }

  // ─── Chargement PDF ───────────────────────────────────────────────────────────

  /**
   * Charge et affiche un PDF
   * @param {string|Uint8Array} src
   */
  async _loadPDF(src) {
    this.loading = true;
    this.error   = null;
    this._renderLoadingState();

    try {
      const pdfjsLib = await this._loadPDFJS();
      const loadingTask = pdfjsLib.getDocument(
        typeof src === 'string' ? src : { data: src }
      );
      this._pdfDoc = await loadingTask.promise;
      this.totalPages  = this._pdfDoc.numPages;
      this.loading     = false;

      // Met à jour toolbar
      if (this._pageTotalLabel) this._pageTotalLabel.textContent = `/ ${this.totalPages}`;

      // Met à jour le titre si URL
      if (typeof src === 'string' && this._containerEl) {
        const t = this._containerEl.querySelector('#pdf_title');
        if (t) t.textContent = src.split('/').pop();
      }

      // Vide la visionneuse
      this._viewerEl.innerHTML = '';

      // Rend toutes les pages
      for (let p = 1; p <= this.totalPages; p++) {
        await this._renderPage(p);
        if (this.showThumbnails) await this._renderThumbnail(p);
      }

      // Aller à la page initiale
      this.scrollToPage(this.currentPage);
      this.onLoad(this.totalPages);

    } catch (err) {
      this.loading = false;
      this.error   = err.message || 'Erreur lors du chargement du PDF';
      this._renderErrorState();
      this.onErrorCb(this.error);
    }
  }

  /**
   * Rend une page PDF dans la zone de visualisation
   * @param {number} pageNum
   * @private
   */
  async _renderPage(pageNum) {
    const page     = await this._pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });

    // Wrapper de page
    const pageWrapper = document.createElement('div');
    pageWrapper.id = `pdf_page_${pageNum}`;
    pageWrapper.dataset.page = pageNum;
    pageWrapper.style.cssText = `
      position: relative;
      box-shadow: 0 2px 8px ${this._colors.pageShadow};
      flex-shrink: 0;
      background: ${this.pageBackground};
      line-height: 0;
    `;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width  = viewport.width;
    pageCanvas.height = viewport.height;
    pageCanvas.style.cssText = `display: block; max-width: 100%;`;

    pageWrapper.appendChild(pageCanvas);

    // Numéro de page (en bas)
    const pageLabel = document.createElement('div');
    pageLabel.style.cssText = `
      position: absolute;
      bottom: 6px;
      right: 10px;
      font-size: 11px;
      color: #888;
      line-height: 1;
      pointer-events: none;
    `;
    pageLabel.textContent = `${pageNum} / ${this.totalPages}`;
    pageWrapper.appendChild(pageLabel);

    this._viewerEl.appendChild(pageWrapper);
    this._pageCanvases[pageNum] = pageCanvas;

    const ctx = pageCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  /**
   * Rend une miniature de page
   * @param {number} pageNum
   * @private
   */
  async _renderThumbnail(pageNum) {
    if (!this._thumbsEl) return;
    const page     = await this._pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.2 });

    const thumbWrapper = document.createElement('div');
    thumbWrapper.id = `pdf_thumb_${pageNum}`;
    thumbWrapper.dataset.page = pageNum;
    thumbWrapper.style.cssText = `
      cursor: pointer;
      border: 2px solid ${pageNum === this.currentPage ? this._colors.thumbActive : this._colors.thumbBorder};
      border-radius: 4px;
      overflow: hidden;
      transition: border-color 0.2s;
    `;
    thumbWrapper.addEventListener('click', () => {
      this.goToPage(pageNum);
      this._highlightThumbnail(pageNum);
    });

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width  = viewport.width;
    thumbCanvas.height = viewport.height;
    thumbCanvas.style.cssText = `display: block; width: 100%;`;
    thumbWrapper.appendChild(thumbCanvas);

    const numLabel = document.createElement('div');
    numLabel.style.cssText = `
      text-align: center;
      font-size: 10px;
      color: #666;
      padding: 2px;
      background: white;
    `;
    numLabel.textContent = pageNum;
    thumbWrapper.appendChild(numLabel);

    this._thumbsEl.appendChild(thumbWrapper);
    this._thumbCanvases[pageNum] = thumbWrapper;

    const ctx = thumbCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  /**
   * Met en surbrillance la miniature de la page active
   * @param {number} pageNum
   * @private
   */
  _highlightThumbnail(pageNum) {
    if (!this._thumbsEl) return;
    this._thumbsEl.querySelectorAll('[data-page]').forEach(el => {
      el.style.borderColor = this._colors.thumbBorder;
    });
    const active = this._thumbsEl.querySelector(`#pdf_thumb_${pageNum}`);
    if (active) active.style.borderColor = this._colors.thumbActive;
  }

  /**
   * Détecte la page visible lors du scroll
   * @private
   */
  _onViewerScroll() {
    if (!this._viewerEl) return;
    const scrollTop = this._viewerEl.scrollTop + this._viewerEl.clientHeight / 2;
    let nearest = 1;
    let nearestDist = Infinity;

    this._viewerEl.querySelectorAll('[data-page]').forEach(el => {
      const p    = parseInt(el.dataset.page);
      const dist = Math.abs(el.offsetTop - scrollTop);
      if (dist < nearestDist) { nearestDist = dist; nearest = p; }
    });

    if (nearest !== this.currentPage) {
      this.currentPage = nearest;
      if (this._pageInput)    this._pageInput.value = nearest;
      this.onPageChange(this.currentPage, this.totalPages);
      this._highlightThumbnail(nearest);
    }
  }

  // ─── États visuels (vide, chargement, erreur) ─────────────────────────────────

  _renderEmptyState() {
    this._viewerEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 16px; opacity: 0.5;
    `;
    wrap.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="${this._colors.onSurfaceVariant || '#49454F'}">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
        <polyline points="14,2 14,8 20,8" fill="none" stroke="white" stroke-width="1.5"/>
        <text x="7" y="19" font-size="5" fill="white" font-weight="bold">PDF</text>
      </svg>
      <p style="margin:0; font-size:15px; color:${this._colors.onSurfaceVariant || '#49454F'}">
        Aucun document chargé
      </p>
    `;
    this._viewerEl.appendChild(wrap);
  }

  _renderLoadingState() {
    this._viewerEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 16px;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 40px; height: 40px;
      border: 4px solid ${this._colors.thumbBorder};
      border-top-color: ${this._primary};
      border-radius: 50%;
      animation: pdf_spin 0.8s linear infinite;
    `;

    if (!document.querySelector('#pdf_spinner_style')) {
      const s = document.createElement('style');
      s.id = 'pdf_spinner_style';
      s.textContent = `@keyframes pdf_spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(s);
    }

    const label = document.createElement('p');
    label.style.cssText = `margin:0; font-size:15px; color:${this._colors.onSurfaceVariant || '#49454F'};`;
    label.textContent = 'Chargement du document...';

    wrap.appendChild(spinner);
    wrap.appendChild(label);
    this._viewerEl.appendChild(wrap);
  }

  _renderErrorState() {
    this._viewerEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; gap: 16px; padding: 24px;
    `;
    wrap.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="${this._colors.error || '#BA1A1A'}">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="16" r="1" fill="white"/>
      </svg>
      <p style="margin:0; font-size:15px; color:${this._colors.error || '#BA1A1A'}; text-align:center;">
        ${this.error}
      </p>
    `;

    // Bouton réessayer
    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Réessayer';
    retryBtn.style.cssText = `
      padding: 8px 20px;
      background: ${this._primary};
      color: white;
      border: none;
      border-radius: ${this.platform === 'material' ? 20 : 8}px;
      cursor: pointer;
      font-size: 14px;
    `;
    retryBtn.addEventListener('click', () => {
      if (this.src) this._loadPDF(this.src);
    });

    wrap.appendChild(retryBtn);
    this._viewerEl.appendChild(wrap);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Change le niveau de zoom
   * @param {number} newScale
   * @private
   */
  _setScale(newScale) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.scale = Math.round(this.scale * 100) / 100;
    if (this._scaleLabel) this._scaleLabel.textContent = `${Math.round(this.scale * 100)}%`;
    this.onScaleChange(this.scale);
    if (this._pdfDoc) this._reRenderAll();
  }

  /**
   * Ajuste le zoom à la largeur du viewer
   * @private
   */
  async _fitToWidth() {
    if (!this._pdfDoc) return;
    const page     = await this._pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const availW   = this._viewerEl.clientWidth - 32;
    const ratio    = availW / viewport.width;
    this._setScale(ratio);
  }

  /**
   * Re-rend toutes les pages (après zoom ou rotation)
   * @private
   */
  async _reRenderAll() {
    this._viewerEl.innerHTML = '';
    this._pageCanvases = {};
    for (let p = 1; p <= this.totalPages; p++) {
      await this._renderPage(p);
    }
    this.scrollToPage(this.currentPage);
  }

  /**
   * Effectue une rotation de 90°
   * @private
   */
  _rotate() {
    this.rotation = (this.rotation + 90) % 360;
    if (this._pdfDoc) this._reRenderAll();
  }

  /**
   * Télécharge le PDF
   * @private
   */
  _download() {
    if (!this.src || typeof this.src !== 'string') return;
    const a = document.createElement('a');
    a.href = this.src;
    a.download = this.src.split('/').pop() || 'document.pdf';
    a.click();
  }

  /**
   * Imprime le PDF
   * @private
   */
  _print() {
    if (!this.src || typeof this.src !== 'string') return;
    const w = window.open(this.src);
    if (w) w.addEventListener('load', () => w.print());
  }

  /**
   * Bascule en plein écran
   * @private
   */
  _toggleFullscreen() {
    if (!this._containerEl) return;
    this._fullscreen = !this._fullscreen;
    if (this._fullscreen) {
      this._savedStyle = {
        left: this._containerEl.style.left,
        top:  this._containerEl.style.top,
        width:this._containerEl.style.width,
        height:this._containerEl.style.height,
        zIndex:this._containerEl.style.zIndex,
        borderRadius: this._containerEl.style.borderRadius,
      };
      this._containerEl.style.cssText += `
        left: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 99999 !important;
        border-radius: 0 !important;
      `;
    } else {
      if (this._savedStyle) {
        Object.assign(this._containerEl.style, this._savedStyle);
      }
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  /**
   * Navigue vers une page spécifique
   * @param {number} page
   */
  goToPage(page) {
    if (!this._pdfDoc || page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    if (this._pageInput) this._pageInput.value = page;
    this.scrollToPage(page);
    this._highlightThumbnail(page);
    this.onPageChange(this.currentPage, this.totalPages);
  }

  /**
   * Fait défiler jusqu'à une page
   * @param {number} page
   */
  scrollToPage(page) {
    const el = this._viewerEl && this._viewerEl.querySelector(`#pdf_page_${page}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Page précédente
   */
  goToPreviousPage() {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  /**
   * Page suivante
   */
  goToNextPage() {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  // ─── API publique ─────────────────────────────────────────────────────────────

  /**
   * Charge un nouveau document PDF
   * @param {string|Uint8Array} src - URL ou données binaires
   */
  load(src) {
    this.src = src;
    if (this._viewerEl) {
      this._pdfDoc = null;
      this._pageCanvases = {};
      this._thumbCanvases = {};
      if (this._thumbsEl) this._thumbsEl.innerHTML = '';
      this._loadPDF(src);
    }
  }

  /**
   * Zoom à un niveau précis
   * @param {number} scale - Facteur de zoom (ex: 1.5 = 150%)
   */
  setScale(scale) {
    this._setScale(scale);
  }

  /**
   * Retourne les métadonnées du document
   * @returns {Promise<Object>}
   */
  async getMetadata() {
    if (!this._pdfDoc) return null;
    return this._pdfDoc.getMetadata();
  }

  // ─── SVG Icons ────────────────────────────────────────────────────────────────

  _svgChevron(dir) {
    const pts = dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6';
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
      <polyline points="${pts}"/>
    </svg>`;
  }

  _svgFit() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
      <polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>`;
  }

  _svgRotate() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
      <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.46"/>
    </svg>`;
  }

  _svgSearch() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`;
  }

  _svgDownload() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`;
  }

  _svgPrint() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>`;
  }

  _svgFullscreen() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 3 3 3 3 9"/>
      <polyline points="21 15 21 21 15 21"/><polyline points="3 15 3 21 9 21"/>
    </svg>`;
  }

  // ─── Rendu Canvas (shell) ─────────────────────────────────────────────────────

  /**
   * Rendu Canvas : monte l'overlay DOM et synchronise la position
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();

    if (!this._mounted) this._mount();

    // Synchronise la position
    if (this._containerEl) {
      const canvas = this.framework.canvas;
      const rect   = canvas.getBoundingClientRect();
      this._containerEl.style.left   = `${rect.left + this.x}px`;
      this._containerEl.style.top    = `${rect.top  + this.y - (this.framework.scrollOffset || 0)}px`;
      this._containerEl.style.width  = `${this.width}px`;
      this._containerEl.style.height = `${this.height}px`;
    }

    // Fond Canvas (zone réservée) — invisible car l'overlay DOM le couvre
    ctx.fillStyle = this.backgroundColor || this._colors.viewerBg;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.restore();
  }

  /**
   * Vérifie si un point est dans le composant
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    if (this._containerEl && this._containerEl.parentNode) {
      this._containerEl.parentNode.removeChild(this._containerEl);
    }
    this._pdfDoc      = null;
    this._mounted     = false;
    this._containerEl = null;
    super.destroy && super.destroy();
  }
}

export default PDFViewer;