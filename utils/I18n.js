/**
 * Système d'internationalisation avec support de la pluralisation et du formatage
 * @class
 * @example
 * const i18n = new I18n('fr');
 * i18n.addTranslations('fr', {
 *   greeting: 'Bonjour {{name}}',
 *   items: { one: '{{count}} item', other: '{{count}} items' }
 * });
 * console.log(i18n.t('greeting', { name: 'John' }));
 * console.log(i18n.plural('items', 5, { count: 5 }));
 */
class I18n {
  /**
   * @constructs I18n
   * @param {string} [defaultLocale='en'] - Langue par défaut
   */
  constructor(defaultLocale = 'en') {
    /** @type {string} */
    this.locale = defaultLocale;
    /** @type {string} */
    this.fallbackLocale = 'en';
    /** @type {Object} */
    this.translations = {};
    /** @type {Function[]} */
    this.listeners = [];
  }

  /**
   * Définir la langue courante
   * @param {string} locale - Code de la langue (ex: 'fr', 'en')
   * @returns {boolean} True si la langue a été définie
   */
  setLocale(locale) {
    if (this.translations[locale]) {
      this.locale = locale;
      this.notifyListeners();
      return true;
    }
    console.warn(`Locale ${locale} not found`);
    return false;
  }

  /**
   * Obtenir la langue courante
   * @returns {string} Code de la langue courante
   */
  getLocale() {
    return this.locale;
  }

  /**
   * Ajouter des traductions pour une langue
   * @param {string} locale - Code de la langue
   * @param {Object} translations - Objet de traductions
   */
  addTranslations(locale, translations) {
    if (!this.translations[locale]) {
      this.translations[locale] = {};
    }
    
    // Merge avec les traductions existantes
    this.translations[locale] = {
      ...this.translations[locale],
      ...translations
    };
  }

  /**
   * Traduire une clé
   * @param {string} key - Clé de traduction
   * @param {Object} [params={}] - Paramètres à interpoler
   * @param {string} [locale=null] - Langue spécifique (null pour la langue courante)
   * @returns {string} Texte traduit
   */
  t(key, params = {}, locale = null) {
    const currentLocale = locale || this.locale;
    
    // Chercher la traduction
    let translation = this.getNestedValue(this.translations[currentLocale], key);
    
    // Fallback sur la langue par défaut
    if (!translation && currentLocale !== this.fallbackLocale) {
      translation = this.getNestedValue(this.translations[this.fallbackLocale], key);
    }
    
    // Si toujours pas trouvé, retourner la clé
    if (!translation) {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }
    
    // Remplacer les paramètres
    return this.interpolate(translation, params);
  }

  /**
   * Obtenir une valeur imbriquée dans un objet (ex: "user.profile.name")
   * @param {Object} obj - Objet source
   * @param {string} path - Chemin de la propriété
   * @returns {*} Valeur trouvée ou undefined
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current ? current[key] : undefined;
    }, obj);
  }

  /**
   * Interpoler les paramètres dans une chaîne de traduction
   * @param {string} template - Template avec paramètres
   * @param {Object} params - Paramètres à remplacer
   * @returns {string} Chaîne interpolée
   * @private
   */
  interpolate(template, params) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params.hasOwnProperty(key) ? params[key] : match;
    });
  }

  /**
   * Gérer la pluralisation
   * @param {string} key - Clé de traduction (base)
   * @param {number} count - Nombre pour déterminer la pluralité
   * @param {Object} [params={}] - Paramètres additionnels
   * @returns {string} Texte traduit avec pluralisation
   */
  plural(key, count, params = {}) {
    const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
    return this.t(pluralKey, { ...params, count });
  }

  /**
   * Formater une date selon la locale
   * @param {Date} date - Date à formater
   * @param {string} [format='long'] - Format de date ('short', 'long', 'full')
   * @returns {string} Date formatée
   */
  formatDate(date, format = 'long') {
    const options = {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    };
    
    return new Intl.DateTimeFormat(this.locale, options[format] || options.long)
      .format(date);
  }

  /**
   * Formater un nombre selon la locale
   * @param {number} number - Nombre à formater
   * @param {Object} [options={}] - Options de formatage Intl.NumberFormat
   * @returns {string} Nombre formaté
   */
  formatNumber(number, options = {}) {
    return new Intl.NumberFormat(this.locale, options).format(number);
  }

  /**
   * Formater une devise selon la locale
   * @param {number} amount - Montant à formater
   * @param {string} [currency='USD'] - Code de la devise
   * @returns {string} Montant formaté avec devise
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * S'abonner aux changements de langue
   * @param {Function} callback - Fonction appelée quand la langue change
   * @returns {Function} Fonction de désabonnement
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifier les observateurs du changement de langue
   * @private
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.locale));
  }

  /**
   * Obtenir les langues disponibles
   * @returns {string[]} Liste des codes de langues disponibles
   */
  getAvailableLocales() {
    return Object.keys(this.translations);
  }
}

export default I18n;