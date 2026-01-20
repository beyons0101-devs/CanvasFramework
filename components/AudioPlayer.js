import Component from '../core/Component.js';

/**
 * Lecteur audio avec gestion directe des événements
 * @class
 * @extends Component
 */
class AudioPlayer extends Component {
  constructor(framework, options = {}) {
    super(framework, options);
    this.src = options.src || '';
    this.playing = false;
    this.platform = framework.platform;
    this.showControls = true;
    this.controlsTimeout = null;
    this.currentTime = 0;
    this.duration = 0;
    this.progress = 0;
    this.volume = 1;
    this.showVolume = false;
    this.loaded = false;
    this.isLoading = false;
    this.userInteracted = false;

    // Élément audio HTML caché
    this.audioElement = null;

    // Gestion directe des événements
    this.canvas = framework.canvas;
    this.isMouseDownOnPlayer = false;
    this.clickStartTime = 0;
    this.clickThreshold = 200; // ms

    this.controlsHeight = 50;

    // Callbacks
    this.onPlay = options.onPlay;
    this.onPause = options.onPause;
    this.onEnded = options.onEnded;

    // NE PAS utiliser les handlers du framework
    this.onPress = null;
    this.onMove = null;
    this.onRelease = null;

    // Attacher les événements directement au canvas
    this.setupDirectEventListeners();

    // Initialiser l'audio
    this.initAudio();
  }

  setupDirectEventListeners() {
    // Stocker les listeners originaux pour pouvoir les retirer plus tard
    this.originalListeners = {
      mousedown: this.canvas.onmousedown,
      mouseup: this.canvas.onmouseup,
      mousemove: this.canvas.onmousemove,
      touchstart: this.canvas.ontouchstart,
      touchend: this.canvas.ontouchend,
      touchmove: this.canvas.ontouchmove
    };

    // Attacher nos propres handlers
    this.canvas.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleCanvasMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
    
    this.canvas.addEventListener('touchstart', this.handleCanvasTouchStart.bind(this));
    this.canvas.addEventListener('touchend', this.handleCanvasTouchEnd.bind(this));
    this.canvas.addEventListener('touchmove', this.handleCanvasTouchMove.bind(this));
  }

