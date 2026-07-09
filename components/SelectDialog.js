import Modal from '../components/Modal.js';

/**
 * Modal pour la sélection d'une option parmi une liste, avec pagination
 * @class
 * @extends Modal
 */
class SelectDialog extends Modal {
  constructor(framework, options = {}) {
    const itemHeight = 50;
    const pageSize = options.pageSize || 7;
    const visibleCount = Math.min(pageSize, options.options?.length || 0) || 1;

    // Hauteur fixe basée sur pageSize (plus besoin de calculer selon le nb total d'options)
    const dialogHeight = Math.min(
      framework.height - 40,
      visibleCount * itemHeight + 100 + 44 // +44 pour la barre de pagination en bas
    );

    super(framework, {
      title: options.title || 'Sélectionner une option',
      width: Math.min(350, framework.width - 40),
      height: dialogHeight,
      showCloseButton: true,
      closeOnOverlayClick: true,
      padding: 0,
      ...options
    });

    this.options = options.options || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onSelect = options.onSelect;
    this.itemHeight = itemHeight;
    this.hoveredIndex = -1;

    this.opacity = 1;
    this.scale = 1;
    this.isVisible = true;
    this.visible = true;

    // ── Pagination ──────────────────────────────────
    this.pageSize = pageSize;
    this.currentPage = 0;
    this.totalPages = Math.max(1, Math.ceil(this.options.length / this.pageSize));

    // Si une option est déjà sélectionnée, ouvrir sur sa page
    if (this.selectedIndex >= 0) {
      this.currentPage = Math.floor(this.selectedIndex / this.pageSize);
    }

    this.paginationBarHeight = 44;
    this.navButtonWidth = 60;

    // ✅ Flag anti-double-clic avec timestamp
    this._lastClickTime = 0;
    this._clickCooldown = 300; // 300ms de cooldown

    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
  }

  _getContentGeometry() {
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;
    const contentY = modalY + 55;
    const contentHeight = this.modalHeight - 55 - this.paginationBarHeight;
    const paginationY = modalY + this.modalHeight - this.paginationBarHeight;
    return { modalX, modalY, contentY, contentHeight, paginationY };
  }

  _getPageOptions() {
    const start = this.currentPage * this.pageSize;
    return this.options.slice(start, start + this.pageSize).map((opt, i) => ({
      option: opt,
      globalIndex: start + i
    }));
  }

  draw(ctx) {
    if (!this.isVisible) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.framework.width, this.framework.height);

    const { modalX, modalY, contentY, contentHeight, paginationY } = this._getContentGeometry();

