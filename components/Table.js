import Component from '../core/Component.js';

/**
 * Tableau avec tri, pagination et sélection
 * @class
 * @extends Component
 * @property {Array} columns - Définition des colonnes
 * @property {Array} data - Données du tableau
 * @property {boolean} sortable - Activation du tri
 * @property {boolean} paginated - Activation de la pagination
 * @property {number} rowsPerPage - Lignes par page
 * @property {number} currentPage - Page actuelle
 * @property {string} sortColumn - Colonne de tri
 * @property {string} sortDirection - Direction du tri
 * @property {Set} selectedRows - Lignes sélectionnées
 * @property {boolean} selectable - Sélection activée
 * @property {number} headerHeight - Hauteur de l'en-tête
 * @property {number} rowHeight - Hauteur des lignes
 * @property {string} headerBg - Couleur fond en-tête
 * @property {string} rowBg - Couleur fond ligne
 * @property {string} rowAltBg - Couleur fond ligne alternée
 * @property {Function} onRowClick - Callback clic ligne
 * @property {Function} onSelectionChange - Callback sélection
 */
class Table extends Component {
  /**
   * Crée une instance de Table
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.columns=[]] - Colonnes [{key, label, width, sortable}]
   * @param {Array} [options.data=[]] - Données
   * @param {boolean} [options.sortable=true] - Tri activé
   * @param {boolean} [options.paginated=false] - Pagination
   * @param {number} [options.rowsPerPage=10] - Lignes par page
   * @param {boolean} [options.selectable=false] - Sélection
   * @param {number} [options.headerHeight=48] - Hauteur en-tête
   * @param {number} [options.rowHeight=48] - Hauteur ligne
   * @param {Function} [options.onRowClick] - Callback clic
   * @param {Function} [options.onSelectionChange] - Callback sélection
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.columns = options.columns || [];
    this.data = options.data || [];
    this.sortable = options.sortable !== false;
    this.paginated = options.paginated || false;
    this.rowsPerPage = options.rowsPerPage || 10;
    this.currentPage = 0;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.selectedRows = new Set();
    this.selectable = options.selectable || false;
    this.headerHeight = options.headerHeight || 48;
    this.rowHeight = options.rowHeight || 48;
    
    this.onRowClick = options.onRowClick || null;
    this.onSelectionChange = options.onSelectionChange || null;
    
    const platform = framework.platform;
    
    // Styles selon la plateforme
    if (platform === 'material') {
      this.headerBg = '#FAFAFA';
      this.rowBg = '#FFFFFF';
      this.rowAltBg = '#F5F5F5';
      this.borderColor = 'rgba(0, 0, 0, 0.12)';
      this.textColor = '#000000';
      this.headerTextColor = '#616161';
      this.selectedBg = 'rgba(98, 0, 238, 0.08)';
      this.hoverBg = 'rgba(0, 0, 0, 0.04)';
    } else {
      this.headerBg = '#F2F2F7';
      this.rowBg = '#FFFFFF';
      this.rowAltBg = '#F9F9F9';
      this.borderColor = 'rgba(60, 60, 67, 0.29)';
      this.textColor = '#000000';
      this.headerTextColor = '#6C6C70';
      this.selectedBg = 'rgba(0, 122, 255, 0.1)';
      this.hoverBg = 'rgba(0, 0, 0, 0.03)';
    }
    
    // Calculer les largeurs de colonnes
    this.calculateColumnWidths();
    
    // Calculer la hauteur totale
    this.updateHeight();
    
    // Hover state
    this.hoveredRow = -1;
  }

  /**
   * Calcule les largeurs de colonnes
   * @private
   */
  calculateColumnWidths() {
    const totalWidth = this.width - (this.selectable ? 48 : 0);
    const definedWidth = this.columns.reduce((sum, col) => sum + (col.width || 0), 0);
    const undefinedCols = this.columns.filter(col => !col.width).length;
    const autoWidth = undefinedCols > 0 ? (totalWidth - definedWidth) / undefinedCols : 0;
    
    this.columns.forEach(col => {
      if (!col.width) col.width = autoWidth;
    });
  }

