/**
 * Gestionnaire de thèmes indépendant et fiable
 * Gère automatiquement le light/dark mode avec persistance
 */
class ThemeManager {
  constructor(framework, options = {}) {
    this.framework = framework;
    
    // Thèmes par défaut (peuvent être overridés)
    this.themes = {
      light: options.lightTheme || {
        // Couleurs de base
        background: '#FFFFFF',
        surface: '#F5F5F5',
        surfaceVariant: '#E7E0EC',
        
        // Texte
        text: '#1C1B1F',
        textSecondary: '#49454F',
        textDisabled: '#79747E',
        
        // Primaire
        primary: '#6750A4',
        onPrimary: '#FFFFFF',
        primaryContainer: '#EADDFF',
        onPrimaryContainer: '#21005D',
        
        // Secondaire
        secondary: '#625B71',
        onSecondary: '#FFFFFF',
        secondaryContainer: '#E8DEF8',
        onSecondaryContainer: '#1D192B',
        
        // Tertiaire
        tertiary: '#7D5260',
        onTertiary: '#FFFFFF',
        tertiaryContainer: '#FFD8E4',
        onTertiaryContainer: '#31111D',
        
        // Erreur
        error: '#B3261E',
        onError: '#FFFFFF',
        errorContainer: '#F9DEDC',
        onErrorContainer: '#410E0B',
        
        // Bordures et dividers
        border: '#CAC4D0',
        divider: '#E0E0E0',
        outline: '#79747E',
        outlineVariant: '#CAC4D0',
        
        // États
        hover: 'rgba(103, 80, 164, 0.08)',
        pressed: 'rgba(103, 80, 164, 0.12)',
        focus: 'rgba(103, 80, 164, 0.12)',
        disabled: 'rgba(28, 27, 31, 0.12)',
        
        // Ombres
        shadow: 'rgba(0, 0, 0, 0.2)',
        elevation1: 'rgba(0, 0, 0, 0.05)',
        elevation2: 'rgba(0, 0, 0, 0.08)',
        elevation3: 'rgba(0, 0, 0, 0.12)',
      },
      
      dark: options.darkTheme || {
        // Couleurs de base
        background: '#1C1B1F',
        surface: '#2B2930',
        surfaceVariant: '#49454F',
        
        // Texte
        text: '#E6E1E5',
        textSecondary: '#CAC4D0',
        textDisabled: '#938F99',
        
        // Primaire
        primary: '#D0BCFF',
        onPrimary: '#381E72',
        primaryContainer: '#4F378B',
        onPrimaryContainer: '#EADDFF',
        
        // Secondaire
        secondary: '#CCC2DC',
        onSecondary: '#332D41',
        secondaryContainer: '#4A4458',
        onSecondaryContainer: '#E8DEF8',
        
        // Tertiaire
        tertiary: '#EFB8C8',
        onTertiary: '#492532',
        tertiaryContainer: '#633B48',
        onTertiaryContainer: '#FFD8E4',
        
        // Erreur
        error: '#F2B8B5',
        onError: '#601410',
        errorContainer: '#8C1D18',
        onErrorContainer: '#F9DEDC',
        
        // Bordures et dividers
        border: '#938F99',
        divider: '#3D3D3D',
        outline: '#938F99',
        outlineVariant: '#49454F',
        
        // États
        hover: 'rgba(208, 188, 255, 0.08)',
        pressed: 'rgba(208, 188, 255, 0.12)',
        focus: 'rgba(208, 188, 255, 0.12)',
        disabled: 'rgba(230, 225, 229, 0.12)',
        
        // Ombres
        shadow: 'rgba(0, 0, 0, 0.8)',
        elevation1: 'rgba(0, 0, 0, 0.3)',
        elevation2: 'rgba(0, 0, 0, 0.4)',
        elevation3: 'rgba(0, 0, 0, 0.5)',
      }
    };
    
    // État actuel
    this.currentMode = null; // 'light', 'dark', ou null (system)
    this.currentTheme = null;
    
    // Callbacks
    this.listeners = [];
    
    // Storage key
    this.storageKey = options.storageKey || 'app-theme-mode';
    
    // Initialisation
    this.init();
  }
  
