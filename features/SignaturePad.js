import Component from '../core/Component.js';

/**
 * Pad de signature électronique
 * @class
 * @extends Component
 */
class SignaturePad extends Component {
  constructor(framework, options = {}) {
    super(framework, {
      width: options.width || 300,
      height: options.height || 200,
      ...options
    });
    
    this.points = [];
    this.isDrawing = false;
    this.strokeColor = options.strokeColor || '#000000';
    this.strokeWidth = options.strokeWidth || 3; // Plus épais par défaut
    this.backgroundColor = options.backgroundColor || '#FFFFFF';
    this.onSignatureChange = options.onSignatureChange;
    this.lastPoint = null;
    
    // Canvas interne pour stocker la signature
    this.signatureCanvas = document.createElement('canvas');
    this.signatureCanvas.width = this.width;
    this.signatureCanvas.height = this.height;
    this.signatureCtx = this.signatureCanvas.getContext('2d');
    
    // IMPORTANT: Configurer le contexte UNE SEULE FOIS
    this.signatureCtx.strokeStyle = this.strokeColor;
    this.signatureCtx.fillStyle = this.strokeColor;
    this.signatureCtx.lineWidth = this.strokeWidth;
    this.signatureCtx.lineCap = 'round';
    this.signatureCtx.lineJoin = 'round';
    
    // Initialiser le canvas
    this.clearSignature();
    
    // Bind des méthodes
    this.handlePress = this.handlePress.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleRelease = this.handleRelease.bind(this);
    
    // IMPORTANT: Définir les handlers pour le framework
    this.onPress = this.handlePress;
    this.onMove = this.handleMove;
    this.onRelease = this.handleRelease;
  }

  /**
   * Gère le début du dessin
   */
  handlePress(x, y) {
    if (!this.isPointInside(x, y)) return false;
    
    this.isDrawing = true;
    const relativeX = x - this.x;
    const relativeY = (y - this.framework.scrollOffset) - this.y;
    
    // Stocker le point
    this.lastPoint = { x: relativeX, y: relativeY };
    this.points.push([{ x: relativeX, y: relativeY }]);
    
    // Dessiner un point initial
    this.signatureCtx.fillStyle = this.strokeColor;
    this.signatureCtx.beginPath();
    this.signatureCtx.arc(relativeX, relativeY, this.strokeWidth / 2, 0, Math.PI * 2);
    this.signatureCtx.fill();
    
    return true;
  }

  /**
   * Gère le dessin
   */
  handleMove(x, y) {
    if (!this.isDrawing) return false;
    
    const relativeX = x - this.x;
    const relativeY = (y - this.framework.scrollOffset) - this.y;
    
    // S'assurer que les coordonnées sont dans les limites
    if (relativeX < 0 || relativeX > this.width || 
        relativeY < 0 || relativeY > this.height) {
      return false;
    }
    
    // OPTIMISATION: Dessiner directement sans vérifications lourdes
    this.signatureCtx.beginPath();
    this.signatureCtx.moveTo(this.lastPoint.x, this.lastPoint.y);
    this.signatureCtx.lineTo(relativeX, relativeY);
    this.signatureCtx.stroke();
    
    // Ajouter le point (simplifié)
    if (this.points.length > 0) {
      this.points[this.points.length - 1].push({ x: relativeX, y: relativeY });
    }
    
    // Mettre à jour le dernier point
    this.lastPoint = { x: relativeX, y: relativeY };
    
    return true;
  }

  /**
   * Gère la fin du dessin
   */
  handleRelease(x, y) {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.lastPoint = null;
      
      // Callback seulement à la fin
      if (this.onSignatureChange) {
        this.onSignatureChange(this.points);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Efface la signature
   */
  clear() {
    this.points = [];
    this.clearSignature();
    
    if (this.onSignatureChange) {
      this.onSignatureChange([]);
    }
  }

  /**
   * Efface le canvas interne
   */
  clearSignature() {
    this.signatureCtx.fillStyle = this.backgroundColor;
    this.signatureCtx.fillRect(0, 0, this.width, this.height);
    
    // Réinitialiser le style du trait
    this.signatureCtx.strokeStyle = this.strokeColor;
    this.signatureCtx.fillStyle = this.strokeColor;
    this.signatureCtx.lineWidth = this.strokeWidth;
    this.signatureCtx.lineCap = 'round';
    this.signatureCtx.lineJoin = 'round';
  }

  /**
   * Récupère la signature comme Data URL
   */
  getSignatureAsDataURL(type = 'image/png', quality = 1.0) {
    return this.signatureCanvas.toDataURL(type, quality);
  }

  /**
   * Récupère la signature comme blob
   */
  getSignatureAsBlob(callback, type = 'image/png', quality = 1.0) {
    this.signatureCanvas.toBlob(callback, type, quality);
  }

  /**
   * Vérifie si la signature est vide
   */
  isEmpty() {
    return this.points.length === 0 || this.points.every(stroke => stroke.length === 0);
  }

  /**
   * Dessine le composant
   */
  draw(ctx) {
    ctx.save();
    
    // Fond du pad avec bordure visible
    ctx.fillStyle = this.backgroundColor;
    ctx.strokeStyle = '#2196F3'; // Bleu pour voir le pad
    ctx.lineWidth = 2;
    
    // Rectangle avec bordure
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Ligne de signature (guide)
    ctx.strokeStyle = '#DDDDDD';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.x + 20, this.y + this.height - 40);
    ctx.lineTo(this.x + this.width - 20, this.y + this.height - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Texte indicatif
    if (this.isEmpty()) {
      ctx.fillStyle = '#999999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Signez ici', this.x + this.width / 2, this.y + this.height / 2);
    }
    
    // Dessiner la signature depuis le canvas interne
    ctx.drawImage(this.signatureCanvas, this.x, this.y);
    
    // Indicateur de dessin en cours
    if (this.isDrawing && this.lastPoint) {
      ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
      ctx.beginPath();
      ctx.arc(
        this.x + this.lastPoint.x, 
        this.y + this.lastPoint.y, 
        this.strokeWidth * 3, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
    }
    
    // DEBUG: Afficher les coordonnées
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(
      `x:${this.x} y:${this.y} ${this.width}x${this.height}`, 
      this.x + 5, 
      this.y + 15
    );
    
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans les limites
   */
  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    return x >= this.x && 
           x <= this.x + this.width && 
           adjustedY >= this.y && 
           adjustedY <= this.y + this.height;
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.signatureCanvas.width = 0;
    this.signatureCanvas.height = 0;
    super.destroy && super.destroy();
  }
}

export default SignaturePad;