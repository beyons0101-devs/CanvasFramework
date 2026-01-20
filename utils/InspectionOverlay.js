/**
 * Overlay d'inspection pour CanvasFramework
 */
 
class InspectionOverlay {
  constructor(framework) {
    this.framework = framework;
    this.isEnabled = false;
    this.hoveredComp = null;
    this.selectedComp = null;
    this.showGrid = false;
    this.showBounds = true;
    this.showMetrics = true;
    this.gridSize = 50;
    
    this.setup();
  }

  setup() {
    // Créer le canvas overlay
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 9998;
    `;
    
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    
    // Redimensionner avec le canvas principal
    this.syncWithMainCanvas();
    
    // Événements
    this.framework.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.framework.canvas.addEventListener('click', this.handleClick.bind(this));
    
    window.addEventListener('resize', this.syncWithMainCanvas.bind(this));
  }

  syncWithMainCanvas() {
    const rect = this.framework.canvas.getBoundingClientRect();
    this.overlayCanvas.width = rect.width * (window.devicePixelRatio || 1);
    this.overlayCanvas.height = rect.height * (window.devicePixelRatio || 1);
    this.overlayCanvas.style.width = rect.width + 'px';
    this.overlayCanvas.style.height = rect.height + 'px';
    
    if (this.overlayCtx) {
      this.overlayCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  }

  handleMouseMove(e) {
    if (!this.isEnabled) return;
    
    const rect = this.framework.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Trouver le composant sous la souris
    this.hoveredComp = this.findComponentAt(x, y);
    this.render();
  }

  handleClick(e) {
    if (!this.isEnabled) return;
    
    if (this.hoveredComp) {
      this.selectedComp = this.hoveredComp;
      
      // Ouvrir DevTools si disponible
      if (window.devTools) {
        window.devTools.selectComponent(this.selectedComp);
        window.devTools.switchTab('properties');
      }
    }
  }

  findComponentAt(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    
    for (let i = this.framework.components.length - 1; i >= 0; i--) {
      const comp = this.framework.components[i];
      if (comp.visible && comp.isPointInside(x, adjustedY)) {
        return comp;
      }
    }
    return null;
  }

  render() {
    if (!this.isEnabled) return;
    
    this.overlayCtx.clearRect(0, 0, 
      this.overlayCanvas.width / (window.devicePixelRatio || 1),
      this.overlayCanvas.height / (window.devicePixelRatio || 1)
    );
    
    // Grille
    if (this.showGrid) {
      this.drawGrid();
    }
    
    // Tous les composants
    if (this.showBounds) {
      this.drawAllComponents();
    }
    
    // Composant survolé
    if (this.hoveredComp) {
      this.drawHoveredComponent();
    }
    
    // Composant sélectionné
    if (this.selectedComp) {
      this.drawSelectedComponent();
    }
    
    // Métriques
    if (this.showMetrics) {
      this.drawMetrics();
    }
  }

  drawGrid() {
    this.overlayCtx.save();
    this.overlayCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    this.overlayCtx.lineWidth = 1;
    
    // Lignes verticales
    for (let x = 0; x < this.overlayCanvas.width; x += this.gridSize) {
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(x, 0);
      this.overlayCtx.lineTo(x, this.overlayCanvas.height);
      this.overlayCtx.stroke();
    }
    
    // Lignes horizontales
    for (let y = 0; y < this.overlayCanvas.height; y += this.gridSize) {
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(0, y);
      this.overlayCtx.lineTo(this.overlayCanvas.width, y);
      this.overlayCtx.stroke();
    }
    
    this.overlayCtx.restore();
  }

  drawAllComponents() {
    this.framework.components.forEach(comp => {
      if (!comp.visible) return;
      
      const isFixed = this.framework.isFixedComponent(comp);
      const y = isFixed ? comp.y : comp.y + this.framework.scrollOffset;
      
      this.overlayCtx.save();
      this.overlayCtx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
      this.overlayCtx.lineWidth = 1;
      this.overlayCtx.strokeRect(comp.x, y, comp.width, comp.height);
      this.overlayCtx.restore();
    });
  }

  drawHoveredComponent() {
    const comp = this.hoveredComp;
    const isFixed = this.framework.isFixedComponent(comp);
    const y = isFixed ? comp.y : comp.y + this.framework.scrollOffset;
    
    this.overlayCtx.save();
    
    // Fond semi-transparent
    this.overlayCtx.fillStyle = 'rgba(100, 200, 255, 0.1)';
    this.overlayCtx.fillRect(comp.x, y, comp.width, comp.height);
    
    // Bordure
    this.overlayCtx.strokeStyle = '#4ec9b0';
    this.overlayCtx.lineWidth = 2;
    this.overlayCtx.strokeRect(comp.x, y, comp.width, comp.height);
    
    // Infos
    this.overlayCtx.fillStyle = '#4ec9b0';
    this.overlayCtx.font = '12px monospace';
    this.overlayCtx.fillText(
      `${comp.constructor.name} (${comp.width}x${comp.height})`,
      comp.x,
      y - 5
    );
    
    this.overlayCtx.restore();
  }

  drawSelectedComponent() {
    const comp = this.selectedComp;
    if (!comp.visible) return;
    
    const isFixed = this.framework.isFixedComponent(comp);
    const y = isFixed ? comp.y : comp.y + this.framework.scrollOffset;
    
    this.overlayCtx.save();
    
    // Bordure rouge pointillée
    this.overlayCtx.strokeStyle = '#ff5555';
    this.overlayCtx.lineWidth = 2;
    this.overlayCtx.setLineDash([5, 3]);
    this.overlayCtx.strokeRect(comp.x - 2, y - 2, comp.width + 4, comp.height + 4);
    
    // Mesures
    this.overlayCtx.strokeStyle = '#ff5555';
    this.overlayCtx.lineWidth = 1;
    
    // Largeur
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(comp.x, y - 20);
    this.overlayCtx.lineTo(comp.x + comp.width, y - 20);
    this.overlayCtx.moveTo(comp.x, y - 25);
    this.overlayCtx.lineTo(comp.x, y - 15);
    this.overlayCtx.moveTo(comp.x + comp.width, y - 25);
    this.overlayCtx.lineTo(comp.x + comp.width, y - 15);
    this.overlayCtx.stroke();
    
    this.overlayCtx.fillStyle = '#ff5555';
    this.overlayCtx.font = '10px monospace';
    this.overlayCtx.textAlign = 'center';
    this.overlayCtx.fillText(
      `${comp.width}px`,
      comp.x + comp.width / 2,
      y - 25
    );
    
    // Hauteur
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(comp.x - 20, y);
    this.overlayCtx.lineTo(comp.x - 20, y + comp.height);
    this.overlayCtx.moveTo(comp.x - 25, y);
    this.overlayCtx.lineTo(comp.x - 15, y);
    this.overlayCtx.moveTo(comp.x - 25, y + comp.height);
    this.overlayCtx.lineTo(comp.x - 15, y + comp.height);
    this.overlayCtx.stroke();
    
    this.overlayCtx.save();
    this.overlayCtx.translate(comp.x - 30, y + comp.height / 2);
    this.overlayCtx.rotate(-Math.PI / 2);
    this.overlayCtx.fillText(
      `${comp.height}px`,
      0,
      0
    );
    this.overlayCtx.restore();
    
    this.overlayCtx.restore();
  }

  drawMetrics() {
    this.overlayCtx.save();
    this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.overlayCtx.fillRect(10, 10, 200, 90);
    
    this.overlayCtx.fillStyle = '#fff';
    this.overlayCtx.font = '12px monospace';
    this.overlayCtx.textAlign = 'left';
    
    this.overlayCtx.fillText(`Composants: ${this.framework.components.length}`, 20, 30);
    this.overlayCtx.fillText(`FPS: ${this.framework.fps}`, 20, 50);
    this.overlayCtx.fillText(`Scroll: ${Math.round(this.framework.scrollOffset)}px`, 20, 70);
    this.overlayCtx.fillText(`Route: ${this.framework.currentRoute}`, 20, 90);
    
    if (this.hoveredComp) {
      this.overlayCtx.fillText(
        `Survol: ${this.hoveredComp.constructor.name}`,
        20,
        110
      );
    }
    
    this.overlayCtx.restore();
  }

  enable() {
    this.isEnabled = true;
    document.body.appendChild(this.overlayCanvas);
    this.render();
  }

  disable() {
    this.isEnabled = false;
    if (this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
  }

  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  setOptions(options) {
    Object.assign(this, options);
    if (this.isEnabled) {
      this.render();
    }
  }
}

export default InspectionOverlay;