  /**
   * Met à jour la hauteur du tableau
   * @private
   */
  updateHeight() {
    const visibleRows = this.paginated ? 
      Math.min(this.rowsPerPage, this.data.length) : 
      this.data.length;
    this.height = this.headerHeight + (visibleRows * this.rowHeight) + 
                  (this.paginated ? 48 : 0); // Pagination bar
  }

  /**
   * Trie les données
   * @param {string} columnKey - Clé de la colonne
   * @private
   */
  sortData(columnKey) {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }
    
    this.data.sort((a, b) => {
      const aVal = a[columnKey];
      const bVal = b[columnKey];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (this.sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }

  /**
   * Change de page
   * @param {number} page - Numéro de page
   * @private
   */
  changePage(page) {
    const maxPage = Math.ceil(this.data.length / this.rowsPerPage) - 1;
    this.currentPage = Math.max(0, Math.min(page, maxPage));
  }

  /**
   * Obtient les lignes visibles
   * @returns {Array} Lignes visibles
   * @private
   */
  getVisibleRows() {
    if (!this.paginated) return this.data;
    const start = this.currentPage * this.rowsPerPage;
    return this.data.slice(start, start + this.rowsPerPage);
  }

  /**
   * Dessine le tableau
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Bordure du tableau
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // En-tête
    this.drawHeader(ctx);
    
    // Lignes
    const visibleRows = this.getVisibleRows();
    visibleRows.forEach((row, index) => {
      this.drawRow(ctx, row, index);
    });
    
    // Pagination
    if (this.paginated) {
      this.drawPagination(ctx);
    }
    
    ctx.restore();
  }

  /**
   * Dessine l'en-tête
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawHeader(ctx) {
    // Fond
    ctx.fillStyle = this.headerBg;
    ctx.fillRect(this.x, this.y, this.width, this.headerHeight);
    
    // Bordure inférieure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.headerHeight);
    ctx.lineTo(this.x + this.width, this.y + this.headerHeight);
    ctx.stroke();
    
    let currentX = this.x;
    
    // Checkbox pour sélectionner tout
    if (this.selectable) {
      const checkboxSize = 20;
      const checkboxX = currentX + 14;
      const checkboxY = this.y + this.headerHeight / 2 - checkboxSize / 2;
      
      const allSelected = this.data.length > 0 && 
                         this.selectedRows.size === this.data.length;
      
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
      
      if (allSelected) {
        ctx.fillStyle = '#6200EE';
        ctx.fillRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(checkboxX + 5, checkboxY + 10);
        ctx.lineTo(checkboxX + 8, checkboxY + 13);
        ctx.lineTo(checkboxX + 15, checkboxY + 6);
        ctx.stroke();
      }
      
      currentX += 48;
    }
    
    // Colonnes
    ctx.fillStyle = this.headerTextColor;
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    this.columns.forEach((col, index) => {
      // Texte
      ctx.fillText(
        col.label, 
        currentX + 16, 
        this.y + this.headerHeight / 2
      );
      
      // Indicateur de tri
      if (this.sortable && col.sortable !== false && this.sortColumn === col.key) {
        const arrowX = currentX + ctx.measureText(col.label).width + 24;
        const arrowY = this.y + this.headerHeight / 2;
        
        ctx.beginPath();
        if (this.sortDirection === 'asc') {
          ctx.moveTo(arrowX, arrowY + 3);
          ctx.lineTo(arrowX + 4, arrowY - 3);
          ctx.lineTo(arrowX + 8, arrowY + 3);
        } else {
          ctx.moveTo(arrowX, arrowY - 3);
          ctx.lineTo(arrowX + 4, arrowY + 3);
          ctx.lineTo(arrowX + 8, arrowY - 3);
        }
        ctx.stroke();
      }
      
      // Bordure verticale
      if (index < this.columns.length - 1) {
        ctx.strokeStyle = this.borderColor;
        ctx.beginPath();
        ctx.moveTo(currentX + col.width, this.y);
        ctx.lineTo(currentX + col.width, this.y + this.headerHeight);
        ctx.stroke();
      }
      
      currentX += col.width;
    });
  }

  /**
   * Dessine une ligne
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {Object} row - Données de la ligne
   * @param {number} index - Index de la ligne
   * @private
   */
  drawRow(ctx, row, index) {
    const rowY = this.y + this.headerHeight + (index * this.rowHeight);
    const isSelected = this.selectedRows.has(row);
    const isHovered = this.hoveredRow === index;
    
    // Fond
    let bgColor = this.rowBg;
    if (isSelected) {
      bgColor = this.selectedBg;
    } else if (isHovered) {
      bgColor = this.hoverBg;
    } else if (index % 2 === 1) {
      bgColor = this.rowAltBg;
    }
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(this.x, rowY, this.width, this.rowHeight);
    
    // Bordure inférieure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, rowY + this.rowHeight);
    ctx.lineTo(this.x + this.width, rowY + this.rowHeight);
    ctx.stroke();
    
    let currentX = this.x;
    
    // Checkbox
    if (this.selectable) {
      const checkboxSize = 20;
      const checkboxX = currentX + 14;
      const checkboxY = rowY + this.rowHeight / 2 - checkboxSize / 2;
      
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
      
      if (isSelected) {
        ctx.fillStyle = '#6200EE';
        ctx.fillRect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(checkboxX + 5, checkboxY + 10);
        ctx.lineTo(checkboxX + 8, checkboxY + 13);
        ctx.lineTo(checkboxX + 15, checkboxY + 6);
        ctx.stroke();
      }
      
      currentX += 48;
    }
    
    // Cellules
    ctx.fillStyle = this.textColor;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    this.columns.forEach((col, colIndex) => {
      const cellValue = String(row[col.key] || '');
      const maxWidth = col.width - 32;
      
      // Tronquer le texte si nécessaire
      let displayText = cellValue;
      if (ctx.measureText(displayText).width > maxWidth) {
        while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1);
        }
        displayText += '...';
      }
      
      ctx.fillText(
        displayText,
        currentX + 16,
        rowY + this.rowHeight / 2
      );
      
      // Bordure verticale
      if (colIndex < this.columns.length - 1) {
        ctx.strokeStyle = this.borderColor;
        ctx.beginPath();
        ctx.moveTo(currentX + col.width, rowY);
        ctx.lineTo(currentX + col.width, rowY + this.rowHeight);
        ctx.stroke();
      }
      
      currentX += col.width;
    });
  }

