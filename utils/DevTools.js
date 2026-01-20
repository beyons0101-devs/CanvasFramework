/**
 * Outils de développement pour CanvasFramework
 * @class
 */
class DevTools {
  /**
   * Crée une instance de DevTools
   * @param {CanvasFramework} framework - Instance du framework
   */
  constructor(framework) {
    this.framework = framework;
    this.isOpen = false;
    this.currentTab = 'components';
    this.panels = {};
    this.hoveredComponent = null;
    this.selectedComponent = null;
    this.performanceStats = {
      fps: [],
      memory: [],
      drawCalls: []
    };
    this.setupUI();
  }

  /**
   * Configure l'interface du DevTools
   */
  setupUI() {
    // Créer le conteneur principal
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: #1e1e1e;
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      z-index: 9999;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
      box-shadow: -2px 0 10px rgba(0,0,0,0.5);
    `;

    // Header
    this.header = document.createElement('div');
    this.header.style.cssText = `
      background: #252526;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #333;
      user-select: none;
    `;

    this.title = document.createElement('div');
    this.title.textContent = 'Canvas Framework DevTools';
    this.title.style.fontWeight = 'bold';

    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = '×';
    this.closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      padding: 0 8px;
    `;
    this.closeBtn.onclick = () => this.toggle();

    this.header.appendChild(this.title);
    this.header.appendChild(this.closeBtn);

    // Tabs
    this.tabs = document.createElement('div');
    this.tabs.style.cssText = `
      display: flex;
      background: #2d2d2d;
      border-bottom: 1px solid #333;
    `;

    const tabConfigs = [
      { id: 'components', label: 'Composants' },
      { id: 'performance', label: 'Performance' },
      { id: 'hierarchy', label: 'Hiérarchie' },
      { id: 'properties', label: 'Propriétés' },
      { id: 'events', label: 'Événements' },
      { id: 'routing', label: 'Routing' }
    ];

    tabConfigs.forEach(config => {
      const tab = document.createElement('button');
      tab.textContent = config.label;
      tab.dataset.tab = config.id;
      tab.style.cssText = `
        flex: 1;
        padding: 8px;
        background: transparent;
        border: none;
        color: #ccc;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      `;
      tab.onclick = () => this.switchTab(config.id);
      this.tabs.appendChild(tab);
    });

    // Content area
    this.content = document.createElement('div');
    this.content.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 10px;
    `;

    // Create panels
    this.createComponentsPanel();
    this.createPerformancePanel();
    this.createHierarchyPanel();
    this.createPropertiesPanel();
    this.createEventsPanel();
    this.createRoutingPanel();

    // Assembler le conteneur
    this.container.appendChild(this.header);
    this.container.appendChild(this.tabs);
    this.container.appendChild(this.content);

    document.body.appendChild(this.container);

    // Bouton toggle flottant
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.textContent = 'DevTools';
    this.toggleBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    this.toggleBtn.onclick = () => this.toggle();
    document.body.appendChild(this.toggleBtn);

    // Setup hotkeys
    this.setupHotkeys();
  }

  /**
   * Crée le panneau des composants
   */
  createComponentsPanel() {
    const panel = document.createElement('div');
    panel.id = 'components-panel';
    panel.style.display = 'none';

    // Stats
    const stats = document.createElement('div');
    stats.style.cssText = `
      background: #252526;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 10px;
    `;
    stats.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span>Total: <span id="component-count">0</span></span>
        <span>Visibles: <span id="visible-count">0</span></span>
        <span>Dirty: <span id="dirty-count">0</span></span>
      </div>
    `;

    // Filter
    const filter = document.createElement('input');
    filter.type = 'text';
    filter.placeholder = 'Filtrer les composants...';
    filter.style.cssText = `
      width: 100%;
      padding: 6px;
      margin-bottom: 10px;
      background: #333;
      border: 1px solid #555;
      color: #fff;
      border-radius: 4px;
    `;

    // Component list
    const list = document.createElement('div');
    list.id = 'component-list';
    list.style.cssText = `
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #333;
      border-radius: 4px;
    `;

    // Controls
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 10px;
    `;

    const toggleAllBtn = document.createElement('button');
    toggleAllBtn.textContent = 'Toggle All';
    toggleAllBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: #555;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    toggleAllBtn.onclick = () => this.toggleAllComponents();

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.cssText = toggleAllBtn.style.cssText;
    refreshBtn.onclick = () => this.refreshComponents();

    controls.appendChild(toggleAllBtn);
    controls.appendChild(refreshBtn);

    panel.appendChild(stats);
    panel.appendChild(filter);
    panel.appendChild(list);
    panel.appendChild(controls);

    this.content.appendChild(panel);
    this.panels.components = panel;
  }

  /**
   * Crée le panneau de performance
   */
  createPerformancePanel() {
    const panel = document.createElement('div');
    panel.id = 'performance-panel';
    panel.style.display = 'none';

    // FPS Chart
    const fpsSection = document.createElement('div');
    fpsSection.style.marginBottom = '20px';

    const fpsTitle = document.createElement('h3');
    fpsTitle.textContent = 'FPS';
    fpsTitle.style.marginBottom = '8px';

    const fpsCanvas = document.createElement('canvas');
    fpsCanvas.width = 380;
    fpsCanvas.height = 100;
    fpsCanvas.style.cssText = `
      width: 100%;
      height: 100px;
      background: #252526;
      border-radius: 4px;
    `;

    fpsSection.appendChild(fpsTitle);
    fpsSection.appendChild(fpsCanvas);

    // Memory Stats
    const memorySection = document.createElement('div');
    memorySection.style.marginBottom = '20px';

    const memoryTitle = document.createElement('h3');
    memoryTitle.textContent = 'Mémoire';
    memoryTitle.style.marginBottom = '8px';

    const memoryInfo = document.createElement('div');
    memoryInfo.id = 'memory-info';
    memoryInfo.style.cssText = `
      background: #252526;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
    `;

    memorySection.appendChild(memoryTitle);
    memorySection.appendChild(memoryInfo);

    // Performance Tips
    const tipsSection = document.createElement('div');

    const tipsTitle = document.createElement('h3');
    tipsTitle.textContent = 'Conseils d\'optimisation';
    tipsTitle.style.marginBottom = '8px';

    const tipsList = document.createElement('ul');
    tipsList.style.cssText = `
      padding-left: 20px;
      color: #aaa;
    `;
    tipsList.innerHTML = `
      <li>Activer l'optimizationEnabled</li>
      <li>Réduire le nombre de composants visibles</li>
      <li>Utiliser VirtualList pour les longues listes</li>
      <li>Éviter les animations sur trop de composants</li>
    `;

    tipsSection.appendChild(tipsTitle);
    tipsSection.appendChild(tipsList);

    panel.appendChild(fpsSection);
    panel.appendChild(memorySection);
    panel.appendChild(tipsSection);

    this.content.appendChild(panel);
    this.panels.performance = panel;
    this.fpsCanvas = fpsCanvas;
  }

  /**
   * Crée le panneau hiérarchique
   */
  createHierarchyPanel() {
    const panel = document.createElement('div');
    panel.id = 'hierarchy-panel';
    panel.style.display = 'none';

    const tree = document.createElement('div');
    tree.id = 'component-tree';
    tree.style.cssText = `
      font-family: monospace;
      line-height: 1.4;
    `;

    panel.appendChild(tree);
    this.content.appendChild(panel);
    this.panels.hierarchy = panel;
  }

  /**
   * Crée le panneau des propriétés
   */
  createPropertiesPanel() {
    const panel = document.createElement('div');
    panel.id = 'properties-panel';
    panel.style.display = 'none';

    const noSelection = document.createElement('div');
    noSelection.id = 'no-selection';
    noSelection.textContent = 'Sélectionnez un composant pour voir ses propriétés';
    noSelection.style.color = '#888';

    const propertiesTable = document.createElement('div');
    propertiesTable.id = 'properties-table';
    propertiesTable.style.display = 'none';

    panel.appendChild(noSelection);
    panel.appendChild(propertiesTable);
    this.content.appendChild(panel);
    this.panels.properties = panel;
  }

  /**
   * Crée le panneau des événements
   */
  createEventsPanel() {
    const panel = document.createElement('div');
    panel.id = 'events-panel';
    panel.style.display = 'none';

    const eventsList = document.createElement('div');
    eventsList.id = 'events-list';
    eventsList.style.cssText = `
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 8px;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Events';
    clearBtn.style.cssText = `
      margin-top: 10px;
      padding: 6px 12px;
      background: #555;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    clearBtn.onclick = () => this.clearEvents();

    panel.appendChild(eventsList);
    panel.appendChild(clearBtn);
    this.content.appendChild(panel);
    this.panels.events = panel;
    this.eventsList = eventsList;
  }

  /**
   * Crée le panneau de routing
   */
  createRoutingPanel() {
    const panel = document.createElement('div');
    panel.id = 'routing-panel';
    panel.style.display = 'none';

    const routeInfo = document.createElement('div');
    routeInfo.id = 'route-info';
    routeInfo.style.cssText = `
      background: #252526;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 10px;
    `;

    const historySection = document.createElement('div');

    const historyTitle = document.createElement('h3');
    historyTitle.textContent = 'Historique de navigation';
    historyTitle.style.marginBottom = '8px';

    const historyList = document.createElement('div');
    historyList.id = 'history-list';
    historyList.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 8px;
    `;

    historySection.appendChild(historyTitle);
    historySection.appendChild(historyList);

    panel.appendChild(routeInfo);
    panel.appendChild(historySection);

    this.content.appendChild(panel);
    this.panels.routing = panel;
  }

