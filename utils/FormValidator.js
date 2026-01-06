/**
 * Validateur de formulaires avec règles personnalisables
 * @class
 * @property {Object} rules - Règles de validation
 * @property {Object} messages - Messages d'erreur personnalisés
 * @property {Object} errors - Erreurs de validation
 */
class FormValidator {
  /**
   * Crée une instance de FormValidator
   * @param {Object} [rules={}] - Règles de validation
   * @param {Object} [customMessages={}] - Messages personnalisés
   */
  constructor(rules = {}, customMessages = {}) {
    this.rules = rules;
    this.customMessages = customMessages;
    this.errors = {};
    
    // Messages par défaut
    this.defaultMessages = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      min: 'Value must be at least {min}',
      max: 'Value must not exceed {max}',
      minLength: 'Must be at least {minLength} characters',
      maxLength: 'Must not exceed {maxLength} characters',
      pattern: 'Invalid format',
      url: 'Please enter a valid URL',
      numeric: 'Must be a number',
      integer: 'Must be an integer',
      phone: 'Please enter a valid phone number',
      match: 'Fields do not match',
      custom: 'Invalid value'
    };
  }

  /**
   * Valide toutes les données
   * @param {Object} data - Données à valider
   * @returns {boolean} True si valide
   */
  validate(data) {
    this.errors = {};
    let isValid = true;

    for (let field in this.rules) {
      const fieldRules = this.rules[field];
      const value = data[field];

      const fieldErrors = this.validateField(field, value, data);
      
      if (fieldErrors.length > 0) {
        this.errors[field] = fieldErrors;
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Valide un champ spécifique
   * @param {string} field - Nom du champ
   * @param {*} value - Valeur à valider
   * @param {Object} [allData={}] - Toutes les données (pour match, etc.)
   * @returns {Array} Liste des erreurs
   */
  validateField(field, value, allData = {}) {
    const fieldRules = this.rules[field];
    const errors = [];

    if (!fieldRules) return errors;

    // Required
    if (fieldRules.required && this.isEmpty(value)) {
      errors.push(this.getMessage(field, 'required'));
      return errors; // Arrêter si requis et vide
    }

    // Si vide et non requis, ne pas valider le reste
    if (this.isEmpty(value) && !fieldRules.required) {
      return errors;
    }

    // Email
    if (fieldRules.email && !this.isEmail(value)) {
      errors.push(this.getMessage(field, 'email'));
    }

    // Min
    if (fieldRules.min !== undefined && Number(value) < fieldRules.min) {
      errors.push(this.getMessage(field, 'min', { min: fieldRules.min }));
    }

    // Max
    if (fieldRules.max !== undefined && Number(value) > fieldRules.max) {
      errors.push(this.getMessage(field, 'max', { max: fieldRules.max }));
    }

    // MinLength
    if (fieldRules.minLength && String(value).length < fieldRules.minLength) {
      errors.push(this.getMessage(field, 'minLength', { minLength: fieldRules.minLength }));
    }

    // MaxLength
    if (fieldRules.maxLength && String(value).length > fieldRules.maxLength) {
      errors.push(this.getMessage(field, 'maxLength', { maxLength: fieldRules.maxLength }));
    }

    // Pattern
    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors.push(this.getMessage(field, 'pattern'));
    }

    // URL
    if (fieldRules.url && !this.isURL(value)) {
      errors.push(this.getMessage(field, 'url'));
    }

    // Numeric
    if (fieldRules.numeric && !this.isNumeric(value)) {
      errors.push(this.getMessage(field, 'numeric'));
    }

    // Integer
    if (fieldRules.integer && !this.isInteger(value)) {
      errors.push(this.getMessage(field, 'integer'));
    }

    // Phone
    if (fieldRules.phone && !this.isPhone(value)) {
      errors.push(this.getMessage(field, 'phone'));
    }

    // Match (compare avec un autre champ)
    if (fieldRules.match && value !== allData[fieldRules.match]) {
      errors.push(this.getMessage(field, 'match'));
    }

    // Custom validator
    if (fieldRules.custom && typeof fieldRules.custom === 'function') {
      const customResult = fieldRules.custom(value, allData);
      if (customResult !== true) {
        errors.push(typeof customResult === 'string' ? customResult : this.getMessage(field, 'custom'));
      }
    }

    return errors;
  }

  /**
   * Obtient un message d'erreur
   * @param {string} field - Nom du champ
   * @param {string} rule - Nom de la règle
   * @param {Object} [params={}] - Paramètres à injecter
   * @returns {string} Message d'erreur
   * @private
   */
  getMessage(field, rule, params = {}) {
    let message = this.customMessages[`${field}.${rule}`] || 
                  this.customMessages[rule] || 
                  this.defaultMessages[rule];

    // Remplacer les placeholders
    for (let key in params) {
      message = message.replace(`{${key}}`, params[key]);
    }

    return message;
  }

  /**
   * Vérifie si une valeur est vide
   * @param {*} value - Valeur à vérifier
   * @returns {boolean} True si vide
   * @private
   */
  isEmpty(value) {
    return value === null || 
           value === undefined || 
           value === '' || 
           (Array.isArray(value) && value.length === 0);
  }

  /**
   * Vérifie si c'est un email valide
   * @param {string} value - Email
   * @returns {boolean} True si valide
   * @private
   */
  isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Vérifie si c'est une URL valide
   * @param {string} value - URL
   * @returns {boolean} True si valide
   * @private
   */
  isURL(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si c'est un nombre
   * @param {*} value - Valeur
   * @returns {boolean} True si numérique
   * @private
   */
  isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  /**
   * Vérifie si c'est un entier
   * @param {*} value - Valeur
   * @returns {boolean} True si entier
   * @private
   */
  isInteger(value) {
    return Number.isInteger(Number(value));
  }

  /**
   * Vérifie si c'est un numéro de téléphone
   * @param {string} value - Téléphone
   * @returns {boolean} True si valide
   * @private
   */
  isPhone(value) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
  }

  /**
   * Obtient toutes les erreurs
   * @returns {Object} Erreurs
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Obtient les erreurs d'un champ
   * @param {string} field - Nom du champ
   * @returns {Array} Erreurs du champ
   */
  getFieldErrors(field) {
    return this.errors[field] || [];
  }

  /**
   * Vérifie si un champ a des erreurs
   * @param {string} field - Nom du champ
   * @returns {boolean} True si le champ a des erreurs
   */
  hasError(field) {
    return this.errors[field] && this.errors[field].length > 0;
  }

  /**
   * Réinitialise les erreurs
   */
  reset() {
    this.errors = {};
  }

  /**
   * Ajoute une règle de validation
   * @param {string} field - Nom du champ
   * @param {Object} rules - Règles
   */
  addRule(field, rules) {
    this.rules[field] = { ...this.rules[field], ...rules };
  }

  /**
   * Supprime une règle
   * @param {string} field - Nom du champ
   */
  removeRule(field) {
    delete this.rules[field];
  }

  /**
   * Valide en temps réel (debounced)
   * @param {string} field - Nom du champ
   * @param {*} value - Valeur
   * @param {Object} [allData={}] - Toutes les données
   * @param {number} [delay=300] - Délai en ms
   * @returns {Promise} Promise qui se résout avec les erreurs
   */
  validateAsync(field, value, allData = {}, delay = 300) {
    if (this.validateTimer) {
      clearTimeout(this.validateTimer);
    }

    return new Promise((resolve) => {
      this.validateTimer = setTimeout(() => {
        const errors = this.validateField(field, value, allData);
        
        if (errors.length > 0) {
          this.errors[field] = errors;
        } else {
          delete this.errors[field];
        }
        
        resolve(errors);
      }, delay);
    });
  }
}

// Règles prédéfinies utiles
FormValidator.presets = {
  // Login form
  login: {
    email: { required: true, email: true },
    password: { required: true, minLength: 8 }
  },
  
  // Registration form
  registration: {
    username: { required: true, minLength: 3, maxLength: 20, pattern: /^[a-zA-Z0-9_]+$/ },
    email: { required: true, email: true },
    password: { required: true, minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/ },
    confirmPassword: { required: true, match: 'password' },
    terms: { required: true }
  },
  
  // Contact form
  contact: {
    name: { required: true, minLength: 2 },
    email: { required: true, email: true },
    phone: { phone: true },
    message: { required: true, minLength: 10, maxLength: 500 }
  },
  
  // Payment form
  payment: {
    cardNumber: { required: true, pattern: /^\d{16}$/ },
    cardName: { required: true, minLength: 2 },
    expiryDate: { required: true, pattern: /^\d{2}\/\d{2}$/ },
    cvv: { required: true, pattern: /^\d{3,4}$/ }
  }
};

export default FormValidator;