  removeDirectEventListeners() {
    // Retirer nos listeners
    this.canvas.removeEventListener('mousedown', this.handleCanvasMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleCanvasMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
    
    this.canvas.removeEventListener('touchstart', this.handleCanvasTouchStart);
    this.canvas.removeEventListener('touchend', this.handleCanvasTouchEnd);
    this.canvas.removeEventListener('touchmove', this.handleCanvasTouchMove);

    // Restaurer les listeners originaux
    Object.keys(this.originalListeners).forEach(event => {
      if (this.originalListeners[event]) {
        this.canvas[`on${event}`] = this.originalListeners[event];
      }
    });
  }

  handleCanvasMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPointInside(x, y)) {
      e.stopPropagation();
      this.isMouseDownOnPlayer = true;
      this.clickStartTime = Date.now();
      this.handleInteraction(x, y, 'start');
      return true; // Empêche la propagation au framework
    }
  }

  handleCanvasMouseUp(e) {
    if (!this.isMouseDownOnPlayer) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickDuration = Date.now() - this.clickStartTime;
    
    if (clickDuration < this.clickThreshold && this.isPointInside(x, y)) {
      e.stopPropagation();
      this.handleInteraction(x, y, 'end');
    }
    
    this.isMouseDownOnPlayer = false;
    return true; // Empêche la propagation au framework
  }

  handleCanvasMouseMove(e) {
    if (!this.isMouseDownOnPlayer) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (this.isPointInside(x, y)) {
      e.stopPropagation();
      this.handleInteraction(x, y, 'move');
      return true;
    }
  }

  handleCanvasTouchStart(e) {
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (this.isPointInside(x, y)) {
      e.stopPropagation();
      e.preventDefault();
      this.isMouseDownOnPlayer = true;
      this.clickStartTime = Date.now();
      this.handleInteraction(x, y, 'start');
      return true;
    }
  }

  handleCanvasTouchEnd(e) {
    if (!this.isMouseDownOnPlayer) return;

    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const clickDuration = Date.now() - this.clickStartTime;
    
    if (clickDuration < this.clickThreshold && this.isPointInside(x, y)) {
      e.stopPropagation();
      e.preventDefault();
      this.handleInteraction(x, y, 'end');
    }
    
    this.isMouseDownOnPlayer = false;
    return true;
  }

  handleCanvasTouchMove(e) {
    if (!this.isMouseDownOnPlayer) return;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (this.isPointInside(x, y)) {
      e.stopPropagation();
      e.preventDefault();
      this.handleInteraction(x, y, 'move');
      return true;
    }
  }

  handleInteraction(x, y, type) {
    // Ajuster les coordonnées pour le scrolling
    const adjustedY = y - this.framework.scrollOffset;

    // Afficher les contrôles
    this.showControls = true;
    this.showControlsTemporarily();

    // Marquer l'interaction utilisateur
    if (!this.userInteracted) {
      this.userInteracted = true;
      this.showInteractionMessage = false;
    }

    // Calculer la position relative
    const localX = x - this.x;
    const localY = adjustedY - this.y;

    // Bouton play/pause central
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    const buttonSize = 40;
    const isInButton = localX >= centerX - buttonSize && localX <= centerX + buttonSize &&
                       localY >= centerY - buttonSize && localY <= centerY + buttonSize;

    // Barre de progression
    const progressBarY = this.height - 30;
    const isInProgressBar = this.showControls && this.loaded &&
                            localY >= progressBarY && localY <= progressBarY + 15;

    // Traiter selon le type d'événement
    switch (type) {
      case 'start':
        // Marquer le début du clic
        break;

      case 'move':
        if (isInProgressBar) {
          const newProgress = Math.max(0, Math.min(100, (localX / this.width) * 100));
          this.seekTo((this.duration * newProgress) / 100);
        }
        break;

      case 'end':
        // Bouton play/pause
        if (isInButton) {
          console.log('AudioPlayer: Bouton cliqué (gestion directe)');
          if (!this.loaded && !this.isLoading) {
            this.initAudio();
          } else if (this.loaded) {
            this.togglePlay();
          }
        }
        break;
    }
  }

  initAudio() {
    if (!this.src) {
      console.warn('AudioPlayer: Pas de source audio fournie');
      return;
    }

    console.log('AudioPlayer: Initialisation de l\'audio:', this.src);
    
    this.isLoading = true;
    
    try {
      // Créer l'élément audio
      this.audioElement = document.createElement('audio');
      this.audioElement.src = this.src;
      this.audioElement.preload = 'auto';
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.style.display = 'none';
      this.audioElement.style.position = 'absolute';
      this.audioElement.style.left = '-9999px';
      
      this.audioElement.autoplay = false;
      this.audioElement.controls = false;
      
      document.body.appendChild(this.audioElement);

      // Événements de l'audio
      this.audioElement.addEventListener('loadedmetadata', () => {
        console.log('AudioPlayer: Métadonnées chargées');
        this.duration = this.audioElement.duration;
        this.loaded = true;
        this.isLoading = false;
      });

      this.audioElement.addEventListener('timeupdate', () => {
        this.currentTime = this.audioElement.currentTime;
        this.progress = (this.currentTime / this.duration) * 100;
      });

      this.audioElement.addEventListener('ended', () => {
        console.log('AudioPlayer: Audio terminé');
        this.playing = false;
        if (this.onEnded) this.onEnded();
      });

      this.audioElement.addEventListener('play', () => {
        console.log('AudioPlayer: Lecture démarrée');
        this.playing = true;
        if (this.onPlay) this.onPlay();
      });

      this.audioElement.addEventListener('pause', () => {
        console.log('AudioPlayer: Lecture en pause');
        this.playing = false;
        if (this.onPause) this.onPause();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.error('AudioPlayer: Erreur audio:', e);
        this.isLoading = false;
        this.loaded = false;
      });

      this.audioElement.addEventListener('canplaythrough', () => {
        console.log('AudioPlayer: Prêt à jouer');
        this.loaded = true;
        this.isLoading = false;
      });

      // Démarrer le chargement
      this.audioElement.load();

    } catch (error) {
      console.error('AudioPlayer: Erreur d\'initialisation:', error);
      this.isLoading = false;
      this.loaded = false;
    }
  }

  play() {
    if (!this.loaded || !this.audioElement) {
      console.log('AudioPlayer: Impossible de jouer - pas chargé');
      return;
    }

    // Vérifier l'interaction utilisateur
    if (!this.userInteracted) {
      console.log('AudioPlayer: Attente interaction utilisateur...');
      this.showInteractionMessage = true;
      setTimeout(() => {
        this.showInteractionMessage = false;
      }, 2000);
      return;
    }

    console.log('AudioPlayer: Lancement de la lecture');
    
    const playPromise = this.audioElement.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('AudioPlayer: Lecture réussie');
          this.playing = true;
          this.showControlsTemporarily();
        })
        .catch(error => {
          console.error('AudioPlayer: Erreur de lecture:', error);
          this.playing = false;
          
          if (error.name === 'NotAllowedError') {
            console.log('AudioPlayer: Interaction nécessaire');
            this.userInteracted = false;
          }
        });
    }
  }

  pause() {
    if (!this.playing || !this.audioElement) return;
    
    console.log('AudioPlayer: Mise en pause');
    this.audioElement.pause();
    this.playing = false;
    this.showControlsTemporarily();
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.playing = false;
    this.currentTime = 0;
    this.progress = 0;
  }

  togglePlay() {
    console.log('AudioPlayer: togglePlay - état actuel:', this.playing);
    
    if (!this.loaded) {
      console.log('AudioPlayer: Pas encore chargé');
      if (!this.isLoading) {
        this.initAudio();
      }
      return;
    }

    if (!this.userInteracted) {
      console.log('AudioPlayer: Interaction utilisateur déclenchée');
      this.userInteracted = true;
      this.showInteractionMessage = false;
    }

    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  seekTo(time) {
    if (!this.loaded || !this.audioElement) return;
    
    const wasPlaying = this.playing;
    
    if (wasPlaying) {
      this.audioElement.pause();
    }
    
    const newTime = Math.max(0, Math.min(time, this.duration));
    this.audioElement.currentTime = newTime;
    this.currentTime = newTime;
    this.progress = (this.currentTime / this.duration) * 100;
    
    if (wasPlaying) {
      this.audioElement.play().catch(e => {
        console.error('AudioPlayer: Erreur reprise après seek:', e);
      });
    }
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  showControlsTemporarily() {
    this.showControls = true;
    clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      if (this.playing) this.showControls = false;
    }, 3000);
  }

  update(deltaTime) {
    // Mise à jour automatique via timeupdate
  }

  draw(ctx) {
    ctx.save();

    // Fond du lecteur
    ctx.fillStyle = '#111111';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Message d'interaction
    if (this.showInteractionMessage) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Cliquez pour activer l\'audio', this.x + this.width / 2, this.y + this.height / 2);
      ctx.restore();
      return;
    }

    // Indicateur de chargement
    if (this.isLoading) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Chargement...', this.x + this.width / 2, this.y + this.height / 2);
      ctx.restore();
      return;
    }

    // Indicateur si non chargé
    if (!this.loaded && !this.isLoading) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Audio non disponible', this.x + this.width / 2, this.y + this.height / 2);
      ctx.restore();
      return;
    }

    // Bouton play/pause
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    if (!this.playing || this.showControls) {
      // Cercle de fond
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.fill();

      // Icône
      ctx.fillStyle = '#FFFFFF';
      if (this.playing) {
        // Icône pause
        const barWidth = 8;
        const barHeight = 30;
        const gap = 5;
        
        ctx.fillRect(centerX - barWidth - gap/2, centerY - barHeight/2, barWidth, barHeight);
        ctx.fillRect(centerX + gap/2, centerY - barHeight/2, barWidth, barHeight);
      } else {
        // Icône play
        const triangleSize = 25;
        ctx.beginPath();
        ctx.moveTo(centerX - triangleSize/2, centerY - triangleSize);
        ctx.lineTo(centerX - triangleSize/2, centerY + triangleSize);
        ctx.lineTo(centerX + triangleSize, centerY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Contrôles en bas
    if (this.showControls && this.loaded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(this.x, this.y + this.height - this.controlsHeight, this.width, this.controlsHeight);

      const progressX = this.x + 15;
      const progressY = this.y + this.height - 25;
      const progressWidth = this.width - 30;

      // Barre de progression
      ctx.fillStyle = '#555555';
      ctx.fillRect(progressX, progressY, progressWidth, 6);
      ctx.fillStyle = '#333333';
      ctx.fillRect(progressX, progressY, progressWidth, 2);

      // Progression actuelle
      ctx.fillStyle = '#FF4444';
      const currentProgressWidth = (progressWidth * this.progress) / 100;
      ctx.fillRect(progressX, progressY, currentProgressWidth, 6);
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(progressX, progressY, currentProgressWidth, 2);

      // Curseur
      if (currentProgressWidth > 0) {
        const thumbX = progressX + currentProgressWidth;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(thumbX, progressY + 3, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Temps
      const currentTimeStr = this.formatTime(this.currentTime);
      const totalTimeStr = this.formatTime(this.duration);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(currentTimeStr, this.x + 15, this.y + this.height - 35);

      ctx.textAlign = 'right';
      ctx.fillText(totalTimeStr, this.x + this.width - 15, this.y + this.height - 35);
    }

    ctx.restore();
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) {
      return "0:00";
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  isPointInside(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    return x >= this.x && x <= this.x + this.width &&
           adjustedY >= this.y && adjustedY <= this.y + this.height;
  }

  remove() {
    // Arrêter la lecture
    this.stop();
    
    // Retirer les event listeners
    this.removeDirectEventListeners();
    
    // Supprimer l'élément audio
    if (this.audioElement && this.audioElement.parentNode) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
      this.audioElement.parentNode.removeChild(this.audioElement);
      this.audioElement = null;
    }
    
    // Nettoyer le timeout
    clearTimeout(this.controlsTimeout);
    
    console.log('AudioPlayer: Nettoyé et supprimé');
  }
}

export default AudioPlayer;