  /**
   * Configure les raccourcis clavier
   */
  setupHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
      
      // Permet d'inspecter les composants avec Ctrl+Click
      this.framework.canvas.addEventListener('click', (e) => {
        if (e.ctrlKey && this.isOpen) {
          e.preventDefault();
          const rect = this.framework.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          this.inspectComponentAt(x, y);
        }
      });
    });
  }

  /**
   * Bascule l'affichage du DevTools
   */
  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.container.style.transform = 'translateX(0)';
      this.refreshAll();
      this.startMonitoring();
    } else {
      this.container.style.transform = 'translateX(100%)';
      this.stopMonitoring();
    }
  }

  /**
   * Change l'onglet actif
   */
  switchTab(tabId) {
    this.currentTab = tabId;
    
    // Mettre à jour les styles des tabs
    this.tabs.querySelectorAll('button').forEach(btn => {
      btn.style.borderBottomColor = btn.dataset.tab === tabId ? '#007acc' : 'transparent';
      btn.style.color = btn.dataset.tab === tabId ? '#fff' : '#ccc';
    });
    
    // Afficher/masquer les panels
    Object.keys(this.panels).forEach(panelId => {
      this.panels[panelId].style.display = panelId === tabId ? 'block' : 'none';
    });
    
    if (tabId === 'performance') {
      this.updatePerformancePanel();
    } else if (tabId === 'hierarchy') {
      this.updateHierarchyPanel();
    } else if (tabId === 'components') {
      this.updateComponentsPanel();
    } else if (tabId === 'routing') {
      this.updateRoutingPanel();
    }
  }

  /**
   * Rafraîchit toutes les données
   */
  refreshAll() {
    this.updateComponentsPanel();
    this.updateHierarchyPanel();
    this.updateRoutingPanel();
  }

  /**
   * Met à jour le panneau des composants
   */
  updateComponentsPanel() {
    if (!this.isOpen || this.currentTab !== 'components') return;

    const components = this.framework.components;
    const visibleCount = components.filter(c => c.visible).length;
    const dirtyCount = components.filter(c => c._dirty).length;

    document.getElementById('component-count').textContent = components.length;
    document.getElementById('visible-count').textContent = visibleCount;
    document.getElementById('dirty-count').textContent = dirtyCount;

    const list = document.getElementById('component-list');
    list.innerHTML = '';

    components.forEach((comp, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 6px 8px;
        border-bottom: 1px solid #333;
        cursor: pointer;
        display: flex;
        align-items: center;
        background: ${comp === this.selectedComponent ? '#007acc20' : 'transparent'};
      `;

      const type = comp.constructor.name;
      const bounds = `[${Math.round(comp.x)},${Math.round(comp.y)} ${Math.round(comp.width)}x${Math.round(comp.height)}]`;

      item.innerHTML = `
        <div style="display: flex; align-items: center; flex: 1;">
          <input type="checkbox" ${comp.visible ? 'checked' : ''} 
                 style="margin-right: 8px;" 
                 onchange="event.stopPropagation(); devTools.toggleComponentVisibility(${index}, this.checked)">
          <span style="color: #4ec9b0; min-width: 120px;">${type}</span>
          <span style="color: #ccc; margin-left: 8px;">${bounds}</span>
          ${comp._dirty ? '<span style="color: orange; margin-left: 8px;">●</span>' : ''}
        </div>
        <button onclick="event.stopPropagation(); devTools.highlightComponent(${index})"
                style="background: transparent; border: 1px solid #555; color: #ccc; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
          ✨
        </button>
      `;

      item.onclick = () => this.selectComponent(comp);
      list.appendChild(item);
    });
  }

  /**
   * Met à jour le panneau de performance
   */
  updatePerformancePanel() {
    if (!this.isOpen || this.currentTab !== 'performance') return;

    // Mettre à jour les stats FPS
    this.performanceStats.fps.push(this.framework.fps);
    if (this.performanceStats.fps.length > 100) {
      this.performanceStats.fps.shift();
    }

    // Mettre à jour le graphique FPS
    this.drawFPSChart();

    // Mettre à jour les infos mémoire
    if (performance.memory) {
      const memory = performance.memory;
      document.getElementById('memory-info').innerHTML = `
        <div>Used: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB</div>
        <div>Total: ${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB</div>
        <div>Limit: ${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB</div>
      `;
    }
  }

  /**
   * Dessine le graphique FPS
   */
  drawFPSChart() {
    if (!this.fpsCanvas) return;

    const ctx = this.fpsCanvas.getContext('2d');
    const width = this.fpsCanvas.width;
    const height = this.fpsCanvas.height;

    // Clear
    ctx.fillStyle = '#252526';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal lines (FPS markers)
    for (let i = 0; i <= 60; i += 15) {
      const y = height - (i / 60 * height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText(`${i}`, 5, y - 2);
    }

    // Draw FPS line
    if (this.performanceStats.fps.length > 1) {
      ctx.strokeStyle = '#4ec9b0';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = width / (this.performanceStats.fps.length - 1);
      this.performanceStats.fps.forEach((fps, i) => {
        const x = i * step;
        const y = height - (Math.min(fps, 60) / 60 * height);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Current FPS
      const currentFps = this.performanceStats.fps[this.performanceStats.fps.length - 1] || 0;
      ctx.fillStyle = currentFps < 30 ? '#ff5555' : '#4ec9b0';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${currentFps} FPS`, width - 5, 15);
    }
  }

  /**
   * Met à jour le panneau hiérarchique
   */
  updateHierarchyPanel() {
    if (!this.isOpen || this.currentTab !== 'hierarchy') return;

    const tree = document.getElementById('component-tree');
    tree.innerHTML = '';
    
    const renderComponent = (comp, depth = 0) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding-left: ${depth * 20}px;
        margin: 2px 0;
        cursor: pointer;
        background: ${comp === this.selectedComponent ? '#007acc20' : 'transparent'};
      `;

      const type = comp.constructor.name;
      const hasChildren = comp.children && comp.children.length > 0;

      item.innerHTML = `
        <span style="color: ${comp.visible ? '#4ec9b0' : '#555'}">
          ${hasChildren ? '▼' : '○'} ${type} 
          <span style="color: #888; font-size: 10px;">
            (${comp.width}x${comp.height})
          </span>
        </span>
      `;

      item.onclick = () => this.selectComponent(comp);
      tree.appendChild(item);

      // Rendre les enfants si c'est une Card ou autre conteneur
		if (hasChildren && comp.children) {
		  // Vérifier si c'est un itérable
		  const childArray = Array.isArray(comp.children) ? comp.children : [];
		  
		  childArray.forEach(child => {
			// Vérifier si c'est un objet avec les propriétés d'un composant
			if (child && typeof child === 'object' && 
				'x' in child && 'y' in child && 'width' in child && 'height' in child) {
			  renderComponent(child, depth + 1);
			}
		  });
		}
    };

    this.framework.components.forEach(comp => {
      renderComponent(comp);
    });
  }

  /**
   * Met à jour le panneau des propriétés
   */
	updatePropertiesPanel() {
	  if (!this.selectedComponent) return;

	  const table = document.getElementById('properties-table');
	  const noSelection = document.getElementById('no-selection');
	  
	  noSelection.style.display = 'none';
	  table.style.display = 'block';
	  table.innerHTML = '';

	  const comp = this.selectedComponent;
	  const props = {};

	  // Collecter toutes les propriétés
	  for (let key in comp) {
		if (key.startsWith('_') || key === 'framework') continue; // <-- EXCLURE 'framework'
		
		try {
		  const value = comp[key];
		  if (typeof value === 'function') continue;
		  
		  // Éviter les références circulaires
		  if (key === 'parent' || key === 'children' || key === 'framework') {
			props[key] = `[${value?.constructor?.name || 'Object'}]`;
			continue;
		  }
		  
		  // Tenter de stringifier, mais avec un repli sûr
		  props[key] = value;
		} catch (e) {
		  props[key] = '<error>';
		}
	  }

	  // Créer le tableau
	  Object.entries(props).forEach(([key, value]) => {
		const row = document.createElement('div');
		row.style.cssText = `
		  display: flex;
		  padding: 4px 0;
		  border-bottom: 1px solid #333;
		`;

		const keyCell = document.createElement('div');
		keyCell.textContent = key;
		keyCell.style.cssText = `
		  color: #9cdcfe;
		  min-width: 150px;
		  font-family: monospace;
		`;

		const valueCell = document.createElement('div');
		
		try {
		  // Fonction pour stringifier en évitant les cycles
		  const safeStringify = (obj, replacer, space) => {
			const seen = new WeakSet();
			return JSON.stringify(obj, (key, value) => {
			  if (typeof value === 'object' && value !== null) {
				if (seen.has(value)) {
				  return '[Circular Reference]';
				}
				seen.add(value);
			  }
			  return replacer ? replacer(key, value) : value;
			}, space);
		  };

		  if (typeof value === 'object' && value !== null) {
			// Exclure certaines propriétés problématiques
			if (value === comp || value === this.framework) {
			  valueCell.textContent = '[Circular Reference]';
			} else if (value instanceof HTMLElement) {
			  valueCell.textContent = `[HTMLElement: ${value.tagName}]`;
			} else if (value instanceof Event) {
			  valueCell.textContent = `[Event: ${value.type}]`;
			} else if (value instanceof NodeList || value instanceof HTMLCollection) {
			  valueCell.textContent = `[Collection: ${value.length} items]`;
			} else {
			  try {
				valueCell.textContent = safeStringify(value, null, 2);
			  } catch (e) {
				valueCell.textContent = `[Object: ${value.constructor?.name || 'Unknown'}]`;
			  }
			}
			valueCell.style.color = '#ce9178';
		  } else if (typeof value === 'boolean') {
			valueCell.textContent = value.toString();
			valueCell.style.color = '#569cd6';
		  } else if (typeof value === 'number') {
			valueCell.textContent = value;
			valueCell.style.color = '#b5cea8';
		  } else {
			valueCell.textContent = String(value);
			valueCell.style.color = '#d4d4d4';
		  }
		} catch (stringifyError) {
		  valueCell.textContent = '[Unserializable]';
		  valueCell.style.color = '#ff5555';
		}

		valueCell.style.cssText += `
		  font-family: monospace;
		  white-space: pre-wrap;
		  word-break: break-all;
		  flex: 1;
		`;

		row.appendChild(keyCell);
		row.appendChild(valueCell);
		table.appendChild(row);
	  });

	  // Ajouter des contrôles d'édition pour les propriétés importantes
	  const controls = document.createElement('div');
	  controls.style.marginTop = '20px';

	  const editTitle = document.createElement('h4');
	  editTitle.textContent = 'Modifier';
	  editTitle.style.marginBottom = '8px';

	  // Éditeur de position
	  const posEditor = document.createElement('div');
	  posEditor.style.cssText = `
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-bottom: 10px;
	  `;

	  const createNumberInput = (label, value, onChange) => {
		const container = document.createElement('div');
		container.style.cssText = `
		  display: flex;
		  align-items: center;
		  gap: 4px;
		`;

		const labelEl = document.createElement('span');
		labelEl.textContent = label;
		labelEl.style.minWidth = '40px';

		const input = document.createElement('input');
		input.type = 'number';
		input.value = value;
		input.style.cssText = `
		  width: 60px;
		  padding: 2px 4px;
		  background: #333;
		  border: 1px solid #555;
		  color: #fff;
		  border-radius: 3px;
		`;
		input.onchange = (e) => onChange(parseFloat(e.target.value));

		container.appendChild(labelEl);
		container.appendChild(input);
		return container;
	  };

	  posEditor.appendChild(
		createNumberInput('X:', comp.x, (val) => {
		  comp.x = val;
		  comp.markDirty();
		})
	  );

	  posEditor.appendChild(
		createNumberInput('Y:', comp.y, (val) => {
		  comp.y = val;
		  comp.markDirty();
		})
	  );

	  posEditor.appendChild(
		createNumberInput('W:', comp.width, (val) => {
		  comp.width = val;
		  comp.markDirty();
		})
	  );

	  posEditor.appendChild(
		createNumberInput('H:', comp.height, (val) => {
		  comp.height = val;
		  comp.markDirty();
		})
	  );

	  // Toggle pour visible
	  const visibleControl = document.createElement('div');
	  visibleControl.style.cssText = `
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
	  `;

	  const visibleLabel = document.createElement('span');
	  visibleLabel.textContent = 'Visible:';
	  
	  const visibleCheckbox = document.createElement('input');
	  visibleCheckbox.type = 'checkbox';
	  visibleCheckbox.checked = comp.visible;
	  visibleCheckbox.onchange = () => {
		comp.visible = visibleCheckbox.checked;
		comp.markDirty();
	  };

	  visibleControl.appendChild(visibleLabel);
	  visibleControl.appendChild(visibleCheckbox);

	  controls.appendChild(editTitle);
	  controls.appendChild(posEditor);
	  controls.appendChild(visibleControl);
	  table.appendChild(controls);
	}

  /**
   * Met à jour le panneau de routing
   */
  updateRoutingPanel() {
    if (!this.isOpen || this.currentTab !== 'routing') return;

    const routeInfo = document.getElementById('route-info');
    const historyList = document.getElementById('history-list');

    // Current route
    routeInfo.innerHTML = `
      <div><strong>Route actuelle:</strong> ${this.framework.currentRoute}</div>
      <div><strong>Paramètres:</strong> ${JSON.stringify(this.framework.currentParams)}</div>
      <div><strong>Query:</strong> ${JSON.stringify(this.framework.currentQuery)}</div>
    `;

    // History
    historyList.innerHTML = '';
    this.framework.history.forEach((entry, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 4px 8px;
        margin: 2px 0;
        background: ${index === this.framework.historyIndex ? '#007acc20' : 'transparent'};
        border-radius: 3px;
        cursor: pointer;
        font-family: monospace;
        font-size: 11px;
      `;
      item.textContent = `${index}: ${entry.path}`;
      item.onclick = () => {
        this.framework.navigate(entry.path, { replace: true });
      };
      historyList.appendChild(item);
    });
  }

  /**
   * Ajoute un événement au panneau
   */
  logEvent(type, data) {
    if (!this.isOpen || this.currentTab !== 'events') return;

    const eventItem = document.createElement('div');
    eventItem.style.cssText = `
      padding: 4px 8px;
      margin: 2px 0;
      background: #252526;
      border-left: 3px solid #007acc;
      font-family: monospace;
      font-size: 11px;
    `;

    const time = new Date().toLocaleTimeString();
    eventItem.innerHTML = `
      <div style="color: #569cd6;">${time} - ${type}</div>
      <div style="color: #888; font-size: 10px;">${JSON.stringify(data)}</div>
    `;

    this.eventsList.appendChild(eventItem);
    this.eventsList.scrollTop = this.eventsList.scrollHeight;
  }

  /**
   * Nettoie la liste des événements
   */
  clearEvents() {
    this.eventsList.innerHTML = '';
  }

  /**
   * Sélectionne un composant
   */
  selectComponent(component) {
    this.selectedComponent = component;
    this.updatePropertiesPanel();
    this.updateComponentsPanel();
    this.updateHierarchyPanel();
    this.highlightComponentDirectly(component);
  }

  /**
   * Inspecte un composant à une position donnée
   */
  inspectComponentAt(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    
    for (let i = this.framework.components.length - 1; i >= 0; i--) {
      const comp = this.framework.components[i];
      
      if (comp.visible && comp.isPointInside(x, adjustedY)) {
        this.selectComponent(comp);
        this.switchTab('properties');
        return comp;
      }
    }
    return null;
  }

  /**
   * Met en surbrillance un composant
   */
  highlightComponent(index) {
    if (index >= 0 && index < this.framework.components.length) {
      const comp = this.framework.components[index];
      this.highlightComponentDirectly(comp);
      
      // Animation de flash
      const originalOpacity = comp.opacity;
      let flashCount = 0;
      const flashInterval = setInterval(() => {
        comp.opacity = flashCount % 2 === 0 ? 0.5 : (originalOpacity || 1);
        comp.markDirty();
        flashCount++;
        
        if (flashCount > 5) {
          clearInterval(flashInterval);
          comp.opacity = originalOpacity || 1;
          comp.markDirty();
        }
      }, 200);
    }
  }

  /**
   * Met en surbrillance directe d'un composant
   */
  highlightComponentDirectly(comp) {
    // Dessiner une surbrillance autour du composant
    const originalDraw = comp.draw;
    comp.draw = function(ctx) {
      originalDraw.call(this, ctx);
      
      // Dessiner un cadre de surbrillance
      ctx.save();
      ctx.strokeStyle = '#ff5555';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
      
      // Ajouter une étiquette
      ctx.fillStyle = '#ff5555';
      ctx.font = '10px Arial';
      ctx.fillText(`${this.constructor.name}`, this.x, this.y - 5);
      ctx.restore();
    };
    
    comp.markDirty();
    
    // Restaurer après 2 secondes
    setTimeout(() => {
      comp.draw = originalDraw;
      comp.markDirty();
    }, 2000);
  }

  /**
   * Bascule la visibilité de tous les composants
   */
  toggleAllComponents() {
    const allVisible = this.framework.components.every(c => c.visible);
    this.framework.components.forEach(comp => {
      comp.visible = !allVisible;
      comp.markDirty();
    });
    this.updateComponentsPanel();
  }

  /**
   * Bascule la visibilité d'un composant
   */
  toggleComponentVisibility(index, visible) {
    if (index >= 0 && index < this.framework.components.length) {
      const comp = this.framework.components[index];
      comp.visible = visible;
      comp.markDirty();
      this.updateComponentsPanel();
    }
  }

  /**
   * Rafraîchit la liste des composants
   */
  refreshComponents() {
    this.updateComponentsPanel();
  }

  /**
   * Démarre la surveillance des performances
   */
  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.updatePerformancePanel();
    }, 1000);
  }

  /**
   * Arrête la surveillance des performances
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
  
  /**
   * Nettoie les références et restaure le framework
   */
	cleanup() {
		// Restaurer les méthodes originales si elles existent
		if (this.framework) {
			if (this.originalNavigate) {
				this.framework.navigate = this.originalNavigate;
				this.originalNavigate = null;
			}
			if (this.originalAdd) {
				this.framework.add = this.originalAdd;
				this.originalAdd = null;
			}
		}
		
		// Supprimer la référence globale
		if (window.devTools === this) {
			delete window.devTools;
		}
		
		// Masquer le DevTools
		if (this.isOpen) {
			this.toggle();
		}
		
		// Masquer le bouton flottant
		if (this.toggleBtn) {
			this.toggleBtn.style.display = 'none';
		}
		
		// Nettoyer les écouteurs d'événements
		if (this.closeBtn) {
			this.closeBtn.onclick = null;
		}
		
		if (this.toggleBtn) {
			this.toggleBtn.onclick = null;
		}
		
		// Nettoyer les tabs
		this.tabs.querySelectorAll('button').forEach(tab => {
			tab.onclick = null;
		});
  }

  /**
   * Enregistre le DevTools dans le framework
   */
	attachToFramework() {
		window.devTools = this;
		
		// Sauvegarder les références originales
		this.originalNavigate = this.framework.navigate;
		this.originalAdd = this.framework.add;
		
		// Intercepter les événements du framework
		this.framework.navigate = (...args) => {
			if (window.devTools) {
				window.devTools.logEvent('NAVIGATE', { path: args[0] });
			}
			return this.originalNavigate.apply(this.framework, args);
		};
		
		// Intercepter les ajouts de composants
		this.framework.add = (...args) => {
			if (window.devTools) {
				window.devTools.logEvent('ADD_COMPONENT', { 
					type: args[0]?.constructor?.name 
				});
			}
			return this.originalAdd.apply(this.framework, args);
		};
	}

	/**
	 * Détache le DevTools du framework
	 */
	detachFromFramework() {
		// Restaurer les méthodes originales
		if (this.originalNavigate && this.framework) {
			this.framework.navigate = this.originalNavigate;
		}
		
		if (this.originalAdd && this.framework) {
			this.framework.add = this.originalAdd;
		}
		
		// Supprimer la référence globale
		if (window.devTools === this) {
			delete window.devTools;
		}
		
		// Masquer le DevTools s'il est ouvert
		if (this.isOpen) {
			this.toggle();
		}
		
		// Masquer le bouton flottant
		if (this.toggleBtn) {
			this.toggleBtn.style.display = 'none';
		}
	}
}

export default DevTools;