  /**
   * Dessine la pagination
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @private
   */
  drawPagination(ctx) {
    const paginationY = this.y + this.height - 48;
    const totalPages = Math.ceil(this.data.length / this.rowsPerPage);
    
    // Fond
    ctx.fillStyle = this.headerBg;
    ctx.fillRect(this.x, paginationY, this.width, 48);
    
    // Bordure supérieure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, paginationY);
    ctx.lineTo(this.x + this.width, paginationY);
    ctx.stroke();
    
    // Texte
    ctx.fillStyle = this.textColor;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const start = this.currentPage * this.rowsPerPage + 1;
    const end = Math.min((this.currentPage + 1) * this.rowsPerPage, this.data.length);
    const text = `${start}-${end} of ${this.data.length}`;
    
    ctx.fillText(text, this.x + this.width / 2, paginationY + 24);
    
    // Boutons prev/next (simples flèches)
    const arrowSize = 20;
    const prevX = this.x + this.width - 100;
    const nextX = this.x + this.width - 50;
    const arrowY = paginationY + 24;
    
    // Prev
    ctx.strokeStyle = this.currentPage > 0 ? this.textColor : this.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prevX + 8, arrowY - 6);
    ctx.lineTo(prevX, arrowY);
    ctx.lineTo(prevX + 8, arrowY + 6);
    ctx.stroke();
    
    // Next
    ctx.strokeStyle = this.currentPage < totalPages - 1 ? this.textColor : this.borderColor;
    ctx.beginPath();
    ctx.moveTo(nextX - 8, arrowY - 6);
    ctx.lineTo(nextX, arrowY);
    ctx.lineTo(nextX - 8, arrowY + 6);
    ctx.stroke();
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le tableau
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }

  /**
   * Gère le clic
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  onClick() {
    // Implémenté dans checkComponentsAtPosition
  }

  /**
   * Gère le mouvement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  onMove(x, y) {
    const relY = y - this.y - this.headerHeight;
    const rowIndex = Math.floor(relY / this.rowHeight);
    
    const visibleRows = this.getVisibleRows();
    if (rowIndex >= 0 && rowIndex < visibleRows.length) {
      this.hoveredRow = rowIndex;
    } else {
      this.hoveredRow = -1;
    }
  }
}

export default Table;