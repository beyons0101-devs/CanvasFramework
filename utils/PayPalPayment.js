/**
 * PayPalPayment - Utilitaire pour gérer les paiements PayPal
 * Version avec création/suppression automatique des éléments DOM
 * 
 * @example
 * const paypal = new PayPalPayment('YOUR_CLIENT_ID');
 * await paypal.initialize();
 * await paypal.createTemporaryButton({
 *   amount: '50.00',
 *   currency: 'EUR'
 * });
 */
class PayPalPayment {
  constructor(clientId, options = {}) {
    this.clientId = clientId;
    this.currency = options.currency || 'EUR';
    this.locale = options.locale || 'fr_FR';
    this.intent = options.intent || 'capture';
    this.environment = options.environment || 'sandbox';
    
    // Callbacks
    this.onPaymentSuccess = options.onPaymentSuccess || null;
    this.onPaymentError = options.onPaymentError || null;
    this.onPaymentCancel = options.onPaymentCancel || null;
    this.onPaymentProcessing = options.onPaymentProcessing || null;
    
    // Stockage des éléments DOM temporaires
    this.temporaryElements = {
      script: null,
      container: null,
      buttonContainer: null,
      overlay: null
    };
    
    this.isInitialized = false;
    this.buttons = [];
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
      } else if (key.startsWith('on')) {
        element[key] = attributes[key];
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
    
    // Fermer les boutons PayPal
    this.buttons.forEach(button => {
      if (button && typeof button.close === 'function') {
        try {
          button.close();
        } catch (e) {
          // Ignorer les erreurs de fermeture
        }
      }
    });
    this.buttons = [];
  }

  /**
   * Créer un overlay temporaire
   */
  createOverlay(options = {}) {
    if (this.temporaryElements.overlay) {
      return this.temporaryElements.overlay;
    }

    this.temporaryElements.overlay = this.createTemporaryElement('div', {
      id: 'paypal-overlay-' + Date.now(),
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: '9998',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      }
    }, document.body);

    // Animer l'apparition
    setTimeout(() => {
      if (this.temporaryElements.overlay) {
        this.temporaryElements.overlay.style.opacity = '1';
      }
    }, 10);

