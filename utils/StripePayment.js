/**
 * StripePayment - Utilitaire pour gérer les paiements Stripe dans Canvas
 * Version avec création/suppression automatique des éléments DOM
 * 
 * @example
 * const stripe = new StripePayment('pk_test_xxxxx', {
 *   canvasContainer: canvasElement,
 *   onElementReady: (element) => { /* afficher dans canvas *\/ }
 * });
 */
class StripePayment {
  constructor(publishableKey, options = {}) {
    this.publishableKey = publishableKey;
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
    
    // Options spécifiques Canvas
    this.canvasContainer = options.canvasContainer || null;
    this.canvasContext = options.canvasContext || null;
    this.onElementReady = options.onElementReady || null;
    this.onErrorDisplay = options.onErrorDisplay || null;
    
    // Options Stripe
    this.locale = options.locale || 'fr';
    this.appearance = options.appearance || {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      }
    };
    
    this.onPaymentSuccess = options.onPaymentSuccess || null;
    this.onPaymentError = options.onPaymentError || null;
    this.onPaymentProcessing = options.onPaymentProcessing || null;
    
    // Stockage des éléments DOM temporaires
    this.temporaryElements = {
      script: null,
      container: null,
      iframeContainer: null
    };
    
    this.isInitialized = false;
    this.isProcessing = false;
    this.paymentFormData = {
      cardNumber: '',
      expiry: '',
      cvc: '',
      postalCode: ''
    };
  }

  /**
   * Créer un élément DOM temporaire
   */
  createTemporaryElement(tagName, attributes = {}, parent = document.body) {
    if (typeof document === 'undefined') {
      throw new Error('DOM non disponible');
    }
    
    const element = document.createElement(tagName);
    
    // Appliquer les attributs
    Object.keys(attributes).forEach(key => {
      if (key === 'style' && typeof attributes[key] === 'object') {
        Object.assign(element.style, attributes[key]);
      } else if (key === 'textContent') {
        element.textContent = attributes[key];
      } else if (key === 'innerHTML') {
        element.innerHTML = attributes[key];
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    // Ajouter au parent
    if (parent) {
      parent.appendChild(element);
    }
    
    return element;
  }

  /**
   * Supprimer un élément DOM temporaire
   */
  removeTemporaryElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Nettoyer tous les éléments DOM temporaires
   */
  cleanupTemporaryElements() {
    Object.keys(this.temporaryElements).forEach(key => {
      if (this.temporaryElements[key]) {
        this.removeTemporaryElement(this.temporaryElements[key]);
        this.temporaryElements[key] = null;
      }
    });
  }

  /**
   * Initialiser Stripe.js avec gestion automatique du script
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Charger Stripe.js dynamiquement
      await this.loadStripeScript();
      
      // Initialiser Stripe
      this.stripe = window.Stripe(this.publishableKey, {
        locale: this.locale,
        betas: ['elements_enable_deferred_intent_beta_1']
      });
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Erreur initialisation Stripe:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Charger Stripe.js avec création/suppression automatique du script
   */
  loadStripeScript() {
    return new Promise((resolve, reject) => {
      // Vérifier si Stripe est déjà chargé
      if (typeof window.Stripe !== 'undefined') {
        resolve();
        return;
      }

      // Vérifier si un script existe déjà
      const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/"]');
      if (existingScript) {
        // Utiliser le script existant
        this.temporaryElements.script = existingScript;
        resolve();
        return;
      }

      // Créer un nouveau script
      try {
        this.temporaryElements.script = this.createTemporaryElement('script', {
          src: 'https://js.stripe.com/v3/',
          async: true,
          onload: () => {
            if (typeof window.Stripe === 'undefined') {
              reject(new Error('Stripe.js chargé mais non défini'));
              return;
            }
            resolve();
          },
          onerror: () => {
            reject(new Error('Échec du chargement de Stripe.js'));
            this.cleanupTemporaryElements();
          }
        }, document.head);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Créer un conteneur temporaire pour les éléments de paiement
   */
  createTemporaryContainer(options = {}) {
    if (!this.temporaryElements.container) {
      this.temporaryElements.container = this.createTemporaryElement('div', {
        id: 'stripe-payment-container-' + Date.now(),
        style: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '9999',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }
      }, document.body);

      // Ajouter un bouton de fermeture
      const closeButton = this.createTemporaryElement('button', {
        style: {
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          color: '#fff',
          cursor: 'pointer',
          zIndex: '10000'
        },
        textContent: '×',
        onclick: () => this.destroyTemporaryContainer()
      }, this.temporaryElements.container);

      // Ajouter un conteneur pour le formulaire
      const formContainer = this.createTemporaryElement('div', {
        style: {
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '12px',
          width: '400px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflow: 'auto',
          position: 'relative'
        }
      }, this.temporaryElements.container);

      // Retourner l'ID du conteneur pour Stripe Elements
      return formContainer;
    }
    
    return this.temporaryElements.container;
  }

  /**
   * Détruire le conteneur temporaire
   */
  destroyTemporaryContainer() {
    if (this.temporaryElements.container) {
      this.removeTemporaryElement(this.temporaryElements.container);
      this.temporaryElements.container = null;
    }
  }

  /**
   * Créer et monter un élément de carte dans un conteneur temporaire
   */
  async createCardElementInTemporaryContainer() {
    if (!this.isInitialized) {
      throw new Error('Stripe non initialisé');
    }

    try {
      // Créer le conteneur temporaire
      const formContainer = this.createTemporaryContainer();
      
      // Créer un div pour l'élément de carte
      const cardContainer = this.createTemporaryElement('div', {
        id: 'stripe-card-element-' + Date.now(),
        style: {
          margin: '20px 0'
        }
      }, formContainer);

      // Créer les éléments Stripe
      this.elements = this.stripe.elements({
        appearance: this.appearance,
        locale: this.locale
      });

      // Créer et monter l'élément de carte
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#32325d',
            fontFamily: 'system-ui, sans-serif',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        },
        hidePostalCode: false
      });

      this.cardElement.mount(cardContainer);

      // Ajouter un bouton de paiement
      const payButton = this.createTemporaryElement('button', {
        style: {
          backgroundColor: '#5469d4',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer',
          width: '100%',
          marginTop: '20px'
        },
        textContent: 'Payer',
        onclick: () => this.processPaymentWithTemporaryElement()
      }, formContainer);

      // Configurer les écouteurs
      this.setupElementListeners();

      return this.cardElement;
      
    } catch (error) {
      console.error('❌ Erreur création élément:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Configurer les écouteurs pour l'élément
   */
  setupElementListeners() {
    if (!this.cardElement) return;

    this.cardElement.on('change', (event) => {
      if (event.error && this.onErrorDisplay) {
        this.onErrorDisplay(event.error.message);
      }
      
      if (event.value) {
        this.paymentFormData = {
          ...this.paymentFormData,
          ...event.value
        };
      }
    });
  }

  /**
   * Traiter le paiement avec l'élément temporaire
   */
  async processPaymentWithTemporaryElement(paymentData) {
    if (!this.cardElement || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Créer un PaymentIntent
      const clientSecret = await this.createPaymentIntent(paymentData);
      
      // Confirmer le paiement
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement
        },
        billing_details: paymentData.billingDetails || {}
      });

      if (error) {
        throw error;
      }

      // Succès
      if (this.onPaymentSuccess) {
        this.onPaymentSuccess(paymentIntent);
      }

      // Nettoyer après succès
      this.destroyTemporaryContainer();
      
      return { success: true, paymentIntent };
      
    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      
      if (this.onPaymentError) {
        this.onPaymentError(error);
      }
      
      return { success: false, error: error.message };
      
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Créer un PaymentIntent
   */
  async createPaymentIntent(paymentData) {
    const {
      amount,
      currency = 'eur',
      description = '',
      metadata = {},
      serverUrl = '/api/create-payment-intent'
    } = paymentData;

    try {
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error('Erreur création PaymentIntent');
      }

      const data = await response.json();
      return data.clientSecret;
      
    } catch (error) {
      console.error('❌ Erreur createPaymentIntent:', error);
      throw error;
    }
  }

  /**
   * Interface simplifiée pour le paiement
   */
  async startPaymentFlow(paymentData) {
    try {
      // Initialiser Stripe
      await this.initialize();
      
      // Créer l'interface de paiement
      await this.createCardElementInTemporaryContainer();
      
      // Stocker les données de paiement pour utilisation ultérieure
      this.currentPaymentData = paymentData;
      
      return { success: true, message: 'Interface de paiement prête' };
      
    } catch (error) {
      console.error('❌ Erreur démarrage paiement:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Méthode Checkout (redirection)
   */
  async redirectToCheckout(paymentData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Créer une session de checkout côté serveur
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: paymentData.currency || 'eur',
          successUrl: paymentData.successUrl || `${window.location.origin}/success`,
          cancelUrl: paymentData.cancelUrl || `${window.location.origin}/cancel`,
          metadata: paymentData.metadata || {}
        })
      });

      const session = await response.json();

      // Rediriger vers Stripe Checkout
      const result = await this.stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (result.error) {
        throw result.error;
      }

    } catch (error) {
      console.error('❌ Erreur Checkout:', error);
      throw error;
    }
  }

  /**
   * Nettoyer toutes les ressources
   */
  destroy() {
    // Détruire les éléments Stripe
    if (this.cardElement) {
      try {
        this.cardElement.destroy();
      } catch (e) {
        // Ignorer les erreurs de destruction
      }
      this.cardElement = null;
    }
    
    if (this.elements) {
      this.elements = null;
    }
    
    this.stripe = null;
    this.isInitialized = false;
    this.isProcessing = false;
    
    // Nettoyer tous les éléments DOM temporaires
    this.cleanupTemporaryElements();
    
  }

  /**
   * Détruire proprement avec callback
   */
  destroyWithCallback(onComplete) {
    this.destroy();
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }
}

// Méthodes statiques utilitaires
StripePayment.isStripeSupported = function() {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' &&
         typeof window.Stripe !== 'undefined';
};

StripePayment.createHiddenInput = function(name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  return input;
};

export default StripePayment;