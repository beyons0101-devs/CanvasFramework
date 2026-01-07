/**
 * Moteur d'animation pour composants Canvas
 * Permet d'animer n'importe quelle propriété d'un composant sans le modifier
 * @class
 * @property {Map} animations - Liste des animations actives
 * @property {boolean} isRunning - Indique si le moteur tourne
 */
class AnimationEngine {
  constructor() {
    this.animations = new Map();
    this.isRunning = false;
    this.animationFrameId = null;
  }

  /**
   * Anime une propriété d'un composant
   * @param {Component} component - Composant à animer
   * @param {Object} options - Options d'animation
   * @param {Object} options.from - Valeurs de départ {x: 0, y: 0, ...}
   * @param {Object} options.to - Valeurs d'arrivée {x: 100, y: 200, ...}
   * @param {number} options.duration - Durée en ms (défaut: 300)
   * @param {string} options.easing - Fonction d'easing (défaut: 'easeInOutQuad')
   * @param {number} options.delay - Délai avant démarrage en ms (défaut: 0)
   * @param {Function} options.onUpdate - Callback à chaque frame
   * @param {Function} options.onComplete - Callback à la fin
   * @param {boolean} options.loop - Boucler l'animation (défaut: false)
   * @param {boolean} options.yoyo - Retour inverse (défaut: false)
   * @returns {string} ID de l'animation
   */
  animate(component, options = {}) {
    const animationId = this.generateId();
    
    const animation = {
      id: animationId,
      component,
      from: options.from || {},
      to: options.to || {},
      duration: options.duration || 300,
      easing: options.easing || 'easeInOutQuad',
      delay: options.delay || 0,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      loop: options.loop || false,
      yoyo: options.yoyo || false,
      
      // État interne
      startTime: null,
      delayStartTime: null,
      progress: 0,
      isDelaying: options.delay > 0,
      isReversed: false,
      originalValues: {}
    };

    // Sauvegarder les valeurs originales
    for (let prop in animation.to) {
      if (animation.from[prop] === undefined) {
        animation.from[prop] = component[prop];
      }
      animation.originalValues[prop] = component[prop];
    }

    this.animations.set(animationId, animation);
    
    if (!this.isRunning) {
      this.start();
    }

    return animationId;
  }

  /**
   * Anime plusieurs propriétés en séquence
   * @param {Component} component - Composant à animer
   * @param {Array} sequence - Tableau d'options d'animation
   * @returns {Promise} Promesse résolue à la fin de la séquence
   */
  async animateSequence(component, sequence) {
    for (let options of sequence) {
      await new Promise(resolve => {
        this.animate(component, {
          ...options,
          onComplete: () => {
            if (options.onComplete) options.onComplete();
            resolve();
          }
        });
      });
    }
  }

  /**
   * Anime plusieurs composants en parallèle
   * @param {Array} animations - Tableau de {component, options}
   * @returns {Promise} Promesse résolue quand toutes sont finies
   */
  async animateParallel(animations) {
    const promises = animations.map(({component, options}) => {
      return new Promise(resolve => {
        this.animate(component, {
          ...options,
          onComplete: () => {
            if (options.onComplete) options.onComplete();
            resolve();
          }
        });
      });
    });
    
    return Promise.all(promises);
  }

  /**
   * Crée une animation de rebond
   * @param {Component} component - Composant
   * @param {Object} options - Options
   */
  bounce(component, options = {}) {
    const originalY = component.y;
    const height = options.height || 50;
    
    return this.animate(component, {
      from: { y: originalY },
      to: { y: originalY - height },
      duration: options.duration || 400,
      easing: 'easeOutQuad',
      yoyo: true,
      onComplete: options.onComplete
    });
  }

  /**
   * Crée une animation de shake (tremblement)
   * @param {Component} component - Composant
   * @param {Object} options - Options
   */
  shake(component, options = {}) {
    const originalX = component.x;
    const intensity = options.intensity || 10;
    const shakes = options.shakes || 4;
    const duration = options.duration || 400;
    
    const sequence = [];
    for (let i = 0; i < shakes; i++) {
      sequence.push({
        to: { x: originalX + (i % 2 === 0 ? intensity : -intensity) },
        duration: duration / (shakes * 2),
        easing: 'linear'
      });
    }
    sequence.push({
      to: { x: originalX },
      duration: duration / (shakes * 2),
      easing: 'linear',
      onComplete: options.onComplete
    });
    
    return this.animateSequence(component, sequence);
  }

  /**
   * Crée une animation de pulsation (scale)
   * @param {Component} component - Composant
   * @param {Object} options - Options
   */
  pulse(component, options = {}) {
    const originalWidth = component.width;
    const originalHeight = component.height;
    const scale = options.scale || 1.1;
    
    return this.animate(component, {
      from: { 
        width: originalWidth, 
        height: originalHeight 
      },
      to: { 
        width: originalWidth * scale, 
        height: originalHeight * scale 
      },
      duration: options.duration || 300,
      easing: 'easeInOutQuad',
      yoyo: true,
      loop: options.loop || false,
      onComplete: options.onComplete
    });
  }

