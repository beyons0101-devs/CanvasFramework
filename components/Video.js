import Component from '../core/Component.js';
/**
 * Lecteur vidéo
 * @class
 * @extends Component
 * @property {string} src - URL de la vidéo
 * @property {string} poster - URL de l'image d'affiche
 * @property {boolean} playing - En cours de lecture
 * @property {string} platform - Plateforme
 * @property {boolean} showControls - Afficher les contrôles
 * @property {number|null} controlsTimeout - Timeout des contrôles
 * @property {number} currentTime - Temps actuel
 * @property {number} duration - Durée totale
 * @property {number} progress - Progression (0-100)
 * @property {number} volume - Volume (0-1)
 * @property {boolean} showVolume - Afficher le contrôle de volume
 * @property {boolean} fullscreen - Plein écran
 * @property {boolean} loaded - Vidéo chargée
 * @property {HTMLVideoElement} videoElement - Élément vidéo HTML
 * @property {number} controlsHeight - Hauteur des contrôles
 * @property {number} volumeHeight - Hauteur du contrôle de volume
 * @property {Function} onPlay - Callback à la lecture
 * @property {Function} onPause - Callback à la pause
 * @property {Function} onEnded - Callback à la fin
 * @property {Function} onFullscreen - Callback au plein écran
 */
class Video extends Component {
  /**
   * Crée une instance de Video
   * @param {CanvasFramework} framework - Framework parent
   * @param {Object} [options={}] - Options de configuration
   * @param {string} [options.src=''] - URL de la vidéo
   * @param {string} [options.poster=''] - URL de l'image d'affiche
   * @param {boolean} [options.playing=false] - Lecture initiale
   * @param {boolean} [options.showControls=true] - Afficher les contrôles
   * @param {Function} [options.onPlay] - Callback à la lecture
   * @param {Function} [options.onPause] - Callback à la pause
   * @param {Function} [options.onEnded] - Callback à la fin
   * @param {Function} [options.onFullscreen] - Callback au plein écran
   */
  constructor(framework, options = {}) {
    super(framework, options);
    this.src = options.src || '';
    this.poster = options.poster || '';
    this.playing = false;
    this.platform = framework.platform;
    this.showControls = true;
    this.controlsTimeout = null;
    this.currentTime = 0;
    this.duration = 0;
    this.progress = 0;
    this.volume = 1;
    this.showVolume = false;
    this.fullscreen = false;
    this.loaded = false;
    
    // Éléments de contrôle
    this.controlsHeight = 50;
    this.volumeHeight = 100;
    
    // Créer l'élément vidéo HTML5
    this.videoElement = document.createElement('video');
    this.videoElement.style.position = 'fixed';
    this.videoElement.style.left = '-9999px'; // Caché
    this.videoElement.style.top = '-9999px';
    this.videoElement.style.width = '0';
    this.videoElement.style.height = '0';
    this.videoElement.src = this.src;
    this.videoElement.poster = this.poster;
    this.videoElement.preload = 'auto';
    this.videoElement.crossOrigin = 'anonymous'; // Important pour les vidéos externes
    this.videoElement.controls = false; // Nous gérons nos propres contrôles
    
    document.body.appendChild(this.videoElement);
    
    // Événements de la vidéo
    this.videoElement.addEventListener('loadedmetadata', () => {
      this.duration = this.videoElement.duration;
      this.loaded = true;
    });
    
    this.videoElement.addEventListener('timeupdate', () => {
      this.currentTime = this.videoElement.currentTime;
      this.progress = (this.currentTime / this.duration) * 100;
    });
    
    this.videoElement.addEventListener('ended', () => {
      this.playing = false;
      if (this.onEnded) this.onEnded();
    });
    
    this.videoElement.addEventListener('play', () => {
      this.playing = true;
      if (this.onPlay) this.onPlay();
    });
    
    this.videoElement.addEventListener('pause', () => {
      this.playing = false;
      if (this.onPause) this.onPause();
    });
    
    // Événements
    this.onPlay = options.onPlay;
    this.onPause = options.onPause;
    this.onEnded = options.onEnded;
    this.onFullscreen = options.onFullscreen;
    
    // Définir onPress pour les contrôles
    this.onPress = this.handlePress.bind(this);
    this.onMove = this.handleMove.bind(this);
  }

  /**
   * Démarre la lecture
   */
  play() {
    if (this.videoElement) {
      this.videoElement.play();
      this.playing = true;
      this.showControlsTemporarily();
    }
  }

  /**
   * Met en pause
   */
  pause() {
    if (this.videoElement) {
      this.videoElement.pause();
      this.playing = false;
      this.showControlsTemporarily();
    }
  }

