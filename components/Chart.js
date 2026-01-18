import Component from '../core/Component.js';

/**
 * Composant de graphiques avec support Line, Bar, Pie, Doughnut
 * @class
 * @extends Component
 */
class Chart extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.type = options.type || 'line'; // 'line', 'bar', 'pie', 'doughnut', 'area'
    this.data = options.data || { labels: [], datasets: [] };
    this.title = options.title || '';
    this.showLegend = options.showLegend !== false;
    this.showGrid = options.showGrid !== false;
    this.showValues = options.showValues || false;
    this.animated = options.animated !== false;
    this.colors = options.colors || this.getDefaultColors();
    
    // Marges et padding
    this.padding = options.padding || 40;
    this.legendHeight = this.showLegend ? 60 : 0;
    this.titleHeight = this.title ? 40 : 0;
    
    // Zone de dessin du graphique
    this.chartArea = {
      x: this.padding,
      y: this.padding + this.titleHeight,
      width: this.width - this.padding * 2,
      height: this.height - this.padding * 2 - this.legendHeight - this.titleHeight
    };
    
    // Animation
    this.animationProgress = this.animated ? 0 : 1;
    this.animationDuration = 1000;
    this.animationStartTime = null;
    
    // Interaction
    this.hoveredIndex = -1;
    this.hoveredDatasetIndex = -1;
    
    // Options spécifiques par type
    this.lineOptions = {
      tension: options.tension || 0.4, // Courbure des lignes
      pointRadius: options.pointRadius || 4,
      lineWidth: options.lineWidth || 2,
      fill: options.fill || false
    };
    
    this.barOptions = {
      barWidth: options.barWidth || null, // Auto si null
      groupGap: options.groupGap || 10,
      barGap: options.barGap || 4
    };
    
    this.pieOptions = {
      innerRadius: options.innerRadius || 0, // >0 pour doughnut
      startAngle: options.startAngle || -Math.PI / 2,
      labelDistance: options.labelDistance || 1.3
    };
    
    // Calculer les échelles
    this.calculateScales();
    
    // Démarrer l'animation si activée
    if (this.animated) {
      this.startAnimation();
    }
  }
  
  /**
   * Couleurs par défaut
   */
  getDefaultColors() {
    return [
      '#6200EE', '#03DAC6', '#FF6F00', '#E91E63',
      '#2196F3', '#4CAF50', '#FFC107', '#9C27B0',
      '#00BCD4', '#FF5722', '#795548', '#607D8B'
    ];
  }
  
  /**
   * Calcule les échelles min/max pour les axes
   */
  calculateScales() {
    if (this.type === 'pie' || this.type === 'doughnut') {
      // Pas d'échelles pour les graphiques circulaires
      this.totalValue = this.data.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0;
      return;
    }
    
    let allValues = [];
    this.data.datasets.forEach(dataset => {
      allValues = allValues.concat(dataset.data);
    });
    
    this.minValue = Math.min(0, ...allValues);
    this.maxValue = Math.max(...allValues);
    
    // Ajouter une marge de 10%
    const range = this.maxValue - this.minValue;
    this.minValue -= range * 0.1;
    this.maxValue += range * 0.1;
  }
  
  /**
   * Démarre l'animation
   */
  startAnimation() {
    this.animationStartTime = Date.now();
    this.animationProgress = 0;
    
    const animate = () => {
      const elapsed = Date.now() - this.animationStartTime;
      this.animationProgress = Math.min(elapsed / this.animationDuration, 1);
      
      // Easing
      this.animationProgress = this.easeOutCubic(this.animationProgress);
      
      this.requestRender();
      
      if (this.animationProgress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Fonction d'easing
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  /**
   * Convertit une valeur en coordonnée Y
   */
  valueToY(value) {
    const range = this.maxValue - this.minValue;
    const ratio = (value - this.minValue) / range;
    return this.chartArea.y + this.chartArea.height - (ratio * this.chartArea.height);
  }
  
  /**
   * Convertit un index en coordonnée X
   */
  indexToX(index, total) {
    const step = this.chartArea.width / (total - 1 || 1);
    return this.chartArea.x + index * step;
  }
  
  /**
   * Dessine le titre
   */
  drawTitle(ctx) {
    if (!this.title) return;
    
    ctx.save();
    ctx.fillStyle = this.platform === 'material' ? '#000000' : '#000000';
    ctx.font = 'bold 18px -apple-system, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, this.x + this.width / 2, this.y + this.titleHeight / 2);
    ctx.restore();
  }
  
  /**
   * Dessine la grille
   */
  drawGrid(ctx) {
    if (!this.showGrid || this.type === 'pie' || this.type === 'doughnut') return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // Lignes horizontales
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = this.y + this.chartArea.y + (this.chartArea.height / steps) * i;
      
      ctx.beginPath();
      ctx.moveTo(this.x + this.chartArea.x, y);
      ctx.lineTo(this.x + this.chartArea.x + this.chartArea.width, y);
      ctx.stroke();
      
      // Labels
      const value = this.maxValue - (this.maxValue - this.minValue) * (i / steps);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.font = '12px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toFixed(1), this.x + this.chartArea.x - 5, y);
    }
    
    ctx.restore();
  }
  
  /**
   * Dessine un graphique en ligne
   */
  drawLineChart(ctx) {
    const numPoints = this.data.labels.length;
    
    this.data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || this.colors[datasetIndex % this.colors.length];
      
      ctx.save();
      
      // Zone remplie (area chart)
      if (this.lineOptions.fill || this.type === 'area') {
        ctx.beginPath();
        ctx.moveTo(
          this.x + this.indexToX(0, numPoints),
          this.y + this.valueToY(0)
        );
        
        dataset.data.forEach((value, index) => {
          const x = this.x + this.indexToX(index, numPoints);
          const y = this.y + this.valueToY(value * this.animationProgress);
          
          if (index === 0) {
            ctx.lineTo(x, y);
          } else {
            // Courbe de Bézier pour lisser
            const prevX = this.x + this.indexToX(index - 1, numPoints);
            const prevY = this.y + this.valueToY(dataset.data[index - 1] * this.animationProgress);
            const cpX = prevX + (x - prevX) * this.lineOptions.tension;
            
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
          }
        });
        
        ctx.lineTo(
          this.x + this.indexToX(numPoints - 1, numPoints),
          this.y + this.valueToY(0)
        );
        ctx.closePath();
        
        ctx.fillStyle = color + '33'; // 20% opacité
        ctx.fill();
      }
      
      // Ligne
      ctx.beginPath();
      dataset.data.forEach((value, index) => {
        const x = this.x + this.indexToX(index, numPoints);
        const y = this.y + this.valueToY(value * this.animationProgress);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = this.x + this.indexToX(index - 1, numPoints);
          const prevY = this.y + this.valueToY(dataset.data[index - 1] * this.animationProgress);
          const cpX = prevX + (x - prevX) * this.lineOptions.tension;
          
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      });
      
      ctx.strokeStyle = color;
      ctx.lineWidth = this.lineOptions.lineWidth;
      ctx.stroke();
      
      // Points
      dataset.data.forEach((value, index) => {
        const x = this.x + this.indexToX(index, numPoints);
        const y = this.y + this.valueToY(value * this.animationProgress);
        
        const isHovered = this.hoveredIndex === index && 
                         this.hoveredDatasetIndex === datasetIndex;
        const radius = isHovered ? this.lineOptions.pointRadius * 1.5 : 
                                  this.lineOptions.pointRadius;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Valeur au survol
        if (isHovered && this.showValues) {
          ctx.fillStyle = color;
          ctx.font = 'bold 12px -apple-system, Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(value.toFixed(1), x, y - 15);
        }
      });
      
      ctx.restore();
    });
    
    // Labels X
    this.drawXLabels(ctx);
  }
  
  /**
   * Dessine un graphique en barres
   */
  drawBarChart(ctx) {
    const numBars = this.data.labels.length;
    const numDatasets = this.data.datasets.length;
    const groupWidth = this.chartArea.width / numBars;
    const barWidth = this.barOptions.barWidth || 
                     (groupWidth - this.barOptions.groupGap * 2) / numDatasets - 
                     this.barOptions.barGap;
    
    this.data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || this.colors[datasetIndex % this.colors.length];
      
      dataset.data.forEach((value, index) => {
        const groupX = this.x + this.chartArea.x + index * groupWidth;
        const barX = groupX + this.barOptions.groupGap + 
                    datasetIndex * (barWidth + this.barOptions.barGap);
        
        const barHeight = Math.abs(this.valueToY(value) - this.valueToY(0)) * 
                         this.animationProgress;
        const barY = this.y + this.valueToY(value * this.animationProgress);
        
        const isHovered = this.hoveredIndex === index && 
                         this.hoveredDatasetIndex === datasetIndex;
        
        ctx.fillStyle = isHovered ? this.adjustColor(color, 20) : color;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Bordure
        if (this.platform === 'material') {
          ctx.strokeStyle = this.adjustColor(color, -20);
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
        
        // Valeur
        if (this.showValues || isHovered) {
          ctx.fillStyle = '#000000';
          ctx.font = '11px -apple-system, Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            value.toFixed(1),
            barX + barWidth / 2,
            barY - 5
          );
        }
      });
    });
    
    // Labels X
    this.drawXLabels(ctx);
  }
  
  /**
   * Dessine un graphique circulaire (Pie/Doughnut)
   */
  drawPieChart(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.chartArea.y + this.chartArea.height / 2;
    const radius = Math.min(this.chartArea.width, this.chartArea.height) / 2 - 20;
    const innerRadius = this.type === 'doughnut' ? 
                       (this.pieOptions.innerRadius || radius * 0.5) : 0;
    
    let currentAngle = this.pieOptions.startAngle;
    const dataset = this.data.datasets[0];
    
    dataset.data.forEach((value, index) => {
      const sliceAngle = (value / this.totalValue) * Math.PI * 2 * this.animationProgress;
      const color = dataset.colors?.[index] || this.colors[index % this.colors.length];
      
      const isHovered = this.hoveredIndex === index;
      const displayRadius = isHovered ? radius + 10 : radius;
      
      // Slice
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, displayRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();
      
      // Bordure
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      
      // Label
      if (this.animationProgress > 0.8) {
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelRadius = displayRadius * this.pieOptions.labelDistance;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;
        
        ctx.fillStyle = '#000000';
        ctx.font = '12px -apple-system, Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const percentage = ((value / this.totalValue) * 100).toFixed(1);
        ctx.fillText(`${percentage}%`, labelX, labelY);
        
        if (this.data.labels[index]) {
          ctx.font = 'bold 11px -apple-system, Roboto, sans-serif';
          ctx.fillText(this.data.labels[index], labelX, labelY + 15);
        }
      }
      
      currentAngle += sliceAngle;
    });
    
    // Valeur centrale pour doughnut
    if (this.type === 'doughnut' && this.animationProgress > 0.8) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.totalValue.toFixed(0), centerX, centerY);
    }
  }
  
  /**
   * Dessine les labels de l'axe X
   */
  drawXLabels(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '12px -apple-system, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    this.data.labels.forEach((label, index) => {
      const x = this.x + this.indexToX(index, this.data.labels.length);
      const y = this.y + this.chartArea.y + this.chartArea.height + 10;
      ctx.fillText(label, x, y);
    });
    
    ctx.restore();
  }
  
  /**
   * Dessine la légende
   */
  drawLegend(ctx) {
    if (!this.showLegend) return;
    
    const legendY = this.y + this.height - this.legendHeight + 10;
    const itemWidth = 120;
    const itemsPerRow = Math.floor(this.width / itemWidth);
    
    ctx.save();
    
    this.data.datasets.forEach((dataset, index) => {
      const color = dataset.color || this.colors[index % this.colors.length];
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      const x = this.x + col * itemWidth + 20;
      const y = legendY + row * 25;
      
      // Carré de couleur
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 12, 12);
      
      // Label
      ctx.fillStyle = '#000000';
      ctx.font = '12px -apple-system, Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(dataset.label || `Dataset ${index + 1}`, x + 18, y + 6);
    });
    
    ctx.restore();
  }
  
  /**
   * Ajuste la luminosité d'une couleur
   */
  adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
  
  /**
   * Gère le survol
   */
  handleHover(x, y) {
    const relativeX = x - this.x;
    const relativeY = y - this.y;
    
    if (this.type === 'pie' || this.type === 'doughnut') {
      this.handlePieHover(relativeX, relativeY);
    } else if (this.type === 'line' || this.type === 'area') {
      this.handleLineHover(relativeX, relativeY);
    } else if (this.type === 'bar') {
      this.handleBarHover(relativeX, relativeY);
    }
  }
  
  /**
   * Gère le survol pour les graphiques circulaires
   */
  handlePieHover(x, y) {
    const centerX = this.width / 2;
    const centerY = this.chartArea.y + this.chartArea.height / 2;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const radius = Math.min(this.chartArea.width, this.chartArea.height) / 2 - 20;
    const innerRadius = this.type === 'doughnut' ? (this.pieOptions.innerRadius || radius * 0.5) : 0;
    
    if (distance >= innerRadius && distance <= radius) {
      let currentAngle = this.pieOptions.startAngle;
      const dataset = this.data.datasets[0];
      
      for (let i = 0; i < dataset.data.length; i++) {
        const sliceAngle = (dataset.data[i] / this.totalValue) * Math.PI * 2;
        
        let normalizedAngle = angle - this.pieOptions.startAngle;
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
        
        if (normalizedAngle >= (currentAngle - this.pieOptions.startAngle) && 
            normalizedAngle <= (currentAngle - this.pieOptions.startAngle + sliceAngle)) {
          this.hoveredIndex = i;
          this.requestRender();
          return;
        }
        
        currentAngle += sliceAngle;
      }
    }
    
    this.hoveredIndex = -1;
    this.requestRender();
  }
  
  /**
   * Gère le survol pour les graphiques en ligne
   */
  handleLineHover(x, y) {
    let closestIndex = -1;
    let closestDataset = -1;
    let closestDistance = Infinity;
    
    this.data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const pointX = this.indexToX(index, this.data.labels.length);
        const pointY = this.valueToY(value);
        
        const dx = x - pointX;
        const dy = y - pointY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < closestDistance && distance < 20) {
          closestDistance = distance;
          closestIndex = index;
          closestDataset = datasetIndex;
        }
      });
    });
    
    if (this.hoveredIndex !== closestIndex || this.hoveredDatasetIndex !== closestDataset) {
      this.hoveredIndex = closestIndex;
      this.hoveredDatasetIndex = closestDataset;
      this.requestRender();
    }
  }
  
  /**
   * Gère le survol pour les graphiques en barres
   */
  handleBarHover(x, y) {
    const numBars = this.data.labels.length;
    const numDatasets = this.data.datasets.length;
    const groupWidth = this.chartArea.width / numBars;
    const barWidth = this.barOptions.barWidth || 
                     (groupWidth - this.barOptions.groupGap * 2) / numDatasets - 
                     this.barOptions.barGap;
    
    let found = false;
    
    this.data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const groupX = this.chartArea.x + index * groupWidth;
        const barX = groupX + this.barOptions.groupGap + 
                    datasetIndex * (barWidth + this.barOptions.barGap);
        const barY = this.valueToY(value);
        const barHeight = Math.abs(this.valueToY(value) - this.valueToY(0));
        
        if (x >= barX && x <= barX + barWidth && 
            y >= barY && y <= barY + barHeight) {
          this.hoveredIndex = index;
          this.hoveredDatasetIndex = datasetIndex;
          found = true;
        }
      });
    });
    
    if (!found) {
      this.hoveredIndex = -1;
      this.hoveredDatasetIndex = -1;
    }
    
    this.requestRender();
  }
  
  /**
   * Vérifie si un point est dans le composant
   */
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
  
  /**
   * Gère le mouvement de la souris
   */
  onMove(x, y) {
    this.handleHover(x, y);
  }
  
  /**
   * Demande un nouveau rendu
   */
  requestRender() {
    if (this.framework && this.framework.requestRender) {
      this.framework.requestRender();
    }
  }
  
  /**
   * Met à jour les données du graphique
   */
  updateData(newData) {
    this.data = newData;
    this.calculateScales();
    
    if (this.animated) {
      this.startAnimation();
    } else {
      this.requestRender();
    }
  }
  
  /**
   * Dessine le composant
   */
  draw(ctx) {
    ctx.save();
    
    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Bordure
    if (this.platform === 'material') {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    // Titre
    this.drawTitle(ctx);
    
    // Grille
    this.drawGrid(ctx);
    
    // Graphique selon le type
    switch (this.type) {
      case 'line':
      case 'area':
        this.drawLineChart(ctx);
        break;
      case 'bar':
        this.drawBarChart(ctx);
        break;
      case 'pie':
      case 'doughnut':
        this.drawPieChart(ctx);
        break;
    }
    
    // Légende
    this.drawLegend(ctx);
    
    ctx.restore();
  }
}

export default Chart;