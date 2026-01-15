import Button from '../components/Button.js';
import SegmentedControl from '../components/SegmentedControl.js';
import Input from '../components/Input.js';
import Slider from '../components/Slider.js';
import Text from '../components/Text.js';
import View from '../components/View.js';
import Card from '../components/Card.js';
import FAB from '../components/FAB.js';
import SpeedDialFAB from '../components/SpeedDialFAB.js';
import MorphingFAB from '../components/MorphingFAB.js';
import CircularProgress from '../components/CircularProgress.js';
import ImageComponent from '../components/ImageComponent.js';
import DatePicker from '../components/DatePicker.js';
import IOSDatePickerWheel from '../components/IOSDatePickerWheel.js';
import AndroidDatePickerDialog from '../components/AndroidDatePickerDialog.js';
import Avatar from '../components/Avatar.js';
import Snackbar from '../components/Snackbar.js';
import BottomNavigationBar from '../components/BottomNavigationBar.js';
import Video from '../components/Video.js';
import Modal from '../components/Modal.js';
import Drawer from '../components/Drawer.js';
import AppBar from '../components/AppBar.js';
import Chip from '../components/Chip.js';
import Stepper from '../components/Stepper.js';
import Accordion from '../components/Accordion.js';
import Tabs from '../components/Tabs.js';
import Switch from '../components/Switch.js';
import SwipeableListItem from '../components/SwipeableListItem.js';
import ListItem from '../components/ListItem.js';
import List from '../components/List.js';
import VirtualList from '../components/VirtualList.js';
import BottomSheet from '../components/BottomSheet.js';
import ProgressBar from '../components/ProgressBar.js';
import RadioButton from '../components/RadioButton.js';
import Dialog from '../components/Dialog.js';
import ContextMenu from '../components/ContextMenu.js';
import Checkbox from '../components/Checkbox.js';
import Toast from '../components/Toast.js';
import NumberInput from '../components/NumberInput.js';
import TextField from '../components/TextField.js';
import SelectDialog from '../components/SelectDialog.js';
import Select from '../components/Select.js';
import MultiSelectDialog from '../components/MultiSelectDialog.js';
import Divider from '../components/Divider.js';
import FileUpload from '../components/FileUpload.js';
import Table from '../components/Table.js';
import TreeView from '../components/TreeView.js';
import SearchInput from '../components/SearchInput.js';
import ImageCarousel from '../components/ImageCarousel.js';
import PasswordInput from '../components/PasswordInput.js';
import InputTags from '../components/InputTags.js';
import InputDatalist from '../components/InputDatalist.js';

// Utils
import SafeArea from '../utils/SafeArea.js';
import StateManager from '../utils/StateManager.js';
import I18n from '../utils/I18n.js';
import SecureStorage from '../utils/SecureStorage.js';
import FormValidator from '../utils/FormValidator.js';
import DataStore from '../utils/DataStore.js';
import EventBus from '../utils/EventBus.js';
import IndexedDBManager from '../utils/IndexedDBManager.js';
import QueryBuilder from '../utils/QueryBuilder.js';
import OfflineSyncManager from '../utils/OfflineSyncManager.js';
import FetchClient from '../utils/FetchClient.js';
import GeoLocationService from '../utils/GeoLocationService.js';
import WebSocketClient from '../utils/WebSocketClient.js';
import AnimationEngine from '../utils/AnimationEngine.js';
import CryptoManager from '../utils/CryptoManager.js';

// Features
import PullToRefresh from '../features/PullToRefresh.js';
import Skeleton from '../features/Skeleton.js';
import SignaturePad from '../features/SignaturePad.js';
import OpenStreetMap from '../features/OpenStreetMap.js';
import LayoutComponent from '../features/LayoutComponent.js';
import Grid from '../features/Grid.js';
import Row from '../features/Row.js';
import Column from '../features/Column.js';
import Positioned from '../features/Positioned.js';
import Stack from '../features/Stack.js';

// Manager
import ErrorHandler from '../manager/ErrorHandler.js';
import PerformanceMonitor from '../manager/PerformanceMonitor.js';
import AccessibilityManager from '../manager/AccessibilityManager.js';
import MemoryManager from '../manager/MemoryManager.js';
import SecurityManager from '../manager/SecurityManager.js';
import FeatureFlags from '../manager/FeatureFlags.js';

// WebGL Adapter
import WebGLCanvasAdapter from './WebGLCanvasAdapter.js';
import ui, { createRef } from './UIBuilder.js';