  /**
   * Alterne lecture/pause
   */
  togglePlay() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Affiche temporairement les contrôles
   * @private
   */
  showControlsTemporarily() {
    this.showControls = true;
    clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      if (this.playing) {
        this.showControls = false;
      }
    }, 3000);
  }

  /**
   * Gère la pression (clic)
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handlePress(x, y) {
    const adjustedY = y - this.framework.scrollOffset;
    
    // Montrer les contrôles
    this.showControls = true;
    this.showControlsTemporarily();
    
    // Bouton play/pause central
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    if (x >= centerX - 30 && x <= centerX + 30 &&
        adjustedY >= centerY - 30 && adjustedY <= centerY + 30) {
      this.togglePlay();
      return;
    }
    
    // Barre de progression
    if (this.showControls && this.loaded) {
      const progressBarY = this.y + this.height - 30;
      if (adjustedY >= progressBarY && adjustedY <= progressBarY + 10) {
        const clickX = x - this.x;
        this.progress = (clickX / this.width) * 100;
        this.currentTime = (this.duration * this.progress) / 100;
        if (this.videoElement) {
          this.videoElement.currentTime = this.currentTime;
        }
        return;
      }
    }
    
    // Bouton plein écran
    const fullscreenX = this.x + this.width - 40;
    const fullscreenY = this.y + this.height - 40;
    
    if (x >= fullscreenX && x <= fullscreenX + 30 &&
        adjustedY >= fullscreenY && adjustedY <= fullscreenY + 30) {
      this.toggleFullscreen();
      return;
    }
  }

  /**
   * Gère le mouvement
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @private
   */
  handleMove(x, y) {
    // Pour des interactions supplémentaires
  }

  /**
   * Alterne le plein écran
   */
  toggleFullscreen() {
    if (!document.fullscreenElement && this.videoElement.requestFullscreen) {
      this.videoElement.requestFullscreen();
      this.fullscreen = true;
      if (this.onFullscreen) this.onFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      this.fullscreen = false;
      if (this.onFullscreen) this.onFullscreen(false);
    }
  }

  /**
   * Dessine le lecteur vidéo
   * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
   */
  draw(ctx) {
    ctx.save();
    
    try {
      // Dessiner la vidéo sur le canvas
      if (this.loaded && this.videoElement.readyState >= 2) {
        ctx.drawImage(this.videoElement, this.x, this.y, this.width, this.height);
      } else {
        // Affichage de chargement
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Chargement de la vidéo...', 
          this.x + this.width/2, this.y + this.height/2);
      }
    } catch (error) {
      // En cas d'erreur CORS ou autre
      ctx.fillStyle = '#000000';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Vidéo: ' + (this.src.substring(0, 30) + '...'), 
        this.x + this.width/2, this.y + this.height/2 - 10);
      ctx.fillText('Cliquez pour lire', 
        this.x + this.width/2, this.y + this.height/2 + 10);
    }
    
    // Overlay sombre quand en pause
    if (!this.playing || this.showControls) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    // Bouton play/pause au centre (quand pause ou contrôles visibles)
    if (!this.playing || this.showControls) {
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      
      // Fond rond pour le bouton
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // Icône play/pause
      ctx.fillStyle = '#FFFFFF';
      if (this.playing) {
        // Icône pause
        ctx.fillRect(centerX - 8, centerY - 15, 6, 30);
        ctx.fillRect(centerX + 2, centerY - 15, 6, 30);
      } else {
        // Icône play (triangle)
        ctx.beginPath();
        ctx.moveTo(centerX - 5, centerY - 15);
        ctx.lineTo(centerX - 5, centerY + 15);
        ctx.lineTo(centerX + 20, centerY);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // Contrôles en bas
    if (this.showControls && this.loaded) {
      // Overlay pour les contrôles
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(this.x, this.y + this.height - this.controlsHeight, 
                   this.width, this.controlsHeight);
      
      // Barre de progression
      const progressX = this.x + 10;
      const progressY = this.y + this.height - 25;
      const progressWidth = this.width - 60; // Réduit pour laisser place au bouton plein écran
      
      // Fond de la barre
      ctx.fillStyle = '#555555';
      ctx.fillRect(progressX, progressY, progressWidth, 4);
      
      // Progression actuelle
      ctx.fillStyle = '#FF0000';
      const currentProgressWidth = (progressWidth * this.progress) / 100;
      ctx.fillRect(progressX, progressY, currentProgressWidth, 4);
      
      // Curseur de progression
      const thumbX = progressX + currentProgressWidth;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(thumbX, progressY + 2, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Temps
      const currentTimeStr = this.formatTime(this.currentTime);
      const totalTimeStr = this.formatTime(this.duration);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(currentTimeStr, this.x + 10, this.y + this.height - 35);
      
      ctx.textAlign = 'right';
      ctx.fillText(totalTimeStr, this.x + progressWidth + 10, this.y + this.height - 35);
      
      // Bouton plein écran
      const fullscreenX = this.x + this.width - 40;
      const fullscreenY = this.y + this.height - 40;
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(fullscreenX, fullscreenY, 20, 20);
      ctx.beginPath();
      ctx.moveTo(fullscreenX + 5, fullscreenY + 5);
      ctx.lineTo(fullscreenX + 5, fullscreenY + 15);
      ctx.lineTo(fullscreenX + 15, fullscreenY + 15);
      ctx.lineTo(fullscreenX + 15, fullscreenY + 5);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Formate un temps en minutes:secondes
   * @param {number} seconds - Secondes
   * @returns {string} Temps formaté
   * @private
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  /**
   * Vérifie si un point est dans les limites
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @returns {boolean} True si le point est dans le lecteur
   */
  isPointInside(x, y) {
    // Le VideoPlayer est cliquable pour les contrôles
    return x >= this.x && x <= this.x + this.width && 
           y >= this.y && y <= this.y + this.height;
  }
  
  /**
   * Nettoie l'élément vidéo du DOM
   */
  remove() {
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
  }
}

export default Video;