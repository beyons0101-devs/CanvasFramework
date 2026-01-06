import Component from '../core/Component.js';

/**
 * Zone de téléchargement de fichiers avec drag & drop
 * @class
 * @extends Component
 * @property {string} label - Texte affiché
 * @property {string} sublabel - Sous-texte
 * @property {string} accept - Types de fichiers acceptés
 * @property {boolean} multiple - Accepter plusieurs fichiers
 * @property {number} maxSize - Taille max en bytes
 * @property {Array} files - Fichiers sélectionnés
 * @property {boolean} isDragOver - État de survol
 * @property {string} borderColor - Couleur de bordure
 * @property {string} bgColor - Couleur de fond
 * @property {string} iconColor - Couleur de l'icône
 * @property {Function} onFilesSelected - Callback
 * @property {Function} onError - Callback d'erreur
 */
class FileUpload extends Component {
  /**
   * Crée une instance de FileUpload
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.label='Drag & drop files here'] - Label
   * @param {string} [options.sublabel='or click to browse'] - Sublabel
   * @param {string} [options.accept='*'] - Types acceptés
   * @param {boolean} [options.multiple=true] - Multiple fichiers
   * @param {number} [options.maxSize=10485760] - Taille max (10MB)
   * @param {Function} [options.onFilesSelected] - Callback
   * @param {Function} [options.onError] - Callback erreur
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.label = options.label || 'Drag & drop files here';
    this.sublabel = options.sublabel || 'or click to browse';
    this.accept = options.accept || '*';
    this.multiple = options.multiple !== false;
    this.maxSize = options.maxSize || 10485760; // 10MB
    this.files = [];
    this.isDragOver = false;
    
    const platform = framework.platform;
    
    // Styles selon la plateforme
    if (platform === 'material') {
      this.borderColor = '#6200EE';
      this.bgColor = 'rgba(98, 0, 238, 0.05)';
      this.iconColor = '#6200EE';
      this.borderRadius = 4;
      this.borderWidth = 2;
    } else {
      this.borderColor = '#007AFF';
      this.bgColor = 'rgba(0, 122, 255, 0.05)';
      this.iconColor = '#007AFF';
      this.borderRadius = 12;
      this.borderWidth = 2;
    }
    
    this.onFilesSelected = options.onFilesSelected || null;
    this.onError = options.onError || null;
    
    // Créer un input file caché
    this.createFileInput();
  }

  /**
   * Crée l'input file HTML caché
   * @private
   */
  createFileInput() {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = this.accept;
    this.fileInput.multiple = this.multiple;
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
    
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
    });
  }

  /**
   * Gère les fichiers sélectionnés
   * @param {Array} fileList - Liste des fichiers
   * @private
   */
  handleFiles(fileList) {
    const validFiles = [];
    
    for (let file of fileList) {
      // Vérifier la taille
      if (file.size > this.maxSize) {
        if (this.onError) {
          this.onError({
            type: 'size',
            message: `${file.name} exceeds max size of ${this.formatBytes(this.maxSize)}`,
            file: file
          });
        }
        continue;
      }
      
      // Vérifier le type si spécifié
      if (this.accept !== '*') {
        const acceptedTypes = this.accept.split(',').map(t => t.trim());
        const fileType = file.type;
        const fileExt = '.' + file.name.split('.').pop();
        
        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExt === type;
          } else if (type.endsWith('/*')) {
            return fileType.startsWith(type.replace('/*', ''));
          } else {
            return fileType === type;
          }
        });
        
        if (!isAccepted) {
          if (this.onError) {
            this.onError({
              type: 'type',
              message: `${file.name} is not an accepted file type`,
              file: file
            });
          }
          continue;
        }
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      this.files = validFiles;
      if (this.onFilesSelected) {
        this.onFilesSelected(validFiles);
      }
    }
    
    // Reset input
    this.fileInput.value = '';
  }

  /**
   * Formate les bytes en format lisible
   * @param {number} bytes - Nombre de bytes
   * @returns {string} Taille formatée
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Dessine le composant
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Fond
    ctx.fillStyle = this.isDragOver || this.pressed ? 
      this.lightenColor(this.bgColor) : this.bgColor;
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();
    
    // Bordure en pointillés
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    this.roundRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Icône de fichier (simple)
    const iconSize = 40;
    const iconX = this.x + this.width / 2 - iconSize / 2;
    const iconY = this.y + this.height / 2 - 40;
    
    ctx.strokeStyle = this.iconColor;
    ctx.lineWidth = 3;
    
    // Document
    ctx.beginPath();
    ctx.moveTo(iconX, iconY);
    ctx.lineTo(iconX + iconSize * 0.7, iconY);
    ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.3);
    ctx.lineTo(iconX + iconSize, iconY + iconSize);
    ctx.lineTo(iconX, iconY + iconSize);
    ctx.closePath();
    ctx.stroke();
    
    // Coin plié
    ctx.beginPath();
    ctx.moveTo(iconX + iconSize * 0.7, iconY);
    ctx.lineTo(iconX + iconSize * 0.7, iconY + iconSize * 0.3);
    ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.3);
    ctx.stroke();
    
    // Flèche montante
    const arrowX = iconX + iconSize / 2;
    const arrowY = iconY + iconSize * 0.5;
    const arrowSize = 12;
    
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - arrowSize);
    ctx.lineTo(arrowX, arrowY + arrowSize);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(arrowX - arrowSize / 2, arrowY - arrowSize / 2);
    ctx.lineTo(arrowX, arrowY - arrowSize);
    ctx.lineTo(arrowX + arrowSize / 2, arrowY - arrowSize / 2);
    ctx.stroke();
    
    // Texte
    ctx.fillStyle = '#000000';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2 + 30);
    
    ctx.fillStyle = '#666666';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.fillText(this.sublabel, this.x + this.width / 2, this.y + this.height / 2 + 52);
    
    // Afficher les fichiers sélectionnés
    if (this.files.length > 0) {
      ctx.fillStyle = this.borderColor;
      ctx.font = '12px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
      const fileText = this.files.length === 1 ? 
        this.files[0].name : 
        `${this.files.length} files selected`;
      ctx.fillText(fileText, this.x + this.width / 2, this.y + this.height - 20);
    }
    
    ctx.restore();
  }

  /**
   * Dessine un rectangle avec coins arrondis
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {number} width - Largeur
   * @param {number} height - Hauteur
   * @param {number} radius - Rayon des coins
   * @private
   */
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

  /**
   * Éclaircit une couleur
   * @param {string} color - Couleur
   * @returns {string} Couleur éclaircie
   * @private
   */
  lightenColor(color) {
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, '0.15)');
    }
    return color;
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le composant
   */
  isPointInside(x, y) {
    return x >= this.x && 
           x <= this.x + this.width && 
           y >= this.y && 
           y <= this.y + this.height;
  }
  
  /**
   * Override du onClick pour ouvrir le file picker
   */
  onClick() {
    this.fileInput.click();
  }

  /**
   * Nettoie le composant
   */
  destroy() {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput);
    }
  }
}

export default FileUpload;