// theme
export const lightTheme = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#6200EE',
  secondary: '#03DAC6',
  buttonText: '#FFFFFF',
  buttonBackground: '#6200EE',
  border: '#E0E0E0'
};

export const darkTheme = {
  background: '#121212',
  text: '#FFFFFF',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  buttonText: '#000000',
  buttonBackground: '#BB86FC',
  border: '#333333'
};

const FIXED_COMPONENT_TYPES = new Set([
  AppBar,
  BottomNavigationBar,
  Drawer,
  Dialog,
  Modal,
  FAB,
  Toast,
  BottomSheet,
  ContextMenu,
  OpenStreetMap,
  SelectDialog
]);

/**
 * Framework principal pour créer des interfaces utilisateur basées sur Canvas
 * @class
 * @property {HTMLCanvasElement} canvas - Élément canvas HTML
 * @property {CanvasRenderingContext2D} ctx - Contexte 2D du canvas
 * @property {number} width - Largeur du canvas
 * @property {number} height - Hauteur du canvas
 * @property {number} dpr - Device Pixel Ratio
 * @property {string} platform - Plateforme détectée ('material' ou 'cupertino')
 * @property {Component[]} components - Liste des composants
 * @property {Map} routes - Routes de navigation
 * @property {string} currentRoute - Route actuelle
 * @property {Object} state - État global
 * @property {boolean} isDragging - Indique si un drag est en cours
 * @property {number} lastTouchY - Dernière position Y du touch
 * @property {number} scrollOffset - Offset de défilement
 * @property {number} scrollVelocity - Vitesse de défilement
 * @property {number} scrollFriction - Friction du défilement
 */
class CanvasFramework {
  /**
   * Crée une instance de CanvasFramework
   * @param {string} canvasId - ID de l'élément canvas
   */
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    
    this.platform = this.detectPlatform();
    
    // Thèmes
    this.lightTheme = lightTheme;
    this.darkTheme = darkTheme;
    this.theme = lightTheme; // thème par défaut
    
	this.components = [];
    this.state = {};
    // NOUVELLE OPTION: choisir entre Canvas 2D et WebGL
    this.useWebGL = options.useWebGL !== false; // true par défaut
	// Initialiser le contexte approprié
    if (this.useWebGL) {
      try {
        this.ctx = new WebGLCanvasAdapter(this.canvas);
      } catch (e) {
        this.ctx = this.canvas.getContext('2d');
        this.useWebGL = false;
      }
    } else {
      this.ctx = this.canvas.getContext('2d');
    }
	// Calcule FPS
	this.fps = 0;
	this._frames = 0;
	this._lastFpsTime = performance.now();
	this.showFps = options.showFps || false; // false par défaut
	this.debbug = options.debug || false; // false par défaut (et correction de la faute de frappe)
    // Worker pour multithreading
    this.worker = new Worker('./CanvasWorker.js', { type: 'module' });
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.postMessage({ type: 'INIT', payload: { components: [] } });

    // Worker logique pour calculs séparés
    this.logicWorker = new Worker('./LogicWorker.js', { type: 'module' });
    this.logicWorker.onmessage = this.handleLogicWorkerMessage.bind(this);
    this.logicWorkerState = {};

    // Envoyer l'état initial au worker
    this.logicWorker.postMessage({ type: 'SET_STATE', payload: this.state });

    // Gestion des événements
    this.isDragging = false;
    this.lastTouchY = 0;
    this.scrollOffset = 0;
    this.scrollVelocity = 0;
    this.scrollFriction = 0.95;
    
    // Optimisation
    this.dirtyComponents = new Set();
    this.optimizationEnabled = false;
    
	// AJOUTER CETTE LIGNE
    this.animator = new AnimationEngine();
	
    // ===== NOUVEAU SYSTÈME DE ROUTING =====
    this.routes = new Map();
    this.currentRoute = '/';
    this.currentParams = {};
    this.currentQuery = {};
    this.history = [];
    this.historyIndex = -1;
    
    // Animation de transition
    this.transitionState = {
      isTransitioning: false,
      progress: 0,
      duration: 300,
      type: 'slide', // 'slide', 'fade', 'none'
      direction: 'forward', // 'forward', 'back'
      oldComponents: [],
      newComponents: []
    };
    