  /**
   * Initialise le ThemeManager
   */
  init() {
    // 1. Charger la préférence sauvegardée
    const savedMode = this.loadPreference();
    
    // 2. Écouter les changements système
    this.setupSystemListener();
    
    // 3. Appliquer le thème
    if (savedMode) {
      this.setMode(savedMode, false); // false = ne pas re-sauvegarder
    } else {
      this.setMode('system', false);
    }
  }
  
  /**
   * Charge la préférence depuis le localStorage
   */
  loadPreference() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Impossible de charger les préférences de thème:', e);
    }
    return null;
  }
  
  /**
   * Sauvegarde la préférence dans le localStorage
   */
  savePreference(mode) {
    try {
      localStorage.setItem(this.storageKey, mode);
    } catch (e) {
      console.warn('Impossible de sauvegarder les préférences de thème:', e);
    }
  }
  
  /**
   * Configure l'écoute des changements système
   */
  setupSystemListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Ne réagir que si on est en mode 'system'
      if (this.currentMode === 'system') {
        this.applySystemTheme();
      }
    };
    
    // Méthode moderne
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback pour anciens navigateurs
      mediaQuery.addListener(handleChange);
    }
    
    // Sauvegarder pour cleanup
    this.systemMediaQuery = mediaQuery;
    this.systemChangeHandler = handleChange;
  }
  
  /**
   * Applique le thème système
   */
  applySystemTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? this.themes.dark : this.themes.light;
    this.applyTheme(theme);
  }
  
  /**
   * Définit le mode de thème
   * @param {'light'|'dark'|'system'} mode
   * @param {boolean} save - Sauvegarder la préférence
   */
  setMode(mode, save = true) {
    if (!['light', 'dark', 'system'].includes(mode)) {
      console.warn(`Mode invalide: ${mode}. Utilisez 'light', 'dark' ou 'system'.`);
      return;
    }
    
    this.currentMode = mode;
    
    // Sauvegarder si demandé
    if (save) {
      this.savePreference(mode);
    }
    
    // Appliquer le thème correspondant
    if (mode === 'system') {
      this.applySystemTheme();
    } else {
      const theme = this.themes[mode];
      this.applyTheme(theme);
    }
  }
  
  /**
   * Applique un thème au framework
   */
  applyTheme(theme) {
    this.currentTheme = theme;
    
    // Mettre à jour le framework
    if (this.framework) {
      this.framework.theme = theme;
      
      // Forcer le rendu de tous les composants
      if (this.framework.components) {
        this.framework.components.forEach(comp => {
          if (comp.markDirty) {
            comp.markDirty();
          }
        });
      }
    }
    
    // Notifier les listeners
    this.notifyListeners(theme);
  }
  
  /**
   * Obtient le mode actuel
   */
  getMode() {
    return this.currentMode;
  }
  
  /**
   * Obtient le thème actuel
   */
  getTheme() {
    return this.currentTheme;
  }
  
  /**
   * Obtient une couleur spécifique
   */
  getColor(colorName) {
    return this.currentTheme?.[colorName] || '#000000';
  }
  
  /**
   * Bascule entre light et dark
   */
  toggle() {
    if (this.currentMode === 'system') {
      // Si en mode system, basculer vers le mode opposé
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setMode(isDark ? 'light' : 'dark');
    } else {
      // Basculer entre light et dark
      this.setMode(this.currentMode === 'light' ? 'dark' : 'light');
    }
  }
  
  /**
   * Ajoute un listener de changement de thème
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      // Appeler immédiatement avec le thème actuel
      callback(this.currentTheme);
    }
  }
  
  /**
   * Retire un listener
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notifie tous les listeners
   */
  notifyListeners(theme) {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (e) {
        console.error('Erreur dans un listener de thème:', e);
      }
    });
  }
  
  /**
   * Définit un thème personnalisé
   */
  setCustomTheme(name, theme) {
    this.themes[name] = theme;
  }
  
  /**
   * Nettoie les ressources
   */
  destroy() {
    // Retirer l'écoute système
    if (this.systemMediaQuery && this.systemChangeHandler) {
      if (this.systemMediaQuery.removeEventListener) {
        this.systemMediaQuery.removeEventListener('change', this.systemChangeHandler);
      } else {
        this.systemMediaQuery.removeListener(this.systemChangeHandler);
      }
    }
    
    // Vider les listeners
    this.listeners = [];
  }
}

export default ThemeManager;