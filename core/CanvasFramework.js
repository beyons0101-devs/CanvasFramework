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
import Banner from '../components/Banner.js';
import Chart from '../components/Chart.js';
import SliverAppBar from '../components/SliverAppBar.js';
import AudioPlayer from '../components/AudioPlayer.js';
import Camera from '../components/Camera.js';
import FloatedCamera from '../components/FloatedCamera.js';
import TimePicker from '../components/TimePicker.js';
import QRCodeReader from '../components/QRCodeReader.js';

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
import NotificationManager from '../utils/NotificationManager.js';

// DevTools
import DevTools from '../utils/DevTools.js';
import InspectionOverlay from '../utils/InspectionOverlay.js';
import DevToolsConsole from '../utils/DevToolsConsole.js';

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
import ui, {
    createRef
} from './UIBuilder.js';
import ThemeManager from './ThemeManager.js';


const FIXED_COMPONENT_TYPES = new Set([
    AppBar,
    BottomNavigationBar,
    Drawer,
    Dialog,
    Modal,
    Tabs,
    FAB,
    Toast,
    Camera,
    QRCodeReader,
    Banner,
    SliverAppBar,
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
        // ✅ AJOUTER: Démarrer le chronomètre
        const startTime = performance.now();
		
		this.metrics = {
			initTime: 0,
			firstRenderTime: null,
			firstInteractionTime: null,
			totalStartupTime: null
		};
		this._firstRenderDone = false;
		this._startupStartTime = startTime;

		// ✅ Créer automatiquement le canvas
		this.canvas = document.createElement('canvas');
		this.canvas.id = canvasId || `canvas-${Date.now()}`;
		this.canvas.style.display = 'block';
		this.canvas.style.touchAction = 'none';
		this.canvas.style.userSelect = 'none';
		document.body.appendChild(this.canvas);
        
		// NOUVELLE OPTION: choisir entre Canvas 2D et WebGL
        this.useWebGL = options.useWebGL ?? false;   // utilise la valeur si fournie, sinon false
    
		// Initialiser le contexte approprié
		if (this.useWebGL) {
		  try {
		    this.ctx = new WebGLCanvasAdapter(this.canvas, {
		      dpr: this.dpr,
		      alpha: false
		    });
		  } catch (err) {
		    console.warn("Échec de l’initialisation WebGLCanvasAdapter → fallback Canvas 2D", err);
		    this.ctx = this.canvas.getContext('2d', {
		      alpha: false,
		      desynchronized: true,
		      willReadFrequently: false
		    });
		    this.useWebGL = false;
		  }
		} else {
		  this.ctx = this.canvas.getContext('2d', {
		    alpha: false,
		    desynchronized: true,
		    willReadFrequently: false
		  });
		}
		//this.ctx.scale(this.dpr, this.dpr);
		
        this.backgroundColor = options.backgroundColor || '#f5f5f5'; // Blanc par défaut

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = window.devicePixelRatio || 1;

        // ✅ OPTIMISATION OPTION 2: Configuration des optimisations
        this.optimizations = {
            enabled: options.optimizations !== false, // Activé par défaut
            useDoubleBuffering: true,
            useCaching: true,
            useBatchDrawing: true,
            useSpatialPartitioning: false, // Désactivé par défaut (à activer si beaucoup de composants)
            useImageDataOptimization: true
        };

        // ✅ OPTIMISATION OPTION 2: Cache pour éviter les changements d'état inutiles
        this._stateCache = {
            fillStyle: null,
            strokeStyle: null,
            font: null,
            textAlign: null,
            textBaseline: null,
            lineWidth: null,
            globalAlpha: 1
        };

        // ✅ OPTIMISATION OPTION 2: Cache des images/textes
        this.imageCache = new Map();
        this.textCache = new Map();

        // ✅ OPTIMISATION OPTION 2: Double buffering
        this._doubleBuffer = null;
        this._bufferCtx = null;
        if (this.optimizations.useDoubleBuffering) {
            this._initDoubleBuffer();
        }

        // Scroll Worker
        this.scrollWorker = this.createScrollWorker();
        this.scrollWorker.onmessage = this.handleScrollWorkerMessage.bind(this);

        this.splashOptions = {
            enabled: options.splash?.enabled === true, // false par défaut
            duration: options.splash?.duration || 700,
            fadeOutDuration: options.splash?.fadeOutDuration || 500,
            backgroundColor: options.splash?.backgroundColor || ['#667eea', '#764ba2'], // Gradient ou couleur unie
            spinnerColor: options.splash?.spinnerColor || 'white',
            spinnerBackground: options.splash?.spinnerBackground || 'rgba(255, 255, 255, 0.3)',
            textColor: options.splash?.textColor || 'white',
            text: options.splash?.text || 'Chargement...',
            textSize: options.splash?.textSize || 20,
            textFont: options.splash?.textFont || 'Arial',
            progressBarColor: options.splash?.progressBarColor || 'white',
            progressBarBackground: options.splash?.progressBarBackground || 'rgba(255, 255, 255, 0.3)',
            showProgressBar: options.splash?.showProgressBar !== false, // true par défaut
            logo: options.splash?.logo || null, // URL d'une image (optionnel)
            logoWidth: options.splash?.logoWidth || 100,
            logoHeight: options.splash?.logoHeight || 100
        };

        // ✅ MODIFIER : Vérifier si le splash est activé
        if (this.splashOptions.enabled) {
            this.showSplashScreen();
        } else {
            this._splashFinished = true; // Passer directement au rendu
        }

        this.platform = this.detectPlatform();
        setTimeout(() => {
            this.initScrollWorker();
        }, 100);
        // État actuel + préférence
        this.themeMode = options.themeMode || 'system'; // 'light', 'dark', 'system'
        this.userThemeOverride = null; // null = suit system, sinon 'light' ou 'dark'

        // Applique le thème initial
        this.setupSystemThemeListener();

        // Récupère override utilisateur
        const savedOverride = localStorage.getItem('themeOverride');
        if (savedOverride && ['light', 'dark'].includes(savedOverride)) {
            this.userThemeOverride = savedOverride;
            this.themeMode = savedOverride;
        }

        this.components = [];
        // ✅ AJOUTER ICI :
        this._cachedMaxScroll = 0;
        this._maxScrollDirty = true;
        this.resizeTimeout = null;

        //this.applyThemeFromSystem();
        this.state = {};

        // Calcule FPS
        this.fps = 0;
        this._frames = 0;
        this._lastFpsTime = performance.now();
        this.showFps = options.showFps || false; // false par défaut
        this.debbug = options.debug || false; // false par défaut (et correction de la faute de frappe)

        // Worker pour multithreading Canvas Worker
        this.worker = this.createCanvasWorker();
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.postMessage({
            type: 'INIT',
            payload: {
                components: []
            }
        });

        // Logic Worker
        this.logicWorker = this.createLogicWorker();
        this.logicWorker.onmessage = this.handleLogicWorkerMessage.bind(this);
        this.logicWorkerState = {};
        this.logicWorker.postMessage({
            type: 'SET_STATE',
            payload: this.state
        });

        // Envoyer l'état initial au worker
        this.logicWorker.postMessage({
            type: 'SET_STATE',
            payload: this.state
        });

        // Gestion des événements
        this.isDragging = false;
        this.lastTouchY = 0;
        this.scrollOffset = 0;
        this.scrollVelocity = 0;
        this.scrollFriction = 0.95;

        // Optimisation
        this.dirtyComponents = new Set();
        this.optimizationEnabled = this.optimizations.enabled;

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

        // ✅ OPTIMISATION OPTION 5: Désactiver l'antialiasing pour meilleures performances
        this._disableImageSmoothing();

        this.setupEventListeners();
        this.setupHistoryListener();

        this.startRenderLoop();

        this.devTools = new DevTools(this);
        this.inspectionOverlay = new InspectionOverlay(this);

        // MODIFICATION: Vérifier explicitement l'option enableDevTools
        const shouldEnableDevTools = options.enableDevTools === true;

        if (shouldEnableDevTools) {
            this.enableDevTools();
            console.log('DevTools enabled. Press Ctrl+Shift+D to toggle.');
        }

        // Initialiser le ThemeManager
        this.themeManager = new ThemeManager(this, {
            lightTheme: options.lightTheme,
            darkTheme: options.darkTheme,
            storageKey: options.themeStorageKey || 'app-theme-mode'
        });

        // Raccourci pour accéder au thème actuel
        this.theme = this.themeManager.getTheme();

        // ✅ AJOUTER: Mesurer le temps d'init
        const initTime = performance.now() - startTime;

        // ✅ AJOUTER: Stocker les métriques
        this.metrics = {
            initTime: initTime,
            firstRenderTime: null,
            firstInteractionTime: null,
            totalStartupTime: null
        };

        // ✅ AJOUTER: Logger si debug
        if (options.debug || options.showMetrics) {
            console.log(`⚡ Framework initialisé en ${initTime.toFixed(2)}ms`);
        }

        // ✅ AJOUTER: Marquer le premier rendu
        this._firstRenderDone = false;
        this._startupStartTime = startTime;

        // ✅ OPTIMISATION OPTION 5: Partition spatiale pour le culling (optionnel)
        if (this.optimizations.useSpatialPartitioning) {
            this._initSpatialPartitioning();
        }
    }

	/**
	 * Crée un élément DOM temporaire, l'ajoute au body, exécute une callback, puis le supprime
	 * @param {string} tagName - 'input', 'select', 'textarea', etc.
	 * @param {Object} props - propriétés de base (type, value, accept, placeholder...)
	 * @param {Function} onResult - callback quand l'élément change ou blur (reçoit l'élément)
	 * @param {Object} [position=null] - {left, top, width, height} en pixels
	 * @param {Object} [attributes={}] - attributs supplémentaires (id, className, data-*, etc.)
	 * @returns {HTMLElement} L'élément créé (avant suppression)
	 */
	createTemporaryDomElement(tagName, props = {}, onResult, position = null, attributes = {}) {
	    const el = document.createElement(tagName);
	
	    // Appliquer les propriétés de base
	    Object.assign(el, props);
	
	    // Appliquer les attributs personnalisés (id, class, data-*, etc.)
	    Object.entries(attributes).forEach(([key, value]) => {
	        if (key === 'className') {
	            el.className = value; // className est spécial en JS
	        } else {
	            el.setAttribute(key, value);
	        }
	    });
	
	    // Styles de base pour le rendre invisible
	    el.style.position = 'absolute';
	    el.style.opacity = '0';
	    el.style.zIndex = '9999';
	
	    // Positionnement optionnel
	    if (position) {
	        Object.assign(el.style, {
	            left: `${position.left}px`,
	            top: `${position.top}px`,
	            width: `${position.width}px`,
	            height: `${position.height}px`
	        });
	    }
	
	    document.body.appendChild(el);
	
	    const cleanup = () => {
	        el.remove();
	        document.removeEventListener('focusout', cleanup);
	    };
	
	    // Événements
	    el.addEventListener('change', (e) => {
	        onResult(e.target);
	        cleanup();
	    });
	
	    el.addEventListener('blur', cleanup);
	
	    // Focus automatique pour les champs saisissables
	    if (['input', 'select', 'textarea'].includes(tagName.toLowerCase())) {
	        el.focus();
	    }
	
	    return el;
	}

    /**
     * Crée le Worker pour le calcul du scroll
     */
    createScrollWorker() {
        const workerCode = `
			let state = {
				scrollOffset: 0,
				scrollVelocity: 0,
				scrollFriction: 0.95,
				isDragging: false,
				maxScroll: 0,
				height: 0,
				lastTouchY: 0,
				components: []
			};

			const FIXED_COMPONENT_TYPES = [
				'AppBar', 'BottomNavigationBar', 'Drawer', 'Dialog', 'Modal', 
				'Tabs', 'FAB', 'Toast', 'Camera', 'QRCodeReader', 'Banner', 
				'SliverAppBar', 'BottomSheet', 'ContextMenu', 'OpenStreetMap', 'SelectDialog'
			];

			const calculateMaxScroll = () => {
				let maxY = 0;
				
				for (const comp of state.components) {
					if (FIXED_COMPONENT_TYPES.includes(comp.type) || !comp.visible) continue;
					const bottom = comp.y + comp.height;
					if (bottom > maxY) maxY = bottom;
				}
				
				return Math.max(0, maxY - state.height + 50);
			};

			const updateInertia = () => {
				if (Math.abs(state.scrollVelocity) > 0.1 && !state.isDragging) {
					state.scrollOffset += state.scrollVelocity;
					state.maxScroll = calculateMaxScroll();
					state.scrollOffset = Math.max(Math.min(state.scrollOffset, 0), -state.maxScroll);
					state.scrollVelocity *= state.scrollFriction;
				} else {
					state.scrollVelocity = 0;
				}
				
				return {
					scrollOffset: state.scrollOffset,
					scrollVelocity: state.scrollVelocity,
					maxScroll: state.maxScroll
				};
			};

			const handleTouchMove = (deltaY) => {
				if (state.isDragging) {
					state.scrollOffset += deltaY;
					state.maxScroll = calculateMaxScroll();
					state.scrollOffset = Math.max(Math.min(state.scrollOffset, 0), -state.maxScroll);
					state.scrollVelocity = deltaY;
					return {
						scrollOffset: state.scrollOffset,
						scrollVelocity: state.scrollVelocity,
						maxScroll: state.maxScroll
					};
				}
				return null;
			};

			self.onmessage = (e) => {
				const { type, payload } = e.data;

				switch (type) {
					case 'INIT':
						state = {
							...state,
							...payload
						};
						state.maxScroll = calculateMaxScroll();
						self.postMessage({ 
							type: 'INITIALIZED', 
							payload: { 
								scrollOffset: state.scrollOffset,
								maxScroll: state.maxScroll 
							}
						});
						break;

					case 'UPDATE_COMPONENTS':
						state.components = payload.components;
						state.maxScroll = calculateMaxScroll();
						self.postMessage({ 
							type: 'MAX_SCROLL_UPDATED', 
							payload: { maxScroll: state.maxScroll }
						});
						break;

					case 'UPDATE_DIMENSIONS':
						state.height = payload.height;
						state.maxScroll = calculateMaxScroll();
						self.postMessage({ 
							type: 'MAX_SCROLL_UPDATED', 
							payload: { maxScroll: state.maxScroll }
						});
						break;

					case 'SET_DRAGGING':
						state.isDragging = payload.isDragging;
						if (!payload.isDragging) {
							state.scrollVelocity = payload.lastVelocity || 0;
						} else {
							state.lastTouchY = payload.lastTouchY || 0;
						}
						break;

					case 'HANDLE_TOUCH_MOVE':
						const result = handleTouchMove(payload.deltaY);
						if (result) {
							self.postMessage({ 
								type: 'SCROLL_UPDATED', 
								payload: result 
							});
						}
						break;

					case 'UPDATE_INERTIA':
						const inertiaResult = updateInertia();
						self.postMessage({ 
							type: 'SCROLL_UPDATED', 
							payload: inertiaResult 
						});
						break;

					case 'SET_SCROLL_OFFSET':
						state.scrollOffset = payload.scrollOffset;
						state.maxScroll = calculateMaxScroll();
						state.scrollOffset = Math.max(Math.min(state.scrollOffset, 0), -state.maxScroll);
						self.postMessage({ 
							type: 'SCROLL_UPDATED', 
							payload: { 
								scrollOffset: state.scrollOffset,
								maxScroll: state.maxScroll 
							}
						});
						break;

					case 'GET_STATE':
						self.postMessage({ 
							type: 'STATE', 
							payload: { 
								scrollOffset: state.scrollOffset,
								scrollVelocity: state.scrollVelocity,
								maxScroll: state.maxScroll,
								isDragging: state.isDragging
							}
						});
						break;
				}
			};
		`;

        const blob = new Blob([workerCode], {
            type: 'application/javascript'
        });
        return new Worker(URL.createObjectURL(blob));
    }

    /**
     * Gère les messages du Scroll Worker
     */
    handleScrollWorkerMessage(e) {
        const {
            type,
            payload
        } = e.data;

        switch (type) {
            case 'SCROLL_UPDATED':
                this.scrollOffset = payload.scrollOffset;
                this.scrollVelocity = payload.scrollVelocity;
                // ✅ CORRECTION IMPORTANTE : Vider le cache dirty pendant le scroll
                if (Math.abs(payload.scrollVelocity) > 0.5) {
                    this.dirtyComponents.clear();
                }
                // Mettre à jour le cache
                this._cachedMaxScroll = payload.maxScroll;
                this._maxScrollDirty = false;

                // Marquer les composants comme sales pour mise à jour visuelle
                if (Math.abs(payload.scrollVelocity) > 0) {
                    this.components.forEach(comp => {
                        if (!this.isFixedComponent(comp)) {
                            this.markComponentDirty(comp);
                        }
                    });
                }
                break;

            case 'MAX_SCROLL_UPDATED':
                this._cachedMaxScroll = payload.maxScroll;
                this._maxScrollDirty = false;
                break;

            case 'INITIALIZED':
                this.scrollOffset = payload.scrollOffset;
                this._cachedMaxScroll = payload.maxScroll;
                this._maxScrollDirty = false;
                break;

            case 'STATE':
                // Synchroniser l'état local
                this.scrollOffset = payload.scrollOffset;
                this.scrollVelocity = payload.scrollVelocity;
                this.isDragging = payload.isDragging;
                this._cachedMaxScroll = payload.maxScroll;
                this._maxScrollDirty = false;
                break;
        }
    }

    /**
     * Initialise le Scroll Worker avec les données actuelles
     */
    initScrollWorker() {
        const componentsData = this.components.map(comp => ({
            type: comp.constructor.name,
            y: comp.y,
            height: comp.height,
            visible: comp.visible
        }));

        this.scrollWorker.postMessage({
            type: 'INIT',
            payload: {
                scrollOffset: this.scrollOffset,
                scrollVelocity: this.scrollVelocity,
                scrollFriction: this.scrollFriction,
                isDragging: this.isDragging,
                height: this.height,
                components: componentsData
            }
        });
    }

    /**
     * Met à jour les composants dans le Worker
     */
    updateScrollWorkerComponents() {
        const componentsData = this.components.map(comp => ({
            type: comp.constructor.name,
            y: comp.y,
            height: comp.height,
            visible: comp.visible
        }));

        this.scrollWorker.postMessage({
            type: 'UPDATE_COMPONENTS',
            payload: {
                components: componentsData
            }
        });
    }

    /**
     * Initialise le double buffering pour éviter le flickering
     * @private
     */
    // Dans _initDoubleBuffer(), assurez-vous de bien configurer le contexte
    _initDoubleBuffer() {
        this._doubleBuffer = document.createElement('canvas');
        this._bufferCtx = this._doubleBuffer.getContext('2d', {
            alpha: false,
            desynchronized: true
        });
        this._doubleBuffer.width = this.width * this.dpr;
        this._doubleBuffer.height = this.height * this.dpr;
        this._doubleBuffer.style.width = this.width + 'px';
        this._doubleBuffer.style.height = this.height + 'px';
        this._bufferCtx.scale(this.dpr, this.dpr);
        this._disableImageSmoothing(this._bufferCtx);

        // ✅ INITIALISER le background du buffer
        this._bufferCtx.fillStyle = this.backgroundColor || '#ffffff';
        this._bufferCtx.fillRect(0, 0, this.width, this.height);
    }


    /**
     * Désactive l'antialiasing pour meilleures performances
     * @private
     * @param {CanvasRenderingContext2D} [ctx=this.ctx] - Contexte à configurer
     */
    _disableImageSmoothing(ctx = this.ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
    }

    /**
     * Initialise le spatial partitioning pour le viewport culling
     * @private
     */
    _initSpatialPartitioning() {
        // Simple grid spatial partitioning
        this._spatialGrid = {
            cellSize: 100,
            grid: new Map(),
            update: (components) => {
                this._spatialGrid.grid.clear();
                components.forEach(comp => {
                    if (!comp.visible) return;

                    const gridX = Math.floor(comp.x / this._spatialGrid.cellSize);
                    const gridY = Math.floor(comp.y / this._spatialGrid.cellSize);
                    const key = `${gridX},${gridY}`;

                    if (!this._spatialGrid.grid.has(key)) {
                        this._spatialGrid.grid.set(key, []);
                    }
                    this._spatialGrid.grid.get(key).push(comp);
                });
            },
            getVisible: (viewportY) => {
                const visible = [];
                const startY = viewportY - 200; // Marge de 200px
                const endY = viewportY + this.height + 200;

                this._spatialGrid.grid.forEach((comps, key) => {
                    comps.forEach(comp => {
                        const compBottom = comp.y + comp.height;
                        if (compBottom >= startY && comp.y <= endY) {
                            visible.push(comp);
                        }
                    });
                });
                return visible;
            }
        };
    }

    /**
     * ✅ OPTIMISATION OPTION 2: Rendu optimisé de rectangles
     * Évite les changements d'état inutiles
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} w - Largeur
     * @param {number} h - Hauteur
     * @param {string} color - Couleur de remplissage
     */
    fillRectOptimized(x, y, w, h, color) {
        // Éviter les changements d'état inutiles
        if (this._stateCache.fillStyle !== color) {
            this.ctx.fillStyle = color;
            this._stateCache.fillStyle = color;
        }
        this.ctx.fillRect(x, y, w, h);
    }

    /**
     * ✅ OPTIMISATION OPTION 2: Texte avec cache
     * Cache le rendu du texte pour éviter de le redessiner à chaque frame
     * @param {string} text - Texte à afficher
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {string} font - Police CSS
     * @param {string} color - Couleur du texte
     */
    fillTextCached(text, x, y, font, color) {
        const key = `${text}_${font}_${color}`;

        if (!this.textCache.has(key)) {
            // Rendu dans un canvas temporaire
            const temp = document.createElement('canvas');
            const tempCtx = temp.getContext('2d', {
                alpha: false
            });
            tempCtx.font = font;

            const metrics = tempCtx.measureText(text);
            temp.width = Math.ceil(metrics.width);
            temp.height = Math.ceil(parseInt(font) * 1.2);

            tempCtx.font = font;
            tempCtx.fillStyle = color;
            tempCtx.textBaseline = 'top';
            tempCtx.fillText(text, 0, 0);

            this.textCache.set(key, {
                canvas: temp,
                width: temp.width,
                height: temp.height,
                baseline: parseInt(font)
            });
        }

        const cached = this.textCache.get(key);
        this.ctx.drawImage(cached.canvas, x, y - cached.baseline);
    }

    /**
     * ✅ OPTIMISATION OPTION 5: Rendu batché pour plusieurs rectangles
     * Regroupe les rectangles par couleur pour réduire les appels draw
     * @param {Array} rects - Tableau d'objets {x, y, width, height, color}
     */
    batchRect(rects) {
        if (!rects || rects.length === 0) return;

        // Regrouper par couleur
        const batches = new Map();

        rects.forEach(rect => {
            if (!batches.has(rect.color)) {
                batches.set(rect.color, []);
            }
            batches.get(rect.color).push(rect);
        });

        // Dessiner par batch
        batches.forEach((batchRects, color) => {
            this.ctx.fillStyle = color;

            // Utiliser un seul path pour tous les rectangles de même couleur
            this.ctx.beginPath();
            batchRects.forEach(rect => {
                this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
            });
            this.ctx.fill();
        });
    }

    /**
     * ✅ OPTIMISATION OPTION 5: Utiliser ImageData pour les mises à jour fréquentes
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     * @param {Function} drawFn - Fonction pour manipuler les pixels
     */
    updateRegion(x, y, width, height, drawFn) {
        const imageData = this.ctx.getImageData(x, y, width, height);
        const data = imageData.data;

        // Manipuler directement les pixels
        drawFn(data, width, height);

        this.ctx.putImageData(imageData, x, y);
    }

    /**
     * ✅ OPTIMISATION OPTION 2: Flush du buffer pour le double buffering
     */
    flush() {
        if (this.optimizations.useDoubleBuffering && this._bufferCtx) {
            // Copier tout le buffer sur le canvas réel
            this.ctx.drawImage(this._doubleBuffer, 0, 0, this.width, this.height);

            // Réinitialiser le buffer pour le prochain frame
            this._bufferCtx.fillStyle = this.backgroundColor || '#ffffff';
            this._bufferCtx.fillRect(0, 0, this.width, this.height);
        }
    }

    /**
     * ✅ OPTIMISATION OPTION 5: Rendu optimisé avec viewport culling
     * @private
     */
    _renderOptimized() {
        const ctx = this.optimizations.useDoubleBuffering ? this._bufferCtx : this.ctx;

        if (!ctx) return;

        // Clear le canvas
        ctx.clearRect(0, 0, this.width, this.height);

        // Séparer les composants fixes et scrollables
        const scrollableComponents = [];
        const fixedComponents = [];

        for (let comp of this.components) {
            if (this.isFixedComponent(comp)) {
                fixedComponents.push(comp);
            } else {
                scrollableComponents.push(comp);
            }
        }

        // Rendu des composants scrollables avec viewport culling optimisé
        ctx.save();
        ctx.translate(0, this.scrollOffset);

        // ✅ OPTIMISATION: Utiliser le spatial partitioning si activé
        if (this.optimizations.useSpatialPartitioning && this._spatialGrid) {
            const visibleComps = this._spatialGrid.getVisible(-this.scrollOffset);
            for (let comp of visibleComps) {
                if (comp.visible) {
                    comp.draw(ctx);
                }
            }
        } else {
            // Rendu standard avec culling simple
            for (let comp of scrollableComponents) {
                if (comp.visible) {
                    const screenY = comp.y + this.scrollOffset;
                    const isInViewport = screenY + comp.height >= -100 && screenY <= this.height + 100;

                    if (isInViewport) {
                        comp.draw(ctx);
                    }
                }
            }
        }

        ctx.restore();

        // Rendu des composants fixes
        for (let comp of fixedComponents) {
            if (comp.visible) {
                comp.draw(ctx);
            }
        }

        // Flush si on utilise le double buffering
        if (this.optimizations.useDoubleBuffering) {
            this.flush();
        }
    }

    /**
     * ✅ OPTIMISATION OPTION 2: Rendu partiel (seulement les composants sales)
     * @private
     */
	_renderDirtyComponents() {
		const ctx = this.optimizations.useDoubleBuffering ? this._bufferCtx : this.ctx;
		
		if (!ctx || this.dirtyComponents.size === 0) return;
		
		// ✅ CORRECTION : Ne pas nettoyer avec fillRect !
		// À la place, utiliser le clipping pour redessiner proprement
		
		// Copier dans un tableau
		const dirtyArray = Array.from(this.dirtyComponents);
		
		// Vider immédiatement
		this.dirtyComponents.clear();
		
		// Séparer les composants
		const fixedComps = [];
		const scrollableComps = [];
		
		dirtyArray.forEach(comp => {
			if (!comp.visible) return;
			
			if (this.isFixedComponent(comp)) {
				fixedComps.push(comp);
			} else {
				scrollableComps.push(comp);
			}
		});
		
		// ✅ APPROCHE CORRECTE : Redessiner les composants sales
		// sans effacer leur zone d'abord
		
		// 1. Dessiner les scrollables
		if (scrollableComps.length > 0) {
			ctx.save();
			ctx.translate(0, this.scrollOffset);
			
			for (let comp of scrollableComps) {
				// ✅ NE PAS faire de fillRect !
				// Juste dessiner le composant
				if (comp.draw) {
					comp.draw(ctx);
				}
				
				if (comp.markClean) {
					comp.markClean();
				}
			}
			
			ctx.restore();
		}
		
		// 2. Dessiner les fixes
		for (let comp of fixedComps) {
			if (comp.draw) {
				comp.draw(ctx);
			}
			
			if (comp.markClean) {
				comp.markClean();
			}
		}
		
		// Flush si double buffering
		if (this.optimizations.useDoubleBuffering) {
			this.flush();
		}
	}

    /**
     * Active/désactive une optimisation spécifique
     * @param {string} optimization - Nom de l'optimisation
     * @param {boolean} enabled - true pour activer, false pour désactiver
     */
    setOptimization(optimization, enabled) {
        if (this.optimizations.hasOwnProperty(optimization)) {
            this.optimizations[optimization] = enabled;

            switch (optimization) {
                case 'useDoubleBuffering':
                    if (enabled && !this._bufferCtx) {
                        this._initDoubleBuffer();
                    }
                    break;
                case 'useSpatialPartitioning':
                    if (enabled && !this._spatialGrid) {
                        this._initSpatialPartitioning();
                    }
                    break;
            }

            // Marquer tous les composants comme sales pour forcer un redessin complet
            this.components.forEach(comp => this.markComponentDirty(comp));
        }
    }

    /**
     * Obtient l'état des optimisations
     * @returns {Object} État des optimisations
     */
    getOptimizations() {
        return {
            ...this.optimizations
        };
    }

    /**
     * Affiche un écran de chargement animé
     * @private
     */
    showSplashScreen() {
        const startTime = performance.now();
        const opts = this.splashOptions;

        // ✅ Charger le logo si présent
        let logoImage = null;
        if (opts.logo) {
            logoImage = new Image();
            logoImage.src = opts.logo;
        }

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / opts.duration, 1);

            // Clear
            this.ctx.clearRect(0, 0, this.width, this.height);

            // ✅ Background (gradient ou couleur unie)
            if (Array.isArray(opts.backgroundColor) && opts.backgroundColor.length >= 2) {
                // Gradient
                const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
                gradient.addColorStop(0, opts.backgroundColor[0]);
                gradient.addColorStop(1, opts.backgroundColor[1]);
                this.ctx.fillStyle = gradient;
            } else {
                // Couleur unie
                this.ctx.fillStyle = opts.backgroundColor;
            }
            this.ctx.fillRect(0, 0, this.width, this.height);

            const centerX = this.width / 2;
            const centerY = this.height / 2;

            // ✅ Logo (si présent et chargé)
            if (logoImage && logoImage.complete) {
                const logoX = centerX - opts.logoWidth / 2;
                const logoY = centerY - opts.logoHeight - 80;
                this.ctx.drawImage(logoImage, logoX, logoY, opts.logoWidth, opts.logoHeight);
            }

            // ✅ Spinner animé
            const radius = 40;
            const rotation = (elapsed / 1000) * Math.PI * 2;

            // Cercle de fond
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = opts.spinnerBackground;
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            // Arc animé
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, rotation, rotation + Math.PI * 1.5);
            this.ctx.strokeStyle = opts.spinnerColor;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // ✅ Texte personnalisé
            this.ctx.fillStyle = opts.textColor;
            this.ctx.font = `${opts.textSize}px ${opts.textFont}`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(opts.text, centerX, centerY + radius + 40);

            // ✅ Barre de progression (optionnelle)
            if (opts.showProgressBar) {
                const barWidth = 200;
                const barHeight = 4;
                const barX = centerX - barWidth / 2;
                const barY = centerY + radius + 70;

                // Fond de la barre
                this.ctx.fillStyle = opts.progressBarBackground;
                this.ctx.fillRect(barX, barY, barWidth, barHeight);

                // Progression
                this.ctx.fillStyle = opts.progressBarColor;
                this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            }

            // Continuer ou fade out
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.fadeOutSplash();
            }
        };

        animate();
    }

    /**
     * Fade out du splash screen
     * @private
     */
    fadeOutSplash() {
        const opts = this.splashOptions;
        const duration = opts.fadeOutDuration;
        const startTime = performance.now();

        const fade = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            const alpha = 1 - Math.min(progress, 1);

            if (alpha > 0) {
                this.ctx.clearRect(0, 0, this.width, this.height);
                this.ctx.globalAlpha = alpha;

                // Redessiner le background
                if (Array.isArray(opts.backgroundColor) && opts.backgroundColor.length >= 2) {
                    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
                    gradient.addColorStop(0, opts.backgroundColor[0]);
                    gradient.addColorStop(1, opts.backgroundColor[1]);
                    this.ctx.fillStyle = gradient;
                } else {
                    this.ctx.fillStyle = opts.backgroundColor;
                }
                this.ctx.fillRect(0, 0, this.width, this.height);

                // Spinner pendant le fade
                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const radius = 40;

                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = opts.spinnerBackground;
                this.ctx.lineWidth = 4;
                this.ctx.stroke();

                this.ctx.globalAlpha = 1;
                requestAnimationFrame(fade);
            } else {
                this._splashFinished = true;
                // ✅ AJOUTER : Réinitialiser complètement le contexte
                this.ctx.clearRect(0, 0, this.width, this.height);
                this.ctx.globalAlpha = 1;
                this.ctx.textAlign = 'start'; // ← IMPORTANT
                this.ctx.textBaseline = 'alphabetic'; // ← IMPORTANT
                this.ctx.font = '10px sans-serif'; // Valeur par défaut
                this.ctx.fillStyle = '#000000';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.lineCap = 'butt';
                this.ctx.lineJoin = 'miter';
            }
        };

        fade();
    }

    // ✅ AJOUTER: Méthode pour mesurer le premier rendu
    _markFirstRender() {
        if (!this._firstRenderDone) {
            this._firstRenderDone = true;
            const firstRenderTime = performance.now() - this._startupStartTime - this.metrics.initTime;
            this.metrics.firstRenderTime = firstRenderTime;
            this.metrics.totalStartupTime = performance.now() - this._startupStartTime;

            if (this.showMetrics) {
                console.log(`🎨 Premier rendu en ${firstRenderTime.toFixed(2)}ms`);
                console.log(`🚀 Temps total de démarrage: ${this.metrics.totalStartupTime.toFixed(2)}ms`);
                this.displayMetrics();
            }
        }
    }

    /**
     * Écoute les changements système (ex: utilisateur bascule dark mode)
     */
    setupSystemThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Ancienne méthode (compatibilité large)
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', (e) => {
                if (this.themeMode === 'system') {
                    this.applyThemeFromSystem();
                }
            });
        } else {
            // Anciens navigateurs (rare en 2026)
            mediaQuery.addListener((e) => {
                if (this.themeMode === 'system') {
                    this.applyThemeFromSystem();
                }
            });
        }
    }

    /**
     * Change le mode thème
     * @param {'light'|'dark'|'system'} mode - Mode à appliquer
     * @param {boolean} [save=true] - Sauvegarder le choix utilisateur ?
     */
    setThemeMode(mode) {
        this.themeManager.setMode(mode);
        this.theme = this.themeManager.getTheme();
    }

    /**
     * Obtient une couleur du thème
     */
    getColor(colorName) {
        return this.themeManager.getColor(colorName);
    }

    /**
     * Ajoute un listener de changement de thème
     */
    onThemeChange(callback) {
        this.themeManager.addListener((theme) => {
            this.theme = theme;
            callback(theme);
        });
    }

    /**
     * Bascule entre light et dark
     */
    toggleTheme() {
        this.themeManager.toggle();
        this.theme = this.themeManager.getTheme();
    }

    /**
     * Active ou désactive les DevTools
     * @param {boolean} enabled - true pour activer, false pour désactiver
     */
    enableDevTools(enabled = true) {
        if (enabled) {
            // Créer le DevTools s'il n'existe pas
            if (!this.devTools) {
                this.devTools = new DevTools(this);
            }

            // Attacher seulement si pas déjà fait
            if (!this.devTools._isAttached) {
                this.devTools.attachToFramework();
                this.devTools._isAttached = true;
            }

            // Afficher le bouton
            if (this.devTools.toggleBtn) {
                this.devTools.toggleBtn.style.display = 'block';
            }
        } else {
            // Désactiver complètement
            if (this.devTools) {
                // Détacher du framework
                if (this.devTools.detachFromFramework) {
                    this.devTools.detachFromFramework();
                } else if (this.devTools.cleanup) {
                    this.devTools.cleanup();
                }

                // Supprimer de la page DOM
                if (this.devTools.container && this.devTools.container.parentNode) {
                    this.devTools.container.parentNode.removeChild(this.devTools.container);
                }

                if (this.devTools.toggleBtn && this.devTools.toggleBtn.parentNode) {
                    this.devTools.toggleBtn.parentNode.removeChild(this.devTools.toggleBtn);
                }

                this.devTools._isAttached = false;
            }
        }
    }

    /**
     * Bascule l'overlay d'inspection
     */
    toggleInspection() {
        this.inspectionOverlay.toggle();
    }

    /**
     * Exécute une commande DevTools
     */
    devToolsCommand(command, ...args) {
        switch (command) {
            case 'inspect':
                this.inspectionOverlay.enable();
                break;
            case 'performance':
                this.devTools.switchTab('performance');
                this.devTools.toggle();
                break;
            case 'components':
                this.devTools.switchTab('components');
                this.devTools.toggle();
                break;
            case 'highlight':
                if (args[0]) {
                    this.devTools.highlightComponent(args[0]);
                }
                break;
            case 'reflow':
                this.components.forEach(comp => comp.markDirty());
                break;
        }
    }

    wrapContext(ctx, theme) {
        const originalFillStyle = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
        Object.defineProperty(ctx, 'fillStyle', {
            set: (value) => {
                // Si value est blanc/noir ou une couleur “neutre”, tu remplaces par theme
                if (value === '#FFFFFF' || value === '#000000') {
                    originalFillStyle.set.call(ctx, value);
                } else {
                    originalFillStyle.set.call(ctx, value);
                }
            },
            get: () => originalFillStyle.get.call(ctx)
        });
    }

    createCanvasWorker() {
        const workerCode = `
      let components = [];
      
      self.onmessage = function(e) {
        const { type, payload } = e.data;
        
        switch(type) {
          case 'INIT':
            components = payload.components;
            self.postMessage({ type: 'READY' });
            break;
            
          case 'UPDATE_LAYOUT':
            const updated = components.map(comp => {
              if (comp.dynamicHeight && comp.calculateHeight) {
                comp.height = comp.calculateHeight();
              }
              return { id: comp.id, height: comp.height };
            });
            self.postMessage({ type: 'LAYOUT_DONE', payload: updated });
            break;
            
          case 'SCROLL_INERTIA':
            let { offset, velocity, friction, maxScroll } = payload;
            offset += velocity;
            offset = Math.max(Math.min(offset, 0), -maxScroll);
            velocity *= friction;
            self.postMessage({ type: 'SCROLL_UPDATED', payload: { offset, velocity } });
            break;
        }
      };
    `;

        const blob = new Blob([workerCode], {
            type: 'application/javascript'
        });
        return new Worker(URL.createObjectURL(blob));
    }

    createLogicWorker() {
        const workerCode = `
      let state = {};
    
      self.onmessage = async function(e) {
        const { type, payload } = e.data;
      
        switch(type) {
          case 'SET_STATE':
            state = payload;
            self.postMessage({ type: 'STATE_UPDATED', payload: state });
            break;
          
          case 'EXECUTE':
            try {
              const fn = new Function('state', 'args', payload.fnString);
              const result = await fn(state, payload.args);
              self.postMessage({ type: 'EXECUTION_RESULT', payload: result });
            } catch (err) {
              self.postMessage({ type: 'EXECUTION_ERROR', payload: err.message });
            }
            break;
        }
      };
    `;

        const blob = new Blob([workerCode], {
            type: 'application/javascript'
        });
        return new Worker(URL.createObjectURL(blob));
    }

    // Set Theme dynamique
    setTheme(theme) {
        this.theme = theme;

        if (!this.useWebGL) {
            this.wrapContext(this.ctx, theme);
        }

        // Protège la boucle
        if (this.components && Array.isArray(this.components)) {
            this.components.forEach(comp => comp.markDirty());
        } else {
            console.warn('[setTheme] components pas encore initialisé');
        }
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
        const {
            type,
            payload
        } = e.data;
        switch (type) {
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
        this.worker.postMessage({
            type: 'UPDATE_LAYOUT'
        });
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
        const {
            type,
            payload
        } = e.data;
        switch (type) {
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
            payload: {
                taskName,
                taskData
            }
        });
    }

    updateLogicWorkerState(newState) {
        this.logicWorkerState = {
            ...this.logicWorkerState,
            ...newState
        };
        this.logicWorker.postMessage({
            type: 'SET_STATE',
            payload: this.logicWorkerState
        });
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

        // ✅ AJOUTER: Appliquer le background au style CSS
        this.canvas.style.backgroundColor = this.backgroundColor;
        // Échelle uniquement pour Canvas 2D
        this.ctx.scale(this.dpr, this.dpr);
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
            afterLeave: options.afterLeave, // ✅ NOUVEAU
            onEnter: options.onEnter, // ✅ NOUVEAU (alias de afterEnter)
            onLeave: options.onLeave, // ✅ NOUVEAU (alias de beforeLeave)
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

                return {
                    route,
                    params,
                    query,
                    pathname
                };
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

        const {
            route,
            params,
            query,
            pathname
        } = match;

        // ===== LIFECYCLE: AVANT DE QUITTER L'ANCIENNE ROUTE =====

        // Hook beforeLeave de la route actuelle (peut bloquer la navigation)
        const currentRouteData = this.routes.get(this.currentRoute);
        if (currentRouteData?.beforeLeave) {
            const canLeave = await currentRouteData.beforeLeave(this.currentParams, this.currentQuery, this);
            if (canLeave === false) {
                console.log('Navigation cancelled by beforeLeave hook');
                return;
            }
        }

        // ✅ NOUVEAU : Hook onLeave (alias plus intuitif de beforeLeave, mais ne bloque pas)
        if (currentRouteData?.onLeave) {
            await currentRouteData.onLeave(this.currentParams, this.currentQuery, this);
        }

        // ===== LIFECYCLE: AVANT D'ENTRER DANS LA NOUVELLE ROUTE =====

        // Hook beforeEnter de la nouvelle route (peut bloquer la navigation)
        if (route.beforeEnter) {
            const canEnter = await route.beforeEnter(params, query, this);
            if (canEnter === false) {
                console.log('Navigation cancelled by beforeEnter hook');
                return;
            }
        }

        // ✅ NOUVEAU : Hook onEnter (appelé juste avant de créer les composants)
        if (route.onEnter) {
            await route.onEnter(params, query, this);
        }

        // ===== SAUVEGARDER L'ÉTAT ACTUEL =====

        // Sauvegarder l'ancienne route pour l'animation et les hooks
        const oldComponents = [...this.components];
        const oldRoute = this.currentRoute;
        const oldParams = {
            ...this.currentParams
        };
        const oldQuery = {
            ...this.currentQuery
        };

        // ===== METTRE À JOUR L'ÉTAT =====

        this.currentRoute = pathname;
        this.currentParams = params;
        this.currentQuery = query;

        // ===== GÉRER L'HISTORIQUE =====

        if (!replace) {
            this.historyIndex++;
            this.history = this.history.slice(0, this.historyIndex);
            this.history.push({
                path,
                params,
                query,
                state
            });

            // Mettre à jour l'historique du navigateur
            window.history.pushState({
                    route: path,
                    params,
                    query,
                    state
                },
                '',
                path
            );
        } else {
            this.history[this.historyIndex] = {
                path,
                params,
                query,
                state
            };
            window.history.replaceState({
                    route: path,
                    params,
                    query,
                    state
                },
                '',
                path
            );
        }

        // ===== CRÉER LES NOUVEAUX COMPOSANTS =====

        this.components = [];
        if (typeof route.component === 'function') {
            route.component(this, params, query);
        }

        // ===== LANCER L'ANIMATION DE TRANSITION =====

        if (animate && !this.transitionState.isTransitioning) {
            const transitionType = transition || route.transition || 'slide';
            this.startTransition(oldComponents, this.components, transitionType, direction);
        }

        // ===== LIFECYCLE: APRÈS ÊTRE ENTRÉ DANS LA NOUVELLE ROUTE =====

        // Hook afterEnter (appelé immédiatement après la création des composants)
        if (route.afterEnter) {
            route.afterEnter(params, query, this);
        }

        // ✅ NOUVEAU : Hook afterLeave de l'ancienne route (après transition complète)
        if (currentRouteData?.afterLeave) {
            // Si animation, attendre la fin de la transition
            if (animate && this.transitionState.isTransitioning) {
                setTimeout(() => {
                    currentRouteData.afterLeave(oldParams, oldQuery, this);
                }, this.transitionState.duration || 300);
            } else {
                // Pas d'animation, appeler immédiatement
                currentRouteData.afterLeave(oldParams, oldQuery, this);
            }
        }

        // ✅ OPTIONNEL : Marquer les composants comme "dirty" pour forcer le rendu
        this._maxScrollDirty = true;
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
        const {
            type,
            direction,
            oldComponents,
            newComponents
        } = this.transitionState;
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
        return {
            ...this.currentParams
        };
    }

    /**
     * Obtient la query string de la route actuelle
     * @returns {Object}
     */
    getQuery() {
        return {
            ...this.currentQuery
        };
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

        // Informer le Worker
        this.scrollWorker.postMessage({
            type: 'SET_DRAGGING',
            payload: {
                isDragging: false,
                lastTouchY: this.lastTouchY
            }
        });

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
                this.scrollWorker.postMessage({
                    type: 'SET_DRAGGING',
                    payload: {
                        isDragging: true,
                        lastTouchY: this.lastTouchY
                    }
                });
            }
        }

        if (this.isDragging) {
            const deltaY = pos.y - this.lastTouchY;

            // Déléguer le calcul au Worker
            this.scrollWorker.postMessage({
                type: 'HANDLE_TOUCH_MOVE',
                payload: {
                    deltaY
                }
            });

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
            this.scrollWorker.postMessage({
                type: 'SET_DRAGGING',
                payload: {
                    isDragging: false,
                    lastVelocity: this.scrollVelocity
                }
            });
        }
    }

    handleMouseDown(e) {
        this.isDragging = false;
        this.lastTouchY = e.clientY;

        this.scrollWorker.postMessage({
            type: 'SET_DRAGGING',
            payload: {
                isDragging: false,
                lastTouchY: this.lastTouchY
            }
        });

        this.checkComponentsAtPosition(e.clientX, e.clientY, 'start');
    }

    handleMouseMove(e) {
        if (!this.isDragging) {
            const deltaY = Math.abs(e.clientY - this.lastTouchY);
            if (deltaY > 5) {
                this.isDragging = true;
                this.scrollWorker.postMessage({
                    type: 'SET_DRAGGING',
                    payload: {
                        isDragging: true,
                        lastTouchY: this.lastTouchY
                    }
                });
            }
        }

        if (this.isDragging) {
            const deltaY = e.clientY - this.lastTouchY;

            this.scrollWorker.postMessage({
                type: 'HANDLE_TOUCH_MOVE',
                payload: {
                    deltaY
                }
            });

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
            this.scrollWorker.postMessage({
                type: 'SET_DRAGGING',
                payload: {
                    isDragging: false,
                    lastVelocity: this.scrollVelocity
                }
            });
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
                                            other !== comp &&
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
        // Utiliser le cache du Worker
        if (!this._maxScrollDirty && this._cachedMaxScroll !== undefined) {
            return this._cachedMaxScroll;
        }

        // Fallback si le Worker n'est pas encore initialisé
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
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

        this.resizeTimeout = setTimeout(() => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.setupCanvas();

            // Mettre à jour les dimensions dans le Worker
            this.scrollWorker.postMessage({
                type: 'UPDATE_DIMENSIONS',
                payload: {
                    height: this.height
                }
            });

            for (const comp of this.components) {
                if (comp._resize) {
                    comp._resize(this.width, this.height);
                }
            }
            this.updateScrollWorkerComponents();
        }, 150);
    }

    /*handleResize() {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout); // ✅ AJOUTER

        this.resizeTimeout = setTimeout(() => { // ✅ AJOUTER
            if (!this.useWebGL) {
                this.width = window.innerWidth;
                this.height = window.innerHeight;
                this.setupCanvas();

                for (const comp of this.components) {
                    if (comp._resize) {
                        comp._resize(this.width, this.height);
                    }
                }
                this._maxScrollDirty = true; // ✅ AJOUTER
            }
        }, 150); // ✅ AJOUTER (throttle 150ms)
    }*/

    add(component) {
        this.components.push(component);
        component._mount();
        this.updateScrollWorkerComponents();
        return component;
    }

    remove(component) {
        const index = this.components.indexOf(component);
        if (index > -1) {
            component._unmount();
            this.components.splice(index, 1);
            this.updateScrollWorkerComponents();
        }
    }

    // 4. Modifiez markComponentDirty() pour éviter de marquer pendant le scroll
    markComponentDirty(component) {
		// Vérifications basiques
		if (!component || !component.visible) return;
		
		// ✅ TOUJOURS ajouter au set des composants sales
		// Les conditions de rendu seront vérifiées dans _renderDirtyComponents
		if (this.optimizationEnabled) {
			this.dirtyComponents.add(component);
		}
		
		// ✅ Optionnel : Marquer aussi le composant lui-même
		if (component._dirty !== undefined) {
			component._dirty = true;
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
		let lastScrollOffset = this.scrollOffset;
		let lastRenderMode = 'full';
		
		const render = () => {
			if (!this._splashFinished) {
				requestAnimationFrame(render);
				return;
			}
			
			// Vérifier le scroll
			const scrollChanged = Math.abs(this.scrollOffset - lastScrollOffset) > 0.1;
			lastScrollOffset = this.scrollOffset;
			
			// Décider du mode de rendu
			let renderMode = 'full';
			
			if (this.optimizationEnabled && 
				this.dirtyComponents.size > 0 &&
				!this.isDragging &&
				Math.abs(this.scrollVelocity) < 0.5 &&
				!scrollChanged &&
				this.dirtyComponents.size < 3) {
				renderMode = 'dirty';
			}
			
			if (renderMode === 'full' || lastRenderMode !== renderMode) {
				this.ctx.fillStyle = this.backgroundColor || '#ffffff';
				this.ctx.fillRect(0, 0, this.width, this.height);
				this.renderFull();
			} else {
				this._renderDirtyComponents();
			}
			
			lastRenderMode = renderMode;
			
			// ✅ AJOUTER : Calcul et affichage du FPS
			this._frames++;
			const now = performance.now();
			const elapsed = now - this._lastFpsTime;
			
			if (elapsed >= 1000) {
				this.fps = Math.round((this._frames * 1000) / elapsed);
				this._frames = 0;
				this._lastFpsTime = now;
			}
			
			// ✅ AJOUTER : Afficher le FPS si activé
			if (this.showFps) {
				this.ctx.save();
				this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
				this.ctx.fillRect(10, 10, 100, 40);
				this.ctx.fillStyle = '#00ff00';
				this.ctx.font = 'bold 20px monospace';
				this.ctx.textAlign = 'left';
				this.ctx.textBaseline = 'top';
				this.ctx.fillText(`FPS: ${this.fps}`, 20, 20);
				this.ctx.restore();
			}
			
			// ✅ AJOUTER : Indicateurs de débogage si activés
			if (this.debbug) {
				this.drawOverflowIndicators();
			}
			
			// ✅ AJOUTER : Marquer le premier rendu
			if (!this._firstRenderDone) {
				this._markFirstRender();
			}
			
			// ✅ AJOUTER : Mettre à jour l'inertie si nécessaire
			if (Math.abs(this.scrollVelocity) > 0.1 && !this.isDragging) {
				this.scrollWorker.postMessage({ type: 'UPDATE_INERTIA' });
			}
			
			requestAnimationFrame(render);
		};
		
		render();
	}

    // 3. Ajoutez une méthode renderFull() optimisée
    renderFull() {
        // Sauvegarder le contexte
        this.ctx.save();

        // Séparer les composants
        const scrollableComponents = [];
        const fixedComponents = [];

        for (let comp of this.components) {
            if (this.isFixedComponent(comp)) {
                fixedComponents.push(comp);
            } else {
                scrollableComponents.push(comp);
            }
        }

        // ✅ OPTIMISATION : Dessiner les composants scrollables avec translation
        if (scrollableComponents.length > 0) {
            this.ctx.save();
            this.ctx.translate(0, this.scrollOffset);

            for (let comp of scrollableComponents) {
                if (comp.visible) {
                    // Viewport culling
                    const screenY = comp.y + this.scrollOffset;
                    const isInViewport = screenY + comp.height >= -100 && screenY <= this.height + 100;

                    if (isInViewport) {
                        comp.draw(this.ctx);
                    }
                }
            }

            this.ctx.restore();
        }

        // Dessiner les composants fixes
        for (let comp of fixedComponents) {
            if (comp.visible) {
                comp.draw(this.ctx);
            }
        }

        // Restaurer le contexte
        this.ctx.restore();
    }

    /**
     * Fait défiler à une position spécifique
     * @param {number} offset - Position cible
     * @param {boolean} animated - Avec animation
     */
    scrollTo(offset, animated = true) {
        if (animated) {
            const startOffset = this.scrollOffset;
            const delta = offset - startOffset;
            const duration = 300;
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = this.easeOutCubic(progress);
                const currentOffset = startOffset + delta * ease;

                this.scrollWorker.postMessage({
                    type: 'SET_SCROLL_OFFSET',
                    payload: {
                        scrollOffset: currentOffset
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        } else {
            this.scrollWorker.postMessage({
                type: 'SET_SCROLL_OFFSET',
                payload: {
                    scrollOffset: offset
                }
            });
        }
    }

    /**
     * Fonction d'easing
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        if (this.scrollWorker) {
            this.scrollWorker.terminate();
        }
        if (this.worker) {
            this.worker.terminate();
        }
        if (this.logicWorker) {
            this.logicWorker.terminate();
        }

		if (this.ctx && typeof this.ctx.destroy === 'function') {
	        this.ctx.destroy();
	    }

        // Nettoyer les écouteurs d'événements
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('resize', this.handleResize);
    }

    // ✅ AJOUTER: Afficher les métriques à l'écran
    displayMetrics() {
        const metrics = this.metrics;

        console.table({
            '⚙️ Initialisation Framework': `${metrics.initTime.toFixed(2)}ms`,
            '🎨 Premier Rendu': `${metrics.firstRenderTime.toFixed(2)}ms`,
            '🚀 Temps Total Startup': `${metrics.totalStartupTime.toFixed(2)}ms`,
            '📊 FPS Actuel': this.fps
        });
    }

    // ✅ AJOUTER: Obtenir les métriques
    getMetrics() {
        return {
            ...this.metrics,
            currentFPS: this.fps,
            componentsCount: this.components.length
        };
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




