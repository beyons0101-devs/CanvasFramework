import Component from '../core/Component.js';

/**
 * Onglets de navigation avec support Material & Cupertino
 * @class
 * @extends Component
 */
class Tabs extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.tabs = options.tabs || [];
    this.selectedIndex = options.selectedIndex || 0;
    this.onChange = options.onChange;
    this.platform = framework.platform;
    this.height = options.height || 48;
    this.indicatorColor = options.indicatorColor || (framework.platform === 'material' ? '#6200EE' : '#007AFF');
    this.textColor = options.textColor || '#000000';
    this.selectedTextColor = options.selectedTextColor || this.indicatorColor;
    
    // 🔹 Système de ripples amélioré
    this.ripples = [];
    this.animationFrame = null;
    this.lastAnimationTime = 0;
    
    // 🔹 Pour détecter les doubles événements
    this.lastEventTime = 0;
    this.lastEventCoords = { x: -1, y: -1 };
    
    this.onPress = this.handlePress.bind(this);
  }

  /**
   * Démarre l'animation des ripples
   * @private
   */
  startRippleAnimation() {
    const animate = (timestamp) => {
      if (!this.lastAnimationTime) this.lastAnimationTime = timestamp;
      const deltaTime = timestamp - this.lastAnimationTime;
      this.lastAnimationTime = timestamp;

      let needsUpdate = false;

      // Mettre à jour chaque ripple
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const ripple = this.ripples[i];
        
        // Animer le rayon (expansion)
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += (ripple.maxRadius / 300) * deltaTime;
          needsUpdate = true;
        }

        // Animer l'opacité (fade out)
        if (ripple.radius >= ripple.maxRadius * 0.4) {
          ripple.opacity -= (0.003 * deltaTime);
          if (ripple.opacity < 0) ripple.opacity = 0;
          needsUpdate = true;
        }

        // Supprimer les ripples terminés
        if (ripple.opacity <= 0 && ripple.radius >= ripple.maxRadius * 0.95) {
          this.ripples.splice(i, 1);
          needsUpdate = true;
        }
      }

      // Redessiner si nécessaire
      if (needsUpdate) {
        this.requestRender();
      }

      // Continuer l'animation
      if (this.ripples.length > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        this.lastAnimationTime = 0;
      }
    };

    if (this.ripples.length > 0 && !this.animationFrame) {
      this.animationFrame = requestAnimationFrame(animate);
    }
  }

  /**
   * Demander un redessin
   * @private
   */
  requestRender() {
    if (this.framework && this.framework.requestRender) {
      this.framework.requestRender();
    }
  }

  /**
   * Nettoyer l'animation lors de la destruction
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (super.destroy) {
      super.destroy();
    }
  }

  handlePress(x, y) {
    const now = performance.now();
    
    // 🔹 Détecter si c'est le même événement physique (mousedown + click)
    const deltaTime = now - this.lastEventTime;
    const deltaX = Math.abs(x - this.lastEventCoords.x);
    const deltaY = Math.abs(y - this.lastEventCoords.y);
    
    const isDoubleEvent = deltaX < 2 && deltaY < 2 && deltaTime < 50;
    
    if (isDoubleEvent) {
      return; // Ignorer le double événement
    }
    
    // 🔹 Enregistrer cet événement
    this.lastEventTime = now;
    this.lastEventCoords = { x, y };
    
    const tabWidth = this.width / this.tabs.length;
    const index = Math.floor((x - this.x) / tabWidth);
    
    if (index >= 0 && index < this.tabs.length) {
      // Ripple pour Material
      if (this.platform === 'material') {
        const rippleCenterX = this.x + index * tabWidth + tabWidth / 2;
        
        // Calculer la taille maximale du ripple
        const maxRippleRadius = Math.min(tabWidth * 0.6, this.height * 0.8);
        
        this.ripples.push({
          x: rippleCenterX,
          y: this.y + this.height / 2,
          radius: 0,
          maxRadius: maxRippleRadius,
          opacity: 1,
          createdAt: now,
          tabIndex: index
        });
        
        // Démarrer l'animation si elle n'est pas en cours
        if (!this.animationFrame) {
          this.startRippleAnimation();
        }
        
        // Forcer un redessin
        this.requestRender();
      }

      // Changement d'onglet
      if (index !== this.selectedIndex) {
        this.selectedIndex = index;
        if (this.onChange) this.onChange(index, this.tabs[index]);
      }
      
      this.requestRender();
    }
  }

  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Bordure inférieure
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.stroke();

    const tabWidth = this.width / this.tabs.length;

    // 🔹 Dessiner les ripples Material EN PREMIER
    if (this.platform === 'material') {
      this.drawRipples(ctx, tabWidth);
    }

    // Dessiner les onglets
    for (let i = 0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      const tabX = this.x + i * tabWidth;
      const isSelected = i === this.selectedIndex;
      const color = isSelected ? this.selectedTextColor : this.textColor;

      // Icône (facultative)
      if (tab.icon) {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(tab.icon, tabX + tabWidth / 2, this.y + 16);
      }

      // Label
      ctx.font = `${isSelected ? 'bold ' : ''}14px -apple-system, Roboto, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelY = tab.icon ? this.y + 36 : this.y + this.height / 2;
      ctx.fillText(tab.label, tabX + tabWidth / 2, labelY);

      // Indicateur (Material)
      if (isSelected && this.platform === 'material') {
        ctx.fillStyle = this.indicatorColor;
        ctx.fillRect(tabX, this.y + this.height - 2, tabWidth, 2);
      }
    }

    ctx.restore();
  }

  /**
   * Dessine les ripples (Material)
   * @private
   */
  drawRipples(ctx, tabWidth) {
    // Sauvegarder le contexte
    ctx.save();
    
    // Créer un masque de clipping pour limiter les ripples aux onglets
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();
    
    for (let ripple of this.ripples) {
      ctx.globalAlpha = ripple.opacity;
      ctx.fillStyle = this.indicatorColor || '#6200EE';
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Restaurer le contexte
    ctx.restore();
  }
}

export default Tabs;