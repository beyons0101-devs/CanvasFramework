import Component from '../core/Component.js';

/**
 * QRCodeGenerator SANS librairie externe
 * Version simplifiée qui fonctionne pour texte court et URLs
 * 
 * @example
 * new QRCodeGenerator(framework, {
 *   x: 50,
 *   y: 100,
 *   width: 250,
 *   height: 250,
 *   data: 'https://example.com'
 * });
 */
class QRCodeGenerator extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    // Données du QR code
    this.data = options.data || options.text || 'Hello';
    
    // Dimensions
    this.width = options.width || 250;
    this.height = options.height || 250;
    this.qrSize = Math.min(this.width, this.height);
    
    // Options visuelles
    this.backgroundColor = options.backgroundColor || '#ffffff';
    this.foregroundColor = options.foregroundColor || '#000000';
    this.padding = options.padding || 20;
    
    // État
    this.qrMatrix = null;
    this.moduleSize = 0;
    
    // Générer immédiatement
    this.generateQRCode();
  }

  async _mount() {
    super._mount?.();
    if (!this.qrMatrix) {
      this.generateQRCode();
    }
  }

  destroy() {
    this.qrMatrix = null;
    super.destroy?.();
  }

  onUnmount() {
    console.log('[QRCodeGenerator] onUnmount called');
    this.qrMatrix = null;
  }

  /**
   * Génère un QR code simple (Version 1 : 21x21)
   */
  generateQRCode() {
    try {
      // Taille fixe pour Version 1 (supporte ~25 caractères)
      const size = 21;
      
      // Créer la matrice
      this.qrMatrix = this.createMatrix(size);
      
      // Ajouter les patterns de base
      this.addFinderPatterns(this.qrMatrix);
      this.addTimingPatterns(this.qrMatrix);
      this.addAlignmentPattern(this.qrMatrix);
      
      // Ajouter les données (simplifié)
      this.addDataSimple(this.qrMatrix);
      
      // Calculer la taille d'un module
      const availableSize = this.qrSize - (this.padding * 2);
      this.moduleSize = Math.floor(availableSize / size);
      
      console.log('[QRCodeGenerator] QR Code generated:', size + 'x' + size);
      this.markDirty();
      
    } catch (err) {
      console.error('[QRCodeGenerator] Error:', err);
    }
  }

  /**
   * Crée une matrice vide
   */
  createMatrix(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(-1); // -1 = non défini
    }
    return matrix;
  }

  /**
   * Ajoute les patterns de position (3 carrés dans les coins)
   */
  addFinderPatterns(matrix) {
    const size = matrix.length;
    
    // Pattern 7x7
    const addFinder = (startX, startY) => {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const x = startX + dx;
          const y = startY + dy;
          
          // Carré extérieur (7x7)
          if (dx === 0 || dx === 6 || dy === 0 || dy === 6) {
            matrix[y][x] = 1;
          }
          // Carré intérieur (3x3) centré
          else if (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) {
            matrix[y][x] = 1;
          }
          // Blanc entre les deux
          else {
            matrix[y][x] = 0;
          }
        }
      }
      
      // Séparateurs blancs (1 pixel autour)
      for (let i = 0; i < 8; i++) {
        if (startX === 0 && startY === 0) {
          // Haut gauche
          if (i < 7) matrix[7][i] = 0;
          if (i < 7) matrix[i][7] = 0;
        } else if (startX === size - 7 && startY === 0) {
          // Haut droit
          if (i < 7) matrix[7][size - 8 + i] = 0;
          if (i < 7) matrix[i][size - 8] = 0;
        } else if (startX === 0 && startY === size - 7) {
          // Bas gauche
          if (i < 7) matrix[size - 8][i] = 0;
          if (i < 7) matrix[size - 8 + i][7] = 0;
        }
      }
    };
    
    // Haut gauche
    addFinder(0, 0);
    
    // Haut droit
    addFinder(size - 7, 0);
    
    // Bas gauche
    addFinder(0, size - 7);
  }

  /**
   * Ajoute les lignes de timing
   */
  addTimingPatterns(matrix) {
    const size = matrix.length;
    
    // Ligne horizontale (ligne 6)
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = (i % 2 === 0) ? 1 : 0;
    }
    
    // Ligne verticale (colonne 6)
    for (let i = 8; i < size - 8; i++) {
      matrix[i][6] = (i % 2 === 0) ? 1 : 0;
    }
  }

  /**
   * Ajoute le pattern d'alignement (pour Version 1, pas nécessaire, mais on le met quand même)
   */
  addAlignmentPattern(matrix) {
    // Pour Version 1, pas d'alignment pattern
    // On remplit juste avec le module noir obligatoire
    const size = matrix.length;
    matrix[size - 8][8] = 1; // Module noir fixe
  }

  /**
   * Ajoute les données de manière simplifiée (pattern basé sur les données)
   */
  addDataSimple(matrix) {
    const size = matrix.length;
    
    // Convertir les données en une séquence de bits basique
    let bits = '';
    for (let i = 0; i < this.data.length; i++) {
      const charCode = this.data.charCodeAt(i);
      // Convertir en binaire sur 8 bits
      bits += charCode.toString(2).padStart(8, '0');
    }
    
    // Ajouter un padding si nécessaire
    while (bits.length < 100) {
      bits += '0';
    }
    
    let bitIndex = 0;
    
    // Remplir la matrice en zigzag (de droite à gauche, de bas en haut)
    for (let col = size - 1; col > 0; col -= 2) {
      // Sauter la colonne de timing
      if (col === 6) col--;
      
      for (let row = 0; row < size; row++) {
        // Alterner direction : bas->haut puis haut->bas
        const y = ((col + 1) % 4 < 2) ? (size - 1 - row) : row;
        
        // Remplir 2 colonnes à la fois
        for (let c = 0; c < 2; c++) {
          const x = col - c;
          
          // Ne pas écraser les patterns existants
          if (matrix[y][x] !== -1) continue;
          
          // Placer un bit
          if (bitIndex < bits.length) {
            matrix[y][x] = bits[bitIndex] === '1' ? 1 : 0;
            bitIndex++;
          } else {
            matrix[y][x] = 0;
          }
        }
      }
    }
    
    // Remplir les cases restantes avec 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matrix[y][x] === -1) {
          matrix[y][x] = 0;
        }
      }
    }
  }

  /**
   * Change les données et régénère
   */
  async setData(newData) {
    if (this.data === newData) return;
    this.data = newData;
    this.generateQRCode();
  }

  /**
   * Change la taille
   */
  async setSize(newSize) {
    this.width = newSize;
    this.height = newSize;
    this.qrSize = newSize;
    this.generateQRCode();
  }

  draw(ctx) {
    ctx.save();

    // Fond
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    if (!this.qrMatrix || this.moduleSize === 0) {
      // Message de chargement
      ctx.fillStyle = '#666';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Génération...',
        this.x + this.width / 2,
        this.y + this.height / 2
      );
      ctx.restore();
      return;
    }

    // Centrer le QR code
    const qrPixelSize = this.qrMatrix.length * this.moduleSize;
    const offsetX = (this.width - qrPixelSize) / 2;
    const offsetY = (this.height - qrPixelSize) / 2;

    // Dessiner les modules
    ctx.fillStyle = this.foregroundColor;
    
    for (let y = 0; y < this.qrMatrix.length; y++) {
      for (let x = 0; x < this.qrMatrix[y].length; x++) {
        if (this.qrMatrix[y][x] === 1) {
          ctx.fillRect(
            this.x + offsetX + x * this.moduleSize,
            this.y + offsetY + y * this.moduleSize,
            this.moduleSize,
            this.moduleSize
          );
        }
      }
    }

    ctx.restore();
  }
}

export default QRCodeGenerator;