    return this.temporaryElements.overlay;
  }

  /**
   * Créer un conteneur modal temporaire
   */
  createTemporaryModal(options = {}) {
    if (this.temporaryElements.container) {
      return this.temporaryElements.container;
    }

    // Créer l'overlay
    this.createOverlay();

    // Créer la modal
    this.temporaryElements.container = this.createTemporaryElement('div', {
      id: 'paypal-modal-' + Date.now(),
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '30px',
        width: '400px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflow: 'auto',
        zIndex: '9999',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        opacity: '0',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      }
    }, document.body);

    // Ajouter un bouton de fermeture
    const closeButton = this.createTemporaryElement('button', {
      style: {
        position: 'absolute',
        top: '15px',
        right: '15px',
        background: 'none',
        border: 'none',
        fontSize: '24px',
        color: '#666',
        cursor: 'pointer',
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'background-color 0.2s'
      },
      textContent: '×',
      onmouseover: function() { this.style.backgroundColor = '#f0f0f0'; },
      onmouseout: function() { this.style.backgroundColor = 'transparent'; },
      onclick: () => this.destroyTemporaryModal()
    }, this.temporaryElements.container);

    // Ajouter un titre
    if (options.title) {
      const title = this.createTemporaryElement('h2', {
        style: {
          margin: '0 0 20px 0',
          color: '#333',
          fontSize: '24px',
          textAlign: 'center'
        },
        textContent: options.title
      }, this.temporaryElements.container);
    }

    // Animer l'apparition
    setTimeout(() => {
      if (this.temporaryElements.container) {
        this.temporaryElements.container.style.opacity = '1';
        this.temporaryElements.container.style.transform = 'translate(-50%, -50%)';
      }
    }, 10);

    return this.temporaryElements.container;
  }

  /**
   * Détruire la modal temporaire
   */
  destroyTemporaryModal() {
    if (this.temporaryElements.container) {
      // Animation de disparition
      this.temporaryElements.container.style.opacity = '0';
      this.temporaryElements.container.style.transform = 'translate(-50%, -60%)';
      
      setTimeout(() => {
        this.removeTemporaryElement(this.temporaryElements.container);
        this.temporaryElements.container = null;
      }, 300);
    }
    
    if (this.temporaryElements.overlay) {
      // Animation de disparition de l'overlay
      this.temporaryElements.overlay.style.opacity = '0';
      
      setTimeout(() => {
        this.removeTemporaryElement(this.temporaryElements.overlay);
        this.temporaryElements.overlay = null;
      }, 300);
    }
  }

  /**
   * Charger le script PayPal SDK avec gestion temporaire
   */
  loadPayPalScript() {
    return new Promise((resolve, reject) => {
      if (typeof paypal !== 'undefined') {
        resolve();
        return;
      }

      // Vérifier si un script existe déjà
      const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (existingScript) {
        this.temporaryElements.script = existingScript;
        
        // Vérifier que PayPal est chargé
        const checkPayPal = () => {
          if (typeof paypal !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkPayPal, 100);
          }
        };
        checkPayPal();
        return;
      }

      try {
        // Créer le script temporaire
        const scriptUrl = `https://www.paypal.com/sdk/js?client-id=${this.clientId}&currency=${this.currency}&locale=${this.locale}&intent=${this.intent}`;
        
        this.temporaryElements.script = this.createTemporaryElement('script', {
          src: scriptUrl,
          async: true,
          onload: () => {
            if (typeof paypal === 'undefined') {
              reject(new Error('SDK PayPal chargé mais non défini'));
              return;
            }
            resolve();
          },
          onerror: () => {
            reject(new Error('Échec du chargement du SDK PayPal'));
            this.cleanupTemporaryElements();
          }
        }, document.head);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialiser PayPal SDK
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadPayPalScript();
      this.isInitialized = true;
      console.log('✅ PayPal initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation PayPal:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Créer un bouton PayPal dans un conteneur temporaire
   */
  async createTemporaryButton(orderData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Créer la modal temporaire
      const modal = this.createTemporaryModal({
        title: orderData.title || 'Paiement sécurisé'
      });

      // Créer un conteneur pour le bouton
      this.temporaryElements.buttonContainer = this.createTemporaryElement('div', {
        id: 'paypal-button-container-' + Date.now(),
        style: {
          margin: '20px 0',
          minHeight: '50px'
        }
      }, modal);

      // Créer le bouton PayPal
      const button = paypal.Buttons({
        style: orderData.style || {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 45
        },

        // Créer la commande
        createOrder: async (data, actions) => {
          if (this.onPaymentProcessing) {
            this.onPaymentProcessing();
          }

          try {
            // Si serverUrl fourni, créer la commande côté serveur
            if (orderData.serverUrl) {
              const response = await fetch(orderData.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: orderData.amount,
                  currency: orderData.currency || this.currency,
                  description: orderData.description || '',
                  items: orderData.items || []
                })
              });

              const data = await response.json();
              return data.orderID;
            }

            // Sinon, créer la commande directement
            return actions.order.create({
              purchase_units: [{
                amount: {
                  currency_code: orderData.currency || this.currency,
                  value: orderData.amount,
                  breakdown: orderData.breakdown || undefined
                },
                description: orderData.description || '',
                items: orderData.items || undefined,
                shipping: orderData.shipping || undefined
              }],
              application_context: {
                brand_name: orderData.brandName || '',
                shipping_preference: orderData.shippingPreference || 'NO_SHIPPING'
              }
            });

          } catch (error) {
            console.error('❌ Erreur createOrder:', error);
            if (this.onPaymentError) {
              this.onPaymentError(error);
            }
            throw error;
          }
        },

        // Approuver le paiement
        onApprove: async (data, actions) => {
          try {
            // Capturer le paiement
            const details = await actions.order.capture();
            
            console.log('✅ Paiement PayPal réussi:', details);

            // Appeler le callback de succès
            if (this.onPaymentSuccess) {
              this.onPaymentSuccess(details);
            }

            // Nettoyer la modal après succès
            setTimeout(() => {
              this.destroyTemporaryModal();
            }, 1000);

            // Notifier le serveur si serverUrl fourni
            if (orderData.onApproveUrl) {
              await fetch(orderData.onApproveUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID: data.orderID,
                  details: details
                })
              });
            }

            return details;

          } catch (error) {
            console.error('❌ Erreur onApprove:', error);
            if (this.onPaymentError) {
              this.onPaymentError(error);
            }
            throw error;
          }
        },

        // Annulation du paiement
        onCancel: (data) => {
          console.log('⚠️ Paiement annulé:', data);
          if (this.onPaymentCancel) {
            this.onPaymentCancel(data);
          }
        },

        // Erreur
        onError: (err) => {
          console.error('❌ Erreur PayPal:', err);
          if (this.onPaymentError) {
            this.onPaymentError(err);
          }
        }
      });

      // Rendre le bouton
      if (button.isEligible()) {
        await button.render(`#${this.temporaryElements.buttonContainer.id}`);
        this.buttons.push(button);
        
        // Ajouter un message d'information
        const info = this.createTemporaryElement('p', {
          style: {
            textAlign: 'center',
            color: '#666',
            fontSize: '14px',
            marginTop: '20px'
          },
          textContent: 'Paiement 100% sécurisé par PayPal'
        }, modal);
        
        console.log('✅ Bouton PayPal créé dans modal temporaire');
        return button;
        
      } else {
        throw new Error('Bouton PayPal non éligible');
      }

    } catch (error) {
      console.error('❌ Erreur création bouton:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Créer un formulaire de paiement alternatif (cartes bancaires)
   */
  async createAlternativePaymentForm(orderData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Créer la modal temporaire
      const modal = this.createTemporaryModal({
        title: 'Paiement par carte bancaire'
      });

      // Créer un conteneur pour les boutons de paiement
      this.temporaryElements.buttonContainer = this.createTemporaryElement('div', {
        id: 'paypal-cards-container-' + Date.now(),
        style: {
          margin: '20px 0'
        }
      }, modal);

      // Créer les boutons PayPal (tous les financements)
      const buttons = paypal.Buttons({
        fundingSource: undefined, // Affiche tous les moyens
        
        style: orderData.style || {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'checkout',
          height: 45
        },

        createOrder: async (data, actions) => {
          return this.createOrder(orderData);
        },

        onApprove: async (data, actions) => {
          const details = await actions.order.capture();
          
          if (this.onPaymentSuccess) {
            this.onPaymentSuccess(details);
          }
          
          setTimeout(() => {
            this.destroyTemporaryModal();
          }, 1000);
          
          return details;
        },

        onCancel: (data) => {
          if (this.onPaymentCancel) {
            this.onPaymentCancel(data);
          }
        },

        onError: (err) => {
          if (this.onPaymentError) {
            this.onPaymentError(err);
          }
        }
      });

      await buttons.render(`#${this.temporaryElements.buttonContainer.id}`);
      this.buttons.push(buttons);
      
      console.log('✅ Formulaire de paiement alternatif créé');
      return buttons;

    } catch (error) {
      console.error('❌ Erreur création formulaire:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Méthode utilitaire pour créer une commande
   */
  async createOrder(orderData) {
    if (this.onPaymentProcessing) {
      this.onPaymentProcessing();
    }

    if (orderData.serverUrl) {
      const response = await fetch(orderData.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: orderData.amount,
          currency: orderData.currency || this.currency,
          description: orderData.description || '',
          items: orderData.items || []
        })
      });

      const data = await response.json();
      return data.orderID;
    }

    // Création côté client par défaut
    return paypal.rest.payment.create({
      transactions: [{
        amount: {
          total: orderData.amount,
          currency: orderData.currency || this.currency
        }
      }]
    });
  }

  /**
   * Lancer un paiement PayPal simple
   */
  async startPaymentFlow(orderData) {
    try {
      // Initialiser PayPal
      await this.initialize();
      
      // Créer le bouton dans une modal
      await this.createTemporaryButton(orderData);
      
      return { 
        success: true, 
        message: 'Interface de paiement PayPal prête' 
      };
      
    } catch (error) {
      console.error('❌ Erreur démarrage paiement:', error);
      this.cleanupTemporaryElements();
      throw error;
    }
  }

  /**
   * Fermer le flux de paiement manuellement
   */
  closePaymentFlow() {
    this.destroyTemporaryModal();
  }

  /**
   * Détruire proprement toutes les ressources
   */
  destroy() {
    // Détruire la modal si elle existe
    this.destroyTemporaryModal();
    
    // Nettoyer tous les éléments temporaires
    this.cleanupTemporaryElements();
    
    // Réinitialiser l'état
    this.isInitialized = false;
    
    console.log('✅ PayPalPayment détruit proprement');
  }

  /**
   * Détruire avec callback
   */
  destroyWithCallback(onComplete) {
    this.destroy();
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }
}

// Méthodes statiques utilitaires
PayPalPayment.isPayPalSupported = function() {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' &&
         typeof paypal !== 'undefined';
};

PayPalPayment.getSupportedFundingSources = function() {
  if (typeof paypal === 'undefined') return [];
  
  return paypal.getFundingSources ? 
    paypal.getFundingSources().map(source => ({
      source: source,
      eligible: paypal.isFundingEligible ? paypal.isFundingEligible(source) : true
    })) : [];
};

export default PayPalPayment;