    this.setupCanvas();
    this.setupEventListeners();
    this.setupHistoryListener();
    this.startRenderLoop();
  }

  wrapContext(ctx, theme) {
    const originalFillStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
    Object.defineProperty(ctx, 'fillStyle', {
      set: (value) => {
        // Si value est blanc/noir ou une couleur “neutre”, tu remplaces par theme
        if (value === '#FFFFFF' || value === '#000000') {
          originalFillStyle.set.call(ctx, theme.text); 
        } else {
          originalFillStyle.set.call(ctx, value);
        }
      },
      get: () => originalFillStyle.get.call(ctx)
    });
  }	

  // Set Theme dynamique
  setTheme(theme) {
    this.theme = theme;

    // Intercepter le context pour remplacer les couleurs globalement
    if (!this.useWebGL) {
      this.wrapContext(this.ctx, theme);
    }

    // marque tous les composants dirty pour redraw
    for (let comp of this.components) comp.markDirty();
  }
	
  // Switch Theme
  toggleDarkMode() {
    if (this.theme === lightTheme) {
      this.setTheme(darkTheme);
    } else {
      this.setTheme(lightTheme);
    }
  }
	
  enableFpsDisplay(enable = true) {
    this.showFps = enable;
  }

  // AJOUTER CETTE MÉTHODE (optionnel - pour faciliter l'accès)
  animate(component, options) {
    return this.animator.animate(component, options);
  }

  // ----- Worker UI -----
  handleWorkerMessage(e) {
    const { type, payload } = e.data;
    switch(type) {
      case 'LAYOUT_DONE':
        for (let update of payload) {
          const comp = this.components.find(c => c.id === update.id);
          if (comp) comp.height = update.height;
        }
        break;
      case 'SCROLL_UPDATED':
        this.scrollOffset = payload.offset;
        this.scrollVelocity = payload.velocity;
        break;
    }
  }

  updateLayoutAsync() {
    this.worker.postMessage({ type: 'UPDATE_LAYOUT' });
  }

  updateScrollInertia() {
    const maxScroll = this.getMaxScroll();
    this.worker.postMessage({
      type: 'SCROLL_INERTIA',
      payload: {
        offset: this.scrollOffset,
        velocity: this.scrollVelocity,
        friction: this.scrollFriction,
        maxScroll
      }
    });
  }

  // ------ Logic Worker --------
  handleLogicWorkerMessage(e) {
    const { type, payload } = e.data;
    switch(type) {
        case 'STATE_UPDATED':
        // Le worker a renvoyé le nouvel état global
        this.logicWorkerState = payload;
        break;

        case 'EXECUTION_RESULT':
        // Résultat d'une tâche spécifique envoyée au worker
        if (this.onWorkerResult) this.onWorkerResult(payload);
        break;

        case 'EXECUTION_ERROR':
        console.error('Logic Worker Error:', payload);
        break;
    }
  }

  runLogicTask(taskName, taskData) {
    this.logicWorker.postMessage({
        type: 'EXECUTE_TASK',
        payload: { taskName, taskData }
    });
  }

  updateLogicWorkerState(newState) {
    this.logicWorkerState = { ...this.logicWorkerState, ...newState };
    this.logicWorker.postMessage({ type: 'SET_STATE', payload: this.logicWorkerState });
  }

  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'material';
    if (/iphone|ipad|ipod/.test(ua)) return 'cupertino';
    return 'material';
  }

  setupCanvas() {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    
	// Échelle uniquement pour Canvas 2D
    if (!this.useWebGL) {
      this.ctx.scale(this.dpr, this.dpr);
    } else {
      // WebGL gère le DPR automatiquement via la matrice de projection
      this.ctx.updateProjectionMatrix();
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Configure l'écoute de l'historique du navigateur
   * @private
   */
  setupHistoryListener() {
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.route) {
        this.navigateTo(e.state.route, {
          replace: true,
          animate: true,
          direction: 'back'
        });
      }
    });
  }

  // ===== MÉTHODES DE ROUTING =====

  /**
   * Définit une route avec pattern de paramètres
   * @param {string} pattern - Pattern de la route (ex: '/user/:id', '/posts/:category/:id')
   * @param {Function} component - Fonction qui crée les composants
   * @param {Object} options - Options de la route
   * @returns {CanvasFramework}
   */
  route(pattern, component, options = {}) {
    const route = {
      pattern,
      component,
      regex: this.patternToRegex(pattern),
      paramNames: this.extractParamNames(pattern),
      beforeEnter: options.beforeEnter,
      afterEnter: options.afterEnter,
      beforeLeave: options.beforeLeave,
      transition: options.transition || 'slide'
    };
    
    this.routes.set(pattern, route);
    return this;
  }

  /**
   * Convertit un pattern de route en regex
   * @private
   */
  patternToRegex(pattern) {
    const regexPattern = pattern
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^\\/]+)');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * Extrait les noms des paramètres d'un pattern
   * @private
   */
  extractParamNames(pattern) {
    const matches = pattern.match(/:([^\/]+)/g);
    return matches ? matches.map(m => m.slice(1)) : [];
  }

  /**
   * Trouve la route correspondant à un path
   * @private
   */
  matchRoute(path) {
    // Séparer le path et la query string
    const [pathname, queryString] = path.split('?');
    
    for (let [pattern, route] of this.routes) {
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        
        const query = this.parseQueryString(queryString);
        
        return { route, params, query, pathname };
      }
    }
    return null;
  }

  /**
   * Parse une query string
   * @private
   */
  parseQueryString(queryString) {
    if (!queryString) return {};
    
    const params = {};
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return params;
  }

  /**
   * Navigue vers une route
   * @param {string} path - Chemin de destination (ex: '/user/123', '/posts/tech/456?sort=date')
   * @param {Object} options - Options de navigation
   */
  navigate(path, options = {}) {
    this.navigateTo(path, options);
  }

  /**
   * Méthode interne de navigation
   * @private
   */
  async navigateTo(path, options = {}) {
    const {
      replace = false,
      animate = true,
      direction = 'forward',
      transition = null,
      state = {}
    } = options;

    const match = this.matchRoute(path);
    if (!match) {
      console.warn(`Route not found: ${path}`);
      return;
    }

    const { route, params, query, pathname } = match;

    // Hook beforeLeave de la route actuelle
    const currentRouteData = this.routes.get(this.currentRoute);
    if (currentRouteData?.beforeLeave) {
      const canLeave = await currentRouteData.beforeLeave(this.currentParams, this.currentQuery);
      if (canLeave === false) return;
    }

    // Hook beforeEnter de la nouvelle route
    if (route.beforeEnter) {
      const canEnter = await route.beforeEnter(params, query);
      if (canEnter === false) return;
    }

    // Sauvegarder l'ancienne route pour l'animation
    const oldComponents = [...this.components];

    // Mettre à jour l'état
    this.currentRoute = pathname;
    this.currentParams = params;
    this.currentQuery = query;

    // Gérer l'historique
    if (!replace) {
      this.historyIndex++;
      this.history = this.history.slice(0, this.historyIndex);
      this.history.push({ path, params, query, state });
      
      // Mettre à jour l'historique du navigateur
      window.history.pushState(
        { route: path, params, query, state },
        '',
        path
      );
    } else {
      this.history[this.historyIndex] = { path, params, query, state };
      window.history.replaceState(
        { route: path, params, query, state },
        '',
        path
      );
    }

    // Créer les nouveaux composants
    this.components = [];
    if (typeof route.component === 'function') {
      route.component(this, params, query);
    }

    // Lancer l'animation de transition
    if (animate && !this.transitionState.isTransitioning) {
      const transitionType = transition || route.transition || 'slide';
      this.startTransition(oldComponents, this.components, transitionType, direction);
    }

    // Hook afterEnter
    if (route.afterEnter) {
      route.afterEnter(params, query);
    }
  }

  /**
   * Démarre une animation de transition
   * @private
   */
  startTransition(oldComponents, newComponents, type, direction) {
    this.transitionState = {
      isTransitioning: true,
      progress: 0,
      duration: 300,
      type,
      direction,
      oldComponents: [...oldComponents],
      newComponents: [...newComponents],
      startTime: Date.now()
    };
  }

  /**
   * Met à jour l'animation de transition
   * @private
   */
  updateTransition() {
    if (!this.transitionState.isTransitioning) return;

    const elapsed = Date.now() - this.transitionState.startTime;
    this.transitionState.progress = Math.min(elapsed / this.transitionState.duration, 1);

    // Fonction d'easing (ease-in-out)
    const eased = this.easeInOutCubic(this.transitionState.progress);

    // Appliquer la transformation selon le type
    this.ctx.save();
    this.applyTransitionTransform(eased);
    this.ctx.restore();

    // Terminer la transition
    if (this.transitionState.progress >= 1) {
      this.transitionState.isTransitioning = false;
      this.transitionState.oldComponents = [];
    }
  }

  /**
   * Applique la transformation de transition
   * @private
   */
  applyTransitionTransform(progress) {
    const { type, direction, oldComponents, newComponents } = this.transitionState;
    const directionMultiplier = direction === 'forward' ? 1 : -1;

    switch (type) {
      case 'slide':
        // Dessiner l'ancienne vue qui sort
        this.ctx.save();
        this.ctx.translate(-this.width * progress * directionMultiplier, 0);
        this.ctx.globalAlpha = 1 - progress * 0.3;
        for (let comp of oldComponents) {
          if (comp.visible) comp.draw(this.ctx);
        }
        this.ctx.restore();

        // Dessiner la nouvelle vue qui entre
        this.ctx.save();
        this.ctx.translate(this.width * (1 - progress) * directionMultiplier, 0);
        for (let comp of newComponents) {
          if (comp.visible) comp.draw(this.ctx);
        }
        this.ctx.restore();
        break;

      case 'fade':
        // Dessiner l'ancienne vue qui fade out
        this.ctx.save();
        this.ctx.globalAlpha = 1 - progress;
        for (let comp of oldComponents) {
          if (comp.visible) comp.draw(this.ctx);
        }
        this.ctx.restore();

        // Dessiner la nouvelle vue qui fade in
        this.ctx.save();
        this.ctx.globalAlpha = progress;
        for (let comp of newComponents) {
          if (comp.visible) comp.draw(this.ctx);
        }
        this.ctx.restore();
        break;

      case 'none':
        // Pas d'animation, juste afficher la nouvelle vue
        for (let comp of newComponents) {
          if (comp.visible) comp.draw(this.ctx);
        }
        break;
    }
  }

  /**
   * Fonction d'easing
   * @private
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Retour en arrière dans l'historique
   */
  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const historyEntry = this.history[this.historyIndex];
      this.navigateTo(historyEntry.path, {
        replace: true,
        animate: true,
        direction: 'back'
      });
      window.history.back();
    }
  }

  /**
   * Avancer dans l'historique
   */
  goForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const historyEntry = this.history[this.historyIndex];
      this.navigateTo(historyEntry.path, {
        replace: true,
        animate: true,
        direction: 'forward'
      });
      window.history.forward();
    }
  }

  /**
   * Obtient les paramètres de la route actuelle
   * @returns {Object}
   */
  getParams() {
    return { ...this.currentParams };
  }

  /**
   * Obtient la query string de la route actuelle
   * @returns {Object}
   */
  getQuery() {
    return { ...this.currentQuery };
  }

  /**
   * Obtient un paramètre spécifique
   * @param {string} name
   * @returns {string|undefined}
   */
  getParam(name) {
    return this.currentParams[name];
  }

  /**
   * Obtient un paramètre de query spécifique
   * @param {string} name
   * @returns {string|undefined}
   */
  getQueryParam(name) {
    return this.currentQuery[name];
  }

  // ===== FIN DES MÉTHODES DE ROUTING =====

  handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = false;
    const touch = e.touches[0];
    const pos = this.getTouchPos(touch);
    this.lastTouchY = pos.y;
    this.checkComponentsAtPosition(pos.x, pos.y, 'start');
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getTouchPos(touch);
    
    if (!this.isDragging) {
      const deltaY = Math.abs(pos.y - this.lastTouchY);
      if (deltaY > 5) {
        this.isDragging = true;
      }
    }
    
    if (this.isDragging) {
      const deltaY = pos.y - this.lastTouchY;
      this.scrollOffset += deltaY;
      const maxScroll = this.getMaxScroll();
      this.scrollOffset = Math.max(Math.min(this.scrollOffset, 0), -maxScroll);
      this.scrollVelocity = deltaY;
      this.lastTouchY = pos.y;
    } else {
      this.checkComponentsAtPosition(pos.x, pos.y, 'move');
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = this.getTouchPos(touch);
    
    if (!this.isDragging) {
      this.checkComponentsAtPosition(pos.x, pos.y, 'end');
    } else {
      this.isDragging = false;
    }
  }

  handleMouseDown(e) {
    this.isDragging = false;
    this.lastTouchY = e.clientY;
    this.checkComponentsAtPosition(e.clientX, e.clientY, 'start');
  }

  handleMouseMove(e) {
    if (!this.isDragging) {
      const deltaY = Math.abs(e.clientY - this.lastTouchY);
      if (deltaY > 5) {
        this.isDragging = true;
      }
    }
    
    if (this.isDragging) {
      const deltaY = e.clientY - this.lastTouchY;
      this.scrollOffset += deltaY;
      const maxScroll = this.getMaxScroll();
      this.scrollOffset = Math.max(Math.min(this.scrollOffset, 0), -maxScroll);
      this.scrollVelocity = deltaY;
      this.lastTouchY = e.clientY;
    } else {
      this.checkComponentsAtPosition(e.clientX, e.clientY, 'move');
    }
  }

  handleMouseUp(e) {
    if (!this.isDragging) {
      this.checkComponentsAtPosition(e.clientX, e.clientY, 'end');
    } else {
      this.isDragging = false;
    }
  }

  getTouchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  checkComponentsAtPosition(x, y, eventType) {
    const isFixedComponent = (comp) =>
    FIXED_COMPONENT_TYPES.has(comp.constructor);
    
    for (let i = this.components.length - 1; i >= 0; i--) {
      const comp = this.components[i];
      
      if (comp.visible) {
        const adjustedY = isFixedComponent(comp) ? y : y - this.scrollOffset;
        
        if (comp instanceof Card && comp.clickableChildren && comp.children && comp.children.length > 0) {
          if (comp.isPointInside(x, adjustedY)) {
            const cardAdjustedY = adjustedY - comp.y - comp.padding;
            const cardAdjustedX = x - comp.x - comp.padding;
            
            for (let j = comp.children.length - 1; j >= 0; j--) {
              const child = comp.children[j];
              
              if (child.visible && 
                  cardAdjustedY >= child.y && 
                  cardAdjustedY <= child.y + child.height &&
                  cardAdjustedX >= child.x && 
                  cardAdjustedX <= child.x + child.width) {
                
                const relativeX = cardAdjustedX - child.x;
                const relativeY = cardAdjustedY - child.y;
                
                switch (eventType) {
                  case 'start':
                    child.pressed = true;
                    if (child.onPress) child.onPress?.(relativeX, relativeY);
                    break;
                    
                  case 'move':
                    if (!child.hovered) {
                      child.hovered = true;
                      if (child.onHover) child.onHover();
                    }
                    if (child.onMove) child.onMove?.(relativeX, relativeY);
                    break;
                    
                  case 'end':
                    if (child.pressed) {
                      child.pressed = false;
                      
                      if (child instanceof Input || child instanceof PasswordInput || child instanceof InputTags || child instanceof InputDatalist) {
                        for (let other of this.components) {
                          if (
							  (other instanceof Input ||
							   other instanceof PasswordInput ||
							   other instanceof InputTags ||
							   other instanceof InputDatalist) &&
							  other !== child &&
							  other.focused
							) {
							  other.focused = false;
							  other.cursorVisible = false;
							  other.onBlur?.();
							}
                        }
                        
                        child.focused = true;
                        child.cursorVisible = true;
                        if (child.onFocus) child.onFocus();
                      } else if (child.onClick) {
                        child.onClick();
                      } else if (child.onPress) {
                        child.onPress?.(relativeX, relativeY);
                      }
                    }
                    break;
                }
                
                return;
              }
            }
          }
        }
        
        if (comp.isPointInside(x, adjustedY)) {
          switch (eventType) {
            case 'start':
              comp.pressed = true;
              if (comp.onPress) comp.onPress(x, adjustedY);
              break;
              
            case 'move':
              if (!comp.hovered) {
                comp.hovered = true;
                if (comp.onHover) comp.onHover();
              }
              if (comp.onMove) comp.onMove(x, adjustedY);
              break;
              
            case 'end':
              if (comp.pressed) {
                comp.pressed = false;
                
                if (comp instanceof Input || comp instanceof PasswordInput || comp instanceof InputTags || comp instanceof InputDatalist) {
                  for (let other of this.components) {
                    if (
						  (other instanceof Input ||
						   other instanceof PasswordInput ||
						   other instanceof InputTags ||
						   other instanceof InputDatalist) &&
						  other !== child &&
						  other.focused
						) {
						  other.focused = false;
						  other.cursorVisible = false;
						  other.onBlur?.();
						}
                  }
                  
                  comp.focused = true;
                  comp.cursorVisible = true;
                  if (comp.onFocus) comp.onFocus();
                } else if (comp.onClick) {
                  comp.onClick();
                } else if (comp.onPress) {
                  comp.onPress(x, adjustedY);
                }
              }
              break;
          }
          
          return;
        } else {
          comp.hovered = false;
        }
      }
    }
  }
  
  getMaxScroll() {
    let maxY = 0;
    for (const comp of this.components) {
      if (this.isFixedComponent(comp) || !comp.visible) continue;
      const bottom = comp.y + comp.height;
      if (bottom > maxY) maxY = bottom;
    }
    return Math.max(0, maxY - this.height + 50);
  }
	
  /*getMaxScroll() {
    let maxY = 0;
    for (let comp of this.components) {
      if (!this.isFixedComponent(comp)) {
        maxY = Math.max(maxY, comp.y + comp.height);
      }
    }
    return Math.max(0, maxY - this.height + 50);
  }*/

  handleResize() {
    // Pour WebGL, NE PAS redimensionner automatiquement
    if (!this.useWebGL) {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.setupCanvas();
    
      for (const comp of this.components) {
        if (comp._resize) {
          comp._resize(this.width, this.height);
        }
      }
    } 
  }

  add(component) {
    this.components.push(component);
	component._mount();
    return component;
  }

  remove(component) {
    const index = this.components.indexOf(component);
    if (index > -1) {
		component._unmount();
		this.components.splice(index, 1);
	}
  }
  
  markComponentDirty(component) {
    if (this.optimizationEnabled) {
      this.dirtyComponents.add(component);
    }
  }

  enableOptimization() {
    this.optimizationEnabled = true;
  }

  /**
  * Dessine un petit triangle rouge pour indiquer overflow (style Flutter)
  */
  drawOverflowIndicators() {
    const ctx = this.ctx;
  
    // Pour chaque composant
    for (let comp of this.components) {
      if (!comp.visible) continue;
    
      // Position réelle à l'écran
      const isFixed = this.isFixedComponent(comp);
      const screenY = isFixed ? comp.y : comp.y + this.scrollOffset;
      const screenX = comp.x;
    
      // Vérifier si le composant TEXT a une largeur/hauteur incorrecte
      let actualWidth = comp.width;
      let actualHeight = comp.height;
    
      // Si c'est un Text, vérifier la taille réelle du texte
      if (comp instanceof Text && comp.text && ctx.measureText) {
        try {
          // Sauvegarder le style actuel
          ctx.save();
        
          // Appliquer le style du texte
          if (comp.fontSize) {
            ctx.font = `${comp.fontSize}px ${comp.fontFamily || 'Arial'}`;
          }
        
          // Mesurer la taille réelle
          const metrics = ctx.measureText(comp.text);
          actualWidth = metrics.width + (comp.padding || 0) * 2;
          actualHeight = (comp.fontSize || 16) + (comp.padding || 0) * 2;
        
          ctx.restore();
        } catch (e) {
          // En cas d'erreur, garder les dimensions par défaut
        }
      }
    
      // Calculer les limites RÉELLES du composant
      const compLeft = screenX;
      const compRight = screenX + actualWidth;
      const compTop = screenY;
      const compBottom = screenY + actualHeight;
    
      // Vérifier les débordements avec les dimensions RÉELLES
      const overflow = {
        left: compLeft < 0,
        right: compRight > this.width,
        top: compTop < 0,
        bottom: compBottom > this.height
      };
    
      // Si aucun débordement, passer au suivant
      if (!overflow.left && !overflow.right && !overflow.top && !overflow.bottom) {
        continue;
      }
    
      // DEBUG: Afficher les infos du composant
      if (this.debbug) {
		console.table({
		  type: comp.constructor?.name,
		  x: comp.x,
		  y: comp.y,
		  declaredSize: `${comp.width}x${comp.height}`,
		  actualSize: `${actualWidth}x${actualHeight}`,
		  screenPos: `(${screenX}, ${screenY})`,
	   	  overflow
	    });
	  }
    
      // Dessiner les indicateurs
      ctx.save();
    
      // 1. Bordures rouges sur les parties qui débordent
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    
      // Gauche
      if (overflow.left) {
        const overflowWidth = Math.min(actualWidth, -compLeft);
        ctx.fillRect(compLeft, compTop, overflowWidth, actualHeight);
        ctx.strokeRect(compLeft, compTop, overflowWidth, actualHeight);
      }
    
      // Droite
      if (overflow.right) {
        const overflowStart = Math.max(0, this.width - compLeft);
        const overflowWidth = Math.min(actualWidth, compRight - this.width);
        ctx.fillRect(this.width - overflowWidth, compTop, overflowWidth, actualHeight);
        ctx.strokeRect(this.width - overflowWidth, compTop, overflowWidth, actualHeight);
      }
    
      // Haut
      if (overflow.top) {
        const overflowHeight = Math.min(actualHeight, -compTop);
        ctx.fillRect(compLeft, compTop, actualWidth, overflowHeight);
        ctx.strokeRect(compLeft, compTop, actualWidth, overflowHeight);
      }
    
      // Bas
      if (overflow.bottom) {
        const overflowStart = Math.max(0, this.height - compTop);
        const overflowHeight = Math.min(actualHeight, compBottom - this.height);
        ctx.fillRect(compLeft, this.height - overflowHeight, actualWidth, overflowHeight);
        ctx.strokeRect(compLeft, this.height - overflowHeight, actualWidth, overflowHeight);
      }
    
      // 2. Points rouges aux coins
      ctx.fillStyle = 'red';
      const markerSize = 6;
    
      // Coin supérieur gauche
      if (overflow.left || overflow.top) {
        ctx.fillRect(compLeft, compTop, markerSize, markerSize);
      }
    
      // Coin supérieur droit
      if (overflow.right || overflow.top) {
        ctx.fillRect(compRight - markerSize, compTop, markerSize, markerSize);
      }
    
      // Coin inférieur gauche
      if (overflow.left || overflow.bottom) {
        ctx.fillRect(compLeft, compBottom - markerSize, markerSize, markerSize);
      }
    
      // Coin inférieur droit
      if (overflow.right || overflow.bottom) {
        ctx.fillRect(compRight - markerSize, compBottom - markerSize, markerSize, markerSize);
      }
    
      // 3. Texte d'information (optionnel)
      if (this.debbug && comp.text) {
        ctx.fillStyle = 'red';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
      
        const overflowText = [];
        if (overflow.left) overflowText.push('←');
        if (overflow.right) overflowText.push('→');
        if (overflow.top) overflowText.push('↑');
        if (overflow.bottom) overflowText.push('↓');
      
        if (overflowText.length > 0) {
          ctx.fillText(
            `"${comp.text.substring(0, 10)}${comp.text.length > 10 ? '...' : ''}" ${overflowText.join('')}`,
            compLeft + 5,
            compTop - 5
          );
        }
      }
    
      ctx.restore();
    }
  }
 
  startRenderLoop() {
    const render = () => {
      // 1️⃣ Scroll inertia
      if (Math.abs(this.scrollVelocity) > 0.1 && !this.isDragging) {
        this.scrollOffset += this.scrollVelocity;
        this.scrollOffset = Math.max(Math.min(this.scrollOffset, 0), -this.getMaxScroll());
        this.scrollVelocity *= this.scrollFriction;
      } else {
        this.scrollVelocity = 0;
      }

      // 2️⃣ Clear canvas
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 3️⃣ Transition handling
      if (this.transitionState.isTransitioning) {
        this.updateTransition();
      } else if (this.optimizationEnabled && this.dirtyComponents.size > 0) {
        // Dirty components redraw
        for (let comp of this.dirtyComponents) {
          if (comp.visible) {
            const isFixed = this.isFixedComponent(comp);
            const y = isFixed ? comp.y : comp.y + this.scrollOffset;

            this.ctx.clearRect(comp.x - 2, y - 2, comp.width + 4, comp.height + 4);

            this.ctx.save();
            if (!isFixed) this.ctx.translate(0, this.scrollOffset);
            comp.draw(this.ctx);
            this.ctx.restore();

            // Overflow indicator style Flutter
            const overflow = comp.getOverflow?.();
            if (comp.markClean) comp.markClean();
          }
        }
        this.dirtyComponents.clear();
      } else {
        // Full redraw
        const scrollableComponents = [];
        const fixedComponents = [];

        for (let comp of this.components) {
          if (this.isFixedComponent(comp)) fixedComponents.push(comp);
          else scrollableComponents.push(comp);
        }

        // Scrollable
        this.ctx.save();
        this.ctx.translate(0, this.scrollOffset);
        for (let comp of scrollableComponents) {
          if (comp.visible) {
            comp.draw(this.ctx);
          }
        }
        this.ctx.restore();

        // Fixed
        for (let comp of fixedComponents) {
          if (comp.visible) {
            comp.draw(this.ctx);
          }
        }
      }

      // 4️⃣ FPS
      this._frames++;
      const now = performance.now();
      if (now - this._lastFpsTime >= 1000) {
        this.fps = this._frames;
        this._frames = 0;
        this._lastFpsTime = now;
      }

      if (this.showFps) {
        this.ctx.save();
        this.ctx.fillStyle = 'lime';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        this.ctx.restore();
      }
	  
	  if(this.debbug) {
		  this.drawOverflowIndicators();
	  }

      requestAnimationFrame(render);
    };

    render();
  }
	
  isFixedComponent(comp) {
  	return FIXED_COMPONENT_TYPES.has(comp.constructor);
  }
  
  showToast(message, duration = 3000) {
    const toast = new Toast(this, {
      text: message,
      duration: duration,
      x: this.width / 2,
      y: this.height - 100
    });
    this.add(toast);
    toast.show();
  }
}

export default CanvasFramework;


