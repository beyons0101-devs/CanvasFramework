import Component from '../core/Component.js';

/**
 * Arborescence pliable et sélectionnable
 * @class
 * @extends Component
 * @property {Array} nodes - Nœuds de l'arbre
 * @property {Set} expandedNodes - Nœuds dépliés
 * @property {Object} selectedNode - Nœud sélectionné
 * @property {number} indentSize - Taille de l'indentation
 * @property {number} nodeHeight - Hauteur d'un nœud
 * @property {boolean} showIcons - Afficher les icônes
 * @property {string} expandIcon - Icône de dépliage
 * @property {string} collapseIcon - Icône de repliage
 * @property {Function} onNodeClick - Callback clic nœud
 * @property {Function} onNodeExpand - Callback dépliage
 */
class TreeView extends Component {
  /**
   * Crée une instance de TreeView
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {Array} [options.nodes=[]] - Nœuds [{id, label, children, icon}]
   * @param {Array} [options.defaultExpanded=[]] - IDs des nœuds dépliés par défaut
   * @param {number} [options.indentSize=24] - Taille indentation
   * @param {number} [options.nodeHeight=40] - Hauteur nœud
   * @param {boolean} [options.showIcons=true] - Afficher icônes
   * @param {Function} [options.onNodeClick] - Callback clic
   * @param {Function} [options.onNodeExpand] - Callback dépliage
   */
  constructor(framework, options = {}) {
    super(framework, options);
    
    this.nodes = options.nodes || [];
    this.expandedNodes = new Set(options.defaultExpanded || []);
    this.selectedNode = null;
    this.indentSize = options.indentSize || 24;
    this.nodeHeight = options.nodeHeight || 40;
    this.showIcons = options.showIcons !== false;
    
    this.onNodeClick = options.onNodeClick || null;
    this.onNodeExpand = options.onNodeExpand || null;
    
    const platform = framework.platform;
    
    // Styles selon la plateforme
    if (platform === 'material') {
      this.bgColor = '#FFFFFF';
      this.hoverBg = 'rgba(0, 0, 0, 0.04)';
      this.selectedBg = 'rgba(98, 0, 238, 0.08)';
      this.textColor = '#000000';
      this.iconColor = '#666666';
      this.borderColor = 'rgba(0, 0, 0, 0.12)';
    } else {
      this.bgColor = '#FFFFFF';
      this.hoverBg = 'rgba(0, 0, 0, 0.03)';
      this.selectedBg = 'rgba(0, 122, 255, 0.1)';
      this.textColor = '#000000';
      this.iconColor = '#6C6C70';
      this.borderColor = 'rgba(60, 60, 67, 0.29)';
    }
    
    // Calculer la hauteur totale
    this.updateHeight();
    
    // État de hover
    this.hoveredNode = null;
  }

  /**
   * Met à jour la hauteur du composant
   * @private
   */
  updateHeight() {
    const flattenedNodes = this.getFlattenedNodes();
    this.height = flattenedNodes.length * this.nodeHeight;
  }

  /**
   * Aplatit l'arbre en liste
   * @param {Array} [nodes=this.nodes] - Nœuds à aplatir
   * @param {number} [level=0] - Niveau de profondeur
   * @returns {Array} Liste aplatie
   * @private
   */
  getFlattenedNodes(nodes = this.nodes, level = 0) {
    let result = [];
    
    for (let node of nodes) {
      result.push({ ...node, level });
      
      if (node.children && 
          node.children.length > 0 && 
          this.expandedNodes.has(node.id)) {
        result = result.concat(this.getFlattenedNodes(node.children, level + 1));
      }
    }
    
    return result;
  }

  /**
   * Toggle l'expansion d'un nœud
   * @param {Object} node - Nœud à toggler
   * @private
   */
  toggleNode(node) {
    if (this.expandedNodes.has(node.id)) {
      this.expandedNodes.delete(node.id);
    } else {
      this.expandedNodes.add(node.id);
      if (this.onNodeExpand) {
        this.onNodeExpand(node);
      }
    }
    this.updateHeight();
  }

  /**
   * Sélectionne un nœud
   * @param {Object} node - Nœud à sélectionner
   * @private
   */
  selectNode(node) {
    this.selectedNode = node;
    if (this.onNodeClick) {
      this.onNodeClick(node);
    }
  }

  /**
   * Dessine le composant
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    // Fond
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Bordure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Dessiner les nœuds
    const flattenedNodes = this.getFlattenedNodes();
    flattenedNodes.forEach((node, index) => {
      this.drawNode(ctx, node, index);
    });
    
    ctx.restore();
  }

  /**
   * Dessine un nœud
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   * @param {Object} node - Nœud à dessiner
   * @param {number} index - Index du nœud
   * @private
   */
  drawNode(ctx, node, index) {
    const nodeY = this.y + (index * this.nodeHeight);
    const indent = node.level * this.indentSize;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = this.expandedNodes.has(node.id);
    const isSelected = this.selectedNode && this.selectedNode.id === node.id;
    const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
    
    // Fond
    if (isSelected) {
      ctx.fillStyle = this.selectedBg;
      ctx.fillRect(this.x, nodeY, this.width, this.nodeHeight);
    } else if (isHovered) {
      ctx.fillStyle = this.hoverBg;
      ctx.fillRect(this.x, nodeY, this.width, this.nodeHeight);
    }
    
    // Bordure inférieure
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, nodeY + this.nodeHeight);
    ctx.lineTo(this.x + this.width, nodeY + this.nodeHeight);
    ctx.stroke();
    
    let currentX = this.x + 16 + indent;
    