  /**
   * Crée une animation de fade (opacité)
   * @param {Component} component - Composant
   * @param {Object} options - Options
   */
  fade(component, options = {}) {
    // Ajouter une propriété opacity si elle n'existe pas
    if (component.opacity === undefined) {
      component.opacity = 1;
    }
    
    return this.animate(component, {
      from: { opacity: options.from !== undefined ? options.from : component.opacity },
      to: { opacity: options.to !== undefined ? options.to : 0 },
      duration: options.duration || 300,
      easing: options.easing || 'linear',
      onComplete: options.onComplete
    });
  }

  /**
   * Crée une animation de slide (glissement)
   * @param {Component} component - Composant
   * @param {Object} options - Options
   */
  slide(component, options = {}) {
    return this.animate(component, {
      from: options.from || { x: component.x, y: component.y },
      to: options.to || { x: component.x + 100, y: component.y },
      duration: options.duration || 400,
      easing: options.easing || 'easeOutQuad',
      onComplete: options.onComplete
    });
  }

  /**
   * Crée une animation de rotation
   * @param {Component} component - Composant
   * @param {Object} options - Options
   */
  rotate(component, options = {}) {
    if (component.rotation === undefined) {
      component.rotation = 0;
    }
    
    return this.animate(component, {
      from: { rotation: options.from !== undefined ? options.from : component.rotation },
      to: { rotation: options.to !== undefined ? options.to : 360 },
      duration: options.duration || 1000,
      easing: options.easing || 'linear',
      loop: options.loop || false,
      onComplete: options.onComplete
    });
  }

  /**
   * Arrête une animation
   * @param {string} animationId - ID de l'animation
   */
  stop(animationId) {
    this.animations.delete(animationId);
    
    if (this.animations.size === 0) {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  /**
   * Arrête toutes les animations d'un composant
   * @param {Component} component - Composant
   */
  stopAll(component) {
    const toDelete = [];
    
    for (let [id, anim] of this.animations) {
      if (anim.component === component) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.stop(id));
  }

  /**
   * Démarre le moteur d'animation
   * @private
   */
  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.update();
  }

  /**
   * Met à jour toutes les animations
   * @private
   */
  update() {
    const currentTime = performance.now();
    const toDelete = [];

    for (let [id, anim] of this.animations) {
      // Gérer le délai
      if (anim.isDelaying) {
        if (!anim.delayStartTime) {
          anim.delayStartTime = currentTime;
        }
        
        if (currentTime - anim.delayStartTime >= anim.delay) {
          anim.isDelaying = false;
          anim.startTime = currentTime;
        }
        continue;
      }

      // Initialiser le temps de départ
      if (!anim.startTime) {
        anim.startTime = currentTime;
      }

      // Calculer la progression
      const elapsed = currentTime - anim.startTime;
      let progress = Math.min(elapsed / anim.duration, 1);

      // Appliquer l'easing
      const easedProgress = this.applyEasing(progress, anim.easing);

      // Inverser si yoyo
      const actualProgress = anim.isReversed ? 1 - easedProgress : easedProgress;

      // Mettre à jour les propriétés du composant
      for (let prop in anim.to) {
        const from = anim.from[prop];
        const to = anim.to[prop];
        const value = from + (to - from) * actualProgress;
        anim.component[prop] = value;
      }

      // Callback onUpdate
      if (anim.onUpdate) {
        anim.onUpdate(actualProgress);
      }

      // Animation terminée
      if (progress >= 1) {
        if (anim.yoyo && !anim.isReversed) {
          // Inverser pour le yoyo
          anim.isReversed = true;
          anim.startTime = currentTime;
        } else if (anim.loop) {
          // Recommencer
          anim.startTime = currentTime;
          anim.isReversed = false;
        } else {
          // Terminer
          if (anim.onComplete) {
            anim.onComplete();
          }
          toDelete.push(id);
        }
      }
    }

    // Nettoyer les animations terminées
    toDelete.forEach(id => this.stop(id));

    // Continuer l'animation
    if (this.animations.size > 0) {
      this.animationFrameId = requestAnimationFrame(() => this.update());
    } else {
      this.isRunning = false;
    }
  }

  /**
   * Applique une fonction d'easing
   * @param {number} t - Progression (0-1)
   * @param {string} easingName - Nom de l'easing
   * @returns {number} Valeur easée
   * @private
   */
  applyEasing(t, easingName) {
    const easings = {
      linear: t => t,
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeInCubic: t => t * t * t,
      easeOutCubic: t => (--t) * t * t + 1,
      easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      easeInQuart: t => t * t * t * t,
      easeOutQuart: t => 1 - (--t) * t * t * t,
      easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
      easeInElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
      },
      easeOutElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      },
      easeOutBounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        else return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
    };

    return (easings[easingName] || easings.linear)(t);
  }

  /**
   * Génère un ID unique
   * @returns {string} ID unique
   * @private
   */
  generateId() {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Nettoie toutes les animations
   */
  clear() {
    this.animations.clear();
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

export default AnimationEngine;