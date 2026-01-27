/**
 * FirebaseAuth - Utilitaire pour Firebase Authentication
 * 
 * @example
 * const firebaseAuth = new FirebaseAuth(firebaseCore);
 * await firebaseAuth.signUpWithEmail('user@example.com', 'password123');
 * await firebaseAuth.signInWithEmail('user@example.com', 'password123');
 * firebaseAuth.onAuthStateChanged((user) => console.log('User:', user));
 */
class FirebaseAuth {
  constructor(firebaseCore) {
    this.core = firebaseCore;
    this.auth = null;
    this.currentUser = null;
    this.authStateListeners = [];
  }

  /**
   * Initialiser Authentication
   */
  initialize() {
    if (!this.auth) {
      this.auth = this.core.getAuth();
    }
    return this.auth;
  }

  // ==================== EMAIL / PASSWORD ====================

  /**
   * Créer un compte avec email/mot de passe
   */
  async signUpWithEmail(email, password, displayName = null) {
    try {
      if (!this.auth) this.initialize();
      
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      
      // Mettre à jour le profil si displayName fourni
      if (displayName && userCredential.user) {
        await userCredential.user.updateProfile({ displayName });
      }

      // Envoyer email de vérification
      await userCredential.user.sendEmailVerification();

      this.currentUser = userCredential.user;
      
      return {
        success: true,
        user: this.formatUser(userCredential.user)
      };
    } catch (error) {
      console.error('❌ Erreur signUpWithEmail:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion avec email/mot de passe
   */
  async signInWithEmail(email, password) {
    try {
      if (!this.auth) this.initialize();
      
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      this.currentUser = userCredential.user;
      
      return {
        success: true,
        user: this.formatUser(userCredential.user)
      };
    } catch (error) {
      console.error('❌ Erreur signInWithEmail:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion anonyme
   */
  async signInAnonymously() {
    try {
      if (!this.auth) this.initialize();
      
      const userCredential = await this.auth.signInAnonymously();
      this.currentUser = userCredential.user;
      
      return {
        success: true,
        user: this.formatUser(userCredential.user)
      };
    } catch (error) {
      console.error('❌ Erreur signInAnonymously:', error);
      throw this.formatError(error);
    }
  }

  // ==================== SOCIAL AUTH ====================

  /**
   * Connexion avec Google
   */
  async signInWithGoogle() {
    try {
      if (!this.auth) this.initialize();
      
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await this.auth.signInWithPopup(provider);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user),
        credential: result.credential
      };
    } catch (error) {
      console.error('❌ Erreur signInWithGoogle:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion avec Facebook
   */
  async signInWithFacebook() {
    try {
      if (!this.auth) this.initialize();
      
      const provider = new firebase.auth.FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');
      
      const result = await this.auth.signInWithPopup(provider);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user),
        credential: result.credential
      };
    } catch (error) {
      console.error('❌ Erreur signInWithFacebook:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion avec Twitter
   */
  async signInWithTwitter() {
    try {
      if (!this.auth) this.initialize();
      
      const provider = new firebase.auth.TwitterAuthProvider();
      
      const result = await this.auth.signInWithPopup(provider);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user),
        credential: result.credential
      };
    } catch (error) {
      console.error('❌ Erreur signInWithTwitter:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion avec GitHub
   */
  async signInWithGithub() {
    try {
      if (!this.auth) this.initialize();
      
      const provider = new firebase.auth.GithubAuthProvider();
      provider.addScope('user');
      
      const result = await this.auth.signInWithPopup(provider);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user),
        credential: result.credential
      };
    } catch (error) {
      console.error('❌ Erreur signInWithGithub:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion avec Microsoft
   */
  async signInWithMicrosoft() {
    try {
      if (!this.auth) this.initialize();
      
      const provider = new firebase.auth.OAuthProvider('microsoft.com');
      
      const result = await this.auth.signInWithPopup(provider);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user),
        credential: result.credential
      };
    } catch (error) {
      console.error('❌ Erreur signInWithMicrosoft:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Connexion avec Apple
   */
  async signInWithApple() {
    try {
      if (!this.auth) this.initialize();
      
      const provider = new firebase.auth.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      const result = await this.auth.signInWithPopup(provider);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user),
        credential: result.credential
      };
    } catch (error) {
      console.error('❌ Erreur signInWithApple:', error);
      throw this.formatError(error);
    }
  }

  // ==================== PHONE AUTH ====================

  /**
   * Envoyer un code de vérification SMS
   */
  async sendPhoneVerification(phoneNumber, recaptchaContainerId) {
    try {
      if (!this.auth) this.initialize();
      
      // Créer le reCAPTCHA verifier
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          console.log('✅ reCAPTCHA résolu');
        }
      });

      const confirmationResult = await this.auth.signInWithPhoneNumber(
        phoneNumber,
        window.recaptchaVerifier
      );

      return {
        success: true,
        confirmationResult
      };
    } catch (error) {
      console.error('❌ Erreur sendPhoneVerification:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Vérifier le code SMS
   */
  async verifyPhoneCode(confirmationResult, code) {
    try {
      const result = await confirmationResult.confirm(code);
      this.currentUser = result.user;
      
      return {
        success: true,
        user: this.formatUser(result.user)
      };
    } catch (error) {
      console.error('❌ Erreur verifyPhoneCode:', error);
      throw this.formatError(error);
    }
  }

  // ==================== CUSTOM TOKEN ====================

  /**
   * Connexion avec custom token
   */
  async signInWithCustomToken(token) {
    try {
      if (!this.auth) this.initialize();
      
      const userCredential = await this.auth.signInWithCustomToken(token);
      this.currentUser = userCredential.user;
      
      return {
        success: true,
        user: this.formatUser(userCredential.user)
      };
    } catch (error) {
      console.error('❌ Erreur signInWithCustomToken:', error);
      throw this.formatError(error);
    }
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Envoyer email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email) {
    try {
      if (!this.auth) this.initialize();
      
      await this.auth.sendPasswordResetEmail(email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur sendPasswordResetEmail:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Confirmer la réinitialisation du mot de passe
   */
  async confirmPasswordReset(code, newPassword) {
    try {
      if (!this.auth) this.initialize();
      
      await this.auth.confirmPasswordReset(code, newPassword);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur confirmPasswordReset:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Changer le mot de passe
   */
  async updatePassword(newPassword) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      await user.updatePassword(newPassword);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur updatePassword:', error);
      throw this.formatError(error);
    }
  }

  // ==================== EMAIL MANAGEMENT ====================

  /**
   * Envoyer email de vérification
   */
  async sendEmailVerification() {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      await user.sendEmailVerification();
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur sendEmailVerification:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Vérifier le code de vérification d'email
   */
  async applyActionCode(code) {
    try {
      if (!this.auth) this.initialize();
      
      await this.auth.applyActionCode(code);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur applyActionCode:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Changer l'email
   */
  async updateEmail(newEmail) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      await user.updateEmail(newEmail);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur updateEmail:', error);
      throw this.formatError(error);
    }
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Mettre à jour le profil
   */
  async updateProfile(updates) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      await user.updateProfile(updates);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur updateProfile:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Supprimer le compte
   */
  async deleteAccount() {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      await user.delete();
      this.currentUser = null;
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur deleteAccount:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Ré-authentifier l'utilisateur
   */
  async reauthenticateWithEmail(email, password) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      const credential = firebase.auth.EmailAuthProvider.credential(email, password);
      await user.reauthenticateWithCredential(credential);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur reauthenticateWithEmail:', error);
      throw this.formatError(error);
    }
  }

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * Obtenir le token ID
   */
  async getIdToken(forceRefresh = false) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      const token = await user.getIdToken(forceRefresh);
      return token;
    } catch (error) {
      console.error('❌ Erreur getIdToken:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken() {
    return this.getIdToken(true);
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Écouter les changements d'état d'authentification
   */
  onAuthStateChanged(callback) {
    if (!this.auth) this.initialize();
    
    const unsubscribe = this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      callback(user ? this.formatUser(user) : null);
    });

    this.authStateListeners.push(unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Déconnexion
   */
  async signOut() {
    try {
      if (!this.auth) this.initialize();
      
      await this.auth.signOut();
      this.currentUser = null;
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur signOut:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    if (!this.auth) this.initialize();
    return this.auth.currentUser;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isSignedIn() {
    return this.getCurrentUser() !== null;
  }

  // ==================== LINKING ACCOUNTS ====================

  /**
   * Lier un compte email/password
   */
  async linkWithEmail(email, password) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      const credential = firebase.auth.EmailAuthProvider.credential(email, password);
      const result = await user.linkWithCredential(credential);
      
      
      return {
        success: true,
        user: this.formatUser(result.user)
      };
    } catch (error) {
      console.error('❌ Erreur linkWithEmail:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Délier un fournisseur
   */
  async unlinkProvider(providerId) {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      await user.unlink(providerId);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur unlinkProvider:', error);
      throw this.formatError(error);
    }
  }

  // ==================== HELPERS ====================

  /**
   * Formater l'objet utilisateur
   */
  formatUser(user) {
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      },
      providerId: user.providerId,
      providerData: user.providerData
    };
  }

  /**
   * Formater les erreurs
   */
  formatError(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'Cet email est déjà utilisé',
      'auth/invalid-email': 'Email invalide',
      'auth/operation-not-allowed': 'Opération non autorisée',
      'auth/weak-password': 'Mot de passe trop faible',
      'auth/user-disabled': 'Compte désactivé',
      'auth/user-not-found': 'Utilisateur introuvable',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard',
      'auth/network-request-failed': 'Erreur réseau',
      'auth/popup-closed-by-user': 'Popup fermée par l\'utilisateur',
      'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet email',
      'auth/requires-recent-login': 'Ré-authentification requise'
    };

    return {
      code: error.code,
      message: errorMessages[error.code] || error.message,
      originalError: error
    };
  }

  // ==================== CLEANUP ====================

  /**
   * Nettoyer les ressources
   */
  destroy() {
    this.authStateListeners.forEach(unsubscribe => unsubscribe());
    this.authStateListeners = [];
    this.auth = null;
    this.currentUser = null;
  }
}

export default FirebaseAuth;