    // Icône expand/collapse
    if (hasChildren) {
      const iconSize = 16;
      const iconX = currentX;
      const iconY = nodeY + this.nodeHeight / 2;
      
      ctx.strokeStyle = this.iconColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      if (isExpanded) {
        // Chevron down
        ctx.beginPath();
        ctx.moveTo(iconX, iconY - 4);
        ctx.lineTo(iconX + iconSize / 2, iconY + 2);
        ctx.lineTo(iconX + iconSize, iconY - 4);
        ctx.stroke();
      } else {
        // Chevron right
        ctx.beginPath();
        ctx.moveTo(iconX + 2, iconY - iconSize / 2);
        ctx.lineTo(iconX + 8, iconY);
        ctx.lineTo(iconX + 2, iconY + iconSize / 2);
        ctx.stroke();
      }
      
      currentX += iconSize + 8;
    } else {
      currentX += 24; // Espace pour aligner avec les nœuds parents
    }
    
    // Icône du nœud
    if (this.showIcons && node.icon) {
      const iconSize = 20;
      const iconY = nodeY + this.nodeHeight / 2 - iconSize / 2;
      
      // Dessiner un simple carré coloré comme icône (peut être personnalisé)
      ctx.fillStyle = node.icon;
      ctx.fillRect(currentX, iconY, iconSize, iconSize);
      
      currentX += iconSize + 8;
    } else if (this.showIcons) {
      // Icône par défaut (dossier ou fichier)
      const iconSize = 20;
      const iconY = nodeY + this.nodeHeight / 2 - iconSize / 2;
      
      ctx.strokeStyle = this.iconColor;
      ctx.lineWidth = 2;
      
      if (hasChildren) {
        // Icône dossier
        ctx.beginPath();
        ctx.moveTo(currentX, iconY + 4);
        ctx.lineTo(currentX, iconY + iconSize);
        ctx.lineTo(currentX + iconSize, iconY + iconSize);
        ctx.lineTo(currentX + iconSize, iconY + 4);
        ctx.lineTo(currentX + iconSize * 0.6, iconY + 4);
        ctx.lineTo(currentX + iconSize * 0.5, iconY);
        ctx.lineTo(currentX, iconY);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Icône fichier
        ctx.beginPath();
        ctx.moveTo(currentX, iconY);
        ctx.lineTo(currentX + iconSize * 0.7, iconY);
        ctx.lineTo(currentX + iconSize, iconY + iconSize * 0.3);
        ctx.lineTo(currentX + iconSize, iconY + iconSize);
        ctx.lineTo(currentX, iconY + iconSize);
        ctx.closePath();
        ctx.stroke();
        
        // Coin plié
        ctx.beginPath();
        ctx.moveTo(currentX + iconSize * 0.7, iconY);
        ctx.lineTo(currentX + iconSize * 0.7, iconY + iconSize * 0.3);
        ctx.lineTo(currentX + iconSize, iconY + iconSize * 0.3);
        ctx.stroke();
      }
      
      currentX += iconSize + 8;
    }
    
    // Label
    ctx.fillStyle = this.textColor;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const maxWidth = this.width - (currentX - this.x) - 16;
    let displayText = node.label;
    
    // Tronquer si nécessaire
    if (ctx.measureText(displayText).width > maxWidth) {
      while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '...';
    }
    
    ctx.fillText(displayText, currentX, nodeY + this.nodeHeight / 2);
  }

  /**
   * Trouve le nœud à une position
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {Object|null} Nœud trouvé
   * @private
   */
  getNodeAtPosition(x, y) {
    const relY = y - this.y;
    const index = Math.floor(relY / this.nodeHeight);
    const flattenedNodes = this.getFlattenedNodes();
    
    if (index >= 0 && index < flattenedNodes.length) {
      return flattenedNodes[index];
    }
    
    return null;
  }

  /**
   * Vérifie si le clic est sur l'icône expand
   * @param {number} x - Coordonnée X
   * @param {Object} node - Nœud
   * @returns {boolean} True si clic sur expand
   * @private
   */
  isClickOnExpand(x, node) {
    const indent = node.level * this.indentSize;
    const expandX = this.x + 16 + indent;
    return x >= expandX && x <= expandX + 16;
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
   * Gère le clic
   */
  onClick() {
    // Géré dans onPress pour avoir les coordonnées
  }

  /**
   * Gère la pression
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  onPress(x, y) {
    const node = this.getNodeAtPosition(x, y);
    
    if (node) {
      const hasChildren = node.children && node.children.length > 0;
      
      if (hasChildren && this.isClickOnExpand(x, node)) {
        // Clic sur l'icône expand/collapse
        this.toggleNode(node);
      } else {
        // Clic sur le nœud lui-même
        this.selectNode(node);
      }
    }
  }

  /**
   * Gère le mouvement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  onMove(x, y) {
    this.hoveredNode = this.getNodeAtPosition(x, y);
  }

  /**
   * Développe tous les nœuds
   */
  expandAll() {
    const expandRecursive = (nodes) => {
      for (let node of nodes) {
        if (node.children && node.children.length > 0) {
          this.expandedNodes.add(node.id);
          expandRecursive(node.children);
        }
      }
    };
    
    expandRecursive(this.nodes);
    this.updateHeight();
  }

  /**
   * Replie tous les nœuds
   */
  collapseAll() {
    this.expandedNodes.clear();
    this.updateHeight();
  }

  /**
   * Trouve un nœud par son ID
   * @param {string} id - ID du nœud
   * @param {Array} [nodes=this.nodes] - Nœuds à chercher
   * @returns {Object|null} Nœud trouvé
   */
  findNodeById(id, nodes = this.nodes) {
    for (let node of nodes) {
      if (node.id === id) return node;
      
      if (node.children) {
        const found = this.findNodeById(id, node.children);
        if (found) return found;
      }
    }
    
    return null;
  }
}

export default TreeView;