    // Fond du modal
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    ctx.beginPath();
    this.roundRect(ctx, modalX, modalY, this.modalWidth, this.modalHeight, 12);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Titre
    if (this.title) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.title, modalX + this.modalWidth / 2, modalY + 30);

      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(modalX, modalY + 50);
      ctx.lineTo(modalX + this.modalWidth, modalY + 50);
      ctx.stroke();
    }

    // Zone de contenu (clip)
    ctx.save();
    ctx.beginPath();
    ctx.rect(modalX, contentY, this.modalWidth, contentHeight);
    ctx.clip();

    const pageItems = this._getPageOptions();

    for (let i = 0; i < pageItems.length; i++) {
      const { option, globalIndex } = pageItems[i];
      const optionY = contentY + i * this.itemHeight;

      if (globalIndex === this.selectedIndex) {
        ctx.fillStyle = this.framework.platform === 'material' ? 'rgba(98, 0, 238, 0.1)' : 'rgba(0, 122, 255, 0.1)';
        ctx.fillRect(modalX, optionY, this.modalWidth, this.itemHeight);
      }

      if (this.hoveredIndex === globalIndex) {
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(modalX, optionY, this.modalWidth, this.itemHeight);
      }

      ctx.fillStyle = globalIndex === this.selectedIndex ?
        (this.framework.platform === 'material' ? '#6200EE' : '#007AFF') :
        '#000000';
      ctx.font = globalIndex === this.selectedIndex ? 'bold 16px -apple-system, sans-serif' : '16px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(option, modalX + 20, optionY + this.itemHeight / 2);

      if (i < pageItems.length - 1) {
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(modalX + 20, optionY + this.itemHeight);
        ctx.lineTo(modalX + this.modalWidth - 20, optionY + this.itemHeight);
        ctx.stroke();
      }
    }

    ctx.restore(); // clip

    // ── Barre de pagination ──────────────────────────
    if (this.totalPages > 1) {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(modalX, paginationY);
      ctx.lineTo(modalX + this.modalWidth, paginationY);
      ctx.stroke();

      const canGoPrev = this.currentPage > 0;
      const canGoNext = this.currentPage < this.totalPages - 1;

      // Bouton précédent
      ctx.fillStyle = canGoPrev ? '#007AFF' : '#CCCCCC';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('‹ Préc.', modalX + this.navButtonWidth / 2 + 10, paginationY + this.paginationBarHeight / 2);

      // Texte page X / Y
      ctx.fillStyle = '#666666';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillText(
        `${this.currentPage + 1} / ${this.totalPages}`,
        modalX + this.modalWidth / 2,
        paginationY + this.paginationBarHeight / 2
      );

      // Bouton suivant
      ctx.fillStyle = canGoNext ? '#007AFF' : '#CCCCCC';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.fillText('Suiv. ›', modalX + this.modalWidth - this.navButtonWidth / 2 - 10, paginationY + this.paginationBarHeight / 2);
    }

    ctx.restore(); // globalAlpha
  }

  /**
   * Gère le clic dans le modal - Version avec anti-double-clic robuste
   */
  handlePress(x, y) {
    // ✅ Anti-double-clic basé sur le temps
    const now = Date.now();
    if (now - this._lastClickTime < this._clickCooldown) {
      return; // Ignorer les clics trop rapprochés
    }

    const { modalX, contentY, paginationY } = this._getContentGeometry();

    // ── Clic dans la barre de pagination ──
    if (this.totalPages > 1 && y >= paginationY && y <= paginationY + this.paginationBarHeight &&
        x >= modalX && x <= modalX + this.modalWidth) {

      if (x <= modalX + this.navButtonWidth + 10) {
        // Bouton précédent
        if (this.currentPage > 0) {
          this._lastClickTime = now; // ✅ Enregistrer le temps du clic
          this.currentPage--;
          this.hoveredIndex = -1;
        }
        return;
      }

      if (x >= modalX + this.modalWidth - this.navButtonWidth - 10) {
        // Bouton suivant
        if (this.currentPage < this.totalPages - 1) {
          this._lastClickTime = now; // ✅ Enregistrer le temps du clic
          this.currentPage++;
          this.hoveredIndex = -1;
        }
        return;
      }

      return; // clic au centre de la barre = rien
    }

    // ── Clic sur une option de la page courante ──
    const pageItems = this._getPageOptions();

    for (let i = 0; i < pageItems.length; i++) {
      const { option, globalIndex } = pageItems[i];
      const optionY = contentY + i * this.itemHeight;

      if (y >= optionY && y <= optionY + this.itemHeight &&
          x >= modalX && x <= modalX + this.modalWidth) {

        this._lastClickTime = now; // ✅ Enregistrer le temps du clic
        this.selectedIndex = globalIndex;
        if (this.onSelect) {
          this.onSelect(globalIndex, option);
        }
        this.hide();
        return;
      }
    }

    // Sinon, laisser le parent gérer (bouton de fermeture, overlay)
    super.handlePress(x, y);
  }

  /**
   * Gère le survol dans le modal
   */
  handleMove(x, y) {
    const { modalX, contentY } = this._getContentGeometry();

    this.hoveredIndex = -1;

    const pageItems = this._getPageOptions();

    for (let i = 0; i < pageItems.length; i++) {
      const { globalIndex } = pageItems[i];
      const optionY = contentY + i * this.itemHeight;

      if (y >= optionY && y <= optionY + this.itemHeight &&
          x >= modalX && x <= modalX + this.modalWidth) {
        this.hoveredIndex = globalIndex;
        break;
      }
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  isPointInside(x, y) {
    const modalX = (this.framework.width - this.modalWidth) / 2;
    const modalY = (this.framework.height - this.modalHeight) / 2;

    return x >= modalX &&
           x <= modalX + this.modalWidth &&
           y >= modalY &&
           y <= modalY + this.modalHeight;
  }

  show() {
    this.isVisible = true;
    this.visible = true;
    this.opacity = 1;
    this.scale = 1;
    // ✅ Réinitialiser le cooldown quand on affiche le modal
    this._lastClickTime = 0;
  }
}

export default SelectDialog;
