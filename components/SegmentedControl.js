import Component from '../core/Component.js';

/**
 * Segmented Control (Material + Cupertino)
 * @class
 * @extends Component
 * @param {CanvasFramework} framework - Instance du framework
 * @param {Object} [options={}] - Options de configuration
 * @param {Array<{text: string, onClick?: Function}>} [options.buttons] - Liste des segments
 * @param {number} [options.selectedIndex=0] - Segment sélectionné par défaut
 * @param {number} [options.height=40] - Hauteur du contrôle
 * @param {number} [options.spacing=1] - Espacement entre les segments
 */
class SegmentedControl extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.platform = framework.platform;
    this.buttons = options.buttons || [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }];
    this.selectedIndex = options.selectedIndex || 0;
    this.height = options.height || 40;
    this.spacing = options.spacing || 1;
    
    // IMPORTANT: Lier les handlers d'événements
    this.onPress = this.handlePress.bind(this);
    this.onRelease = this.handleRelease.bind(this);
    
    // État pour les animations
    this.ripples = [];
    this.pressedIndex = null;
    this._isAnimating = false;
    
  }

  /**
   * Gère la pression sur un segment
   * @param {number} x - Coordonnée X du clic
   * @param {number} y - Coordonnée Y du clic
   * @returns {boolean} True si un segment a été cliqué
   */
  handlePress(x, y) {
    const index = this.getButtonIndexAt(x, y);
    
    if (index !== null) {
      // Sauvegarder l'index pressé pour l'animation
      this.pressedIndex = index;
      
      // Pour Material: créer un ripple
      if (this.platform === 'material') {
        const btnWidth = (this.width - this.spacing * (this.buttons.length - 1)) / this.buttons.length;
        const btnX = this.x + index * (btnWidth + this.spacing);
        
        this.ripples.push({
          x: x - btnX, // Position relative au bouton
          y: y - this.y, // Position relative au bouton
          index: index,
          radius: 0,
          maxRadius: Math.max(btnWidth, this.height) * 1.5,
          opacity: 0.3,
          startTime: Date.now()
        });
        
        // Démarrer l'animation si pas déjà en cours
        if (!this._isAnimating) {
          this._animate();
        }
      }
      
      // Sélectionner le segment
      this.selectedIndex = index;
      
      // Forcer le redessin immédiat
      this._requestRedraw();
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Gère le relâchement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  handleRelease(x, y) {
    const index = this.getButtonIndexAt(x, y);
    
    if (index !== null && index === this.pressedIndex) {
      // Appeler le callback si défini
      if (this.buttons[index].onClick) {
        this.buttons[index].onClick(index);
      }
    }
    
    // Réinitialiser l'index pressé
    this.pressedIndex = null;
    
    // Forcer le redessin
    this._requestRedraw();
  }

  /**
   * Anime les ripples Material
   * @private
   */
  _animate() {
    this._isAnimating = true;
    
    const animateFrame = () => {
      let hasActiveRipples = false;
      const now = Date.now();
      
      // Mettre à jour tous les ripples
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        const elapsed = now - ripple.startTime;
        
        // Animation sur 600ms
        const progress = Math.min(elapsed / 600, 1);
        
        // Équation d'easing
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // Mettre à jour le rayon
        ripple.radius = ripple.maxRadius * easedProgress;
        
        // Diminuer l'opacité après 50% de progression
        if (progress > 0.5) {
          ripple.opacity = 0.3 * (1 - (progress - 0.5) * 2);
        }
        
        // Supprimer les ripples terminés
        if (progress >= 1) {
          this.ripples.splice(i, 1);
        } else {
          hasActiveRipples = true;
        }
      }
      
      // Redessiner si il y a des ripples actifs
      if (hasActiveRipples) {
        this._requestRedraw();
        requestAnimationFrame(animateFrame);
      } else {
        this._isAnimating = false;
      }
    };
    
    requestAnimationFrame(animateFrame);
  }

  /**
   * Retourne l'index du bouton sous un point donné
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {number|null} Index du segment ou null
   * @private
   */
  getButtonIndexAt(x, y) {
    // Vérifier si dans les limites verticales
    if (y < this.y || y > this.y + this.height) {
      return null;
    }
    
    const btnWidth = (this.width - this.spacing * (this.buttons.length - 1)) / this.buttons.length;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const btnX = this.x + i * (btnWidth + this.spacing);
      
      // Vérifier si dans les limites horizontales du bouton
      if (x >= btnX && x <= btnX + btnWidth) {
        return i;
      }
    }
    
    return null;
  }
  
  /**
   * Force le redessin du composant
   * @private
   */
  _requestRedraw() {
    if (this.framework && this.framework.markComponentDirty) {
      this.framework.markComponentDirty(this);
    }
  }

  /**
   * Dessine le SegmentedControl
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    const btnWidth = (this.width - this.spacing * (this.buttons.length - 1)) / this.buttons.length;
    const radius = this.height / 2;
    
    // Dessiner tous les boutons
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const btnX = this.x + i * (btnWidth + this.spacing);
      
      // Couleurs selon la plateforme et l'état
      let backgroundColor;
      let textColor;
      
      if (this.platform === 'material') {
        // Material Design
        if (this.selectedIndex === i) {
          backgroundColor = '#6200EE'; // Violet Material
          textColor = '#FFFFFF';
        } else {
          backgroundColor = '#E0E0E0'; // Gris clair
          textColor = '#000000';
        }
        
        // Si pressé (mais pas encore sélectionné)
        if (this.pressedIndex === i && this.pressedIndex !== this.selectedIndex) {
          backgroundColor = 'rgba(98, 0, 238, 0.12)'; // Violet très transparent
        }
      } else {
        // iOS/Cupertino
        if (this.selectedIndex === i) {
          backgroundColor = '#007AFF'; // Bleu iOS
          textColor = '#FFFFFF';
        } else {
          backgroundColor = '#F0F0F0'; // Gris très clair iOS
          textColor = '#000000';
        }
        
        // Si pressé
        if (this.pressedIndex === i) {
          backgroundColor = this.selectedIndex === i ? '#0056CC' : '#D9D9D9';
        }
      }
      
      // Dessiner le fond du bouton
      ctx.fillStyle = backgroundColor;
      
      // Coins arrondis selon la position
      ctx.beginPath();
      
      if (i === 0 && i === this.buttons.length - 1) {
        // Un seul bouton - tous les coins arrondis
        ctx.moveTo(btnX + radius, this.y);
        ctx.lineTo(btnX + btnWidth - radius, this.y);
        ctx.quadraticCurveTo(btnX + btnWidth, this.y, btnX + btnWidth, this.y + radius);
        ctx.lineTo(btnX + btnWidth, this.y + this.height - radius);
        ctx.quadraticCurveTo(btnX + btnWidth, this.y + this.height, btnX + btnWidth - radius, this.y + this.height);
        ctx.lineTo(btnX + radius, this.y + this.height);
        ctx.quadraticCurveTo(btnX, this.y + this.height, btnX, this.y + this.height - radius);
        ctx.lineTo(btnX, this.y + radius);
        ctx.quadraticCurveTo(btnX, this.y, btnX + radius, this.y);
      } else if (i === 0) {
        // Premier bouton - coins gauche arrondis
        ctx.moveTo(btnX + radius, this.y);
        ctx.lineTo(btnX + btnWidth, this.y);
        ctx.lineTo(btnX + btnWidth, this.y + this.height);
        ctx.lineTo(btnX + radius, this.y + this.height);
        ctx.quadraticCurveTo(btnX, this.y + this.height, btnX, this.y + this.height - radius);
        ctx.lineTo(btnX, this.y + radius);
        ctx.quadraticCurveTo(btnX, this.y, btnX + radius, this.y);
      } else if (i === this.buttons.length - 1) {
        // Dernier bouton - coins droit arrondis
        ctx.moveTo(btnX, this.y);
        ctx.lineTo(btnX + btnWidth - radius, this.y);
        ctx.quadraticCurveTo(btnX + btnWidth, this.y, btnX + btnWidth, this.y + radius);
        ctx.lineTo(btnX + btnWidth, this.y + this.height - radius);
        ctx.quadraticCurveTo(btnX + btnWidth, this.y + this.height, btnX + btnWidth - radius, this.y + this.height);
        ctx.lineTo(btnX, this.y + this.height);
      } else {
        // Bouton du milieu - coins carrés
        ctx.rect(btnX, this.y, btnWidth, this.height);
      }
      
      ctx.closePath();
      ctx.fill();
      
      // Dessiner les ripples Material
      if (this.platform === 'material') {
        for (const ripple of this.ripples) {
          if (ripple.index === i) {
            ctx.save();
            
            // Clip sur le bouton pour que le ripple ne dépasse pas
            ctx.beginPath();
            if (i === 0) {
              ctx.moveTo(btnX + radius, this.y);
              ctx.lineTo(btnX + btnWidth, this.y);
              ctx.lineTo(btnX + btnWidth, this.y + this.height);
              ctx.lineTo(btnX + radius, this.y + this.height);
              ctx.quadraticCurveTo(btnX, this.y + this.height, btnX, this.y + this.height - radius);
              ctx.lineTo(btnX, this.y + radius);
              ctx.quadraticCurveTo(btnX, this.y, btnX + radius, this.y);
            } else if (i === this.buttons.length - 1) {
              ctx.moveTo(btnX, this.y);
              ctx.lineTo(btnX + btnWidth - radius, this.y);
              ctx.quadraticCurveTo(btnX + btnWidth, this.y, btnX + btnWidth, this.y + radius);
              ctx.lineTo(btnX + btnWidth, this.y + this.height - radius);
              ctx.quadraticCurveTo(btnX + btnWidth, this.y + this.height, btnX + btnWidth - radius, this.y + this.height);
              ctx.lineTo(btnX, this.y + this.height);
            } else {
              ctx.rect(btnX, this.y, btnWidth, this.height);
            }
            ctx.closePath();
            ctx.clip();
            
            // Dessiner le ripple
            ctx.fillStyle = `rgba(255, 255, 255, ${ripple.opacity})`;
            ctx.beginPath();
            ctx.arc(btnX + ripple.x, this.y + ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
          }
        }
      }
      
      // Dessiner le texte
      ctx.fillStyle = textColor;
      ctx.font = `500 ${this.height / 2.5}px -apple-system, Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text || `Button ${i + 1}`, btnX + btnWidth / 2, this.y + this.height / 2);
    }
    
    // Dessiner les séparateurs (pour iOS)
    if (this.platform === 'cupertino' && this.buttons.length > 1) {
      ctx.strokeStyle = '#C7C7CC';
      ctx.lineWidth = 1;
      
      for (let i = 1; i < this.buttons.length; i++) {
        const separatorX = this.x + i * btnWidth + (i - 1) * this.spacing;
        ctx.beginPath();
        ctx.moveTo(separatorX, this.y + 8);
        ctx.lineTo(separatorX, this.y + this.height - 8);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  /**
   * Vérifie si un point est dans le contrôle
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si un segment est touché
   */
  isPointInside(x, y) {
    return this.getButtonIndexAt(x, y) !== null;
  }
}

export default SegmentedControl;