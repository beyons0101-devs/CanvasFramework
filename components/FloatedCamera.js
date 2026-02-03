import Component from '../core/Component.js';

/**
 * Composant FloatedCamera autonome avec gestion directe des clics/touches
 * Modes : contain (tout visible + bandes), cover (remplit + crop), fit (centre sans crop)
 */
class FloatedCamera extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.facingMode = options.facingMode || 'environment';
    this.autoStart = options.autoStart !== false;
    this.onPhoto = options.onPhoto || null;

    this.fitModes = ['contain', 'cover'];
    this.currentFitModeIndex = 0;
    this.fitMode = this.fitModes[this.currentFitModeIndex];

    this.stream = null;
    this.video = null;
    this.loaded = false;
    this.error = null;

    this.showControls = true;
    this.torchSupported = false;
    this.torchOn = false;
    this.captureButtonRadius = 35;
    this.modeButtonSize = 40;

    // Feedback capture
    this.flashTimer = null;
    this.previewPhoto = null; // dataUrl dernière photo
    this.previewTimeout = null;

    this.isStarting = false;
  }

  async _mount() {
    super._mount?.();

    // Redémarrage auto si besoin
    if (this.autoStart && !this.stream && !this.isStarting) {
      this.isStarting = true;
      await this.startCamera();
      this.isStarting = false;
    }

    this.setupEventListeners();
  }

  destroy() {
    this.removeEventListeners();
    this.stopCamera();
    if (this.flashTimer) clearTimeout(this.flashTimer);
    if (this.previewTimeout) clearTimeout(this.previewTimeout);
    super.destroy?.();
  }

  // Écoute directe (indépendante du framework)
  setupEventListeners() {
    this.onTouchStart = this.handleTouchStart.bind(this);
    this.onTouchMove = this.handleTouchMove.bind(this);
    this.onTouchEnd = this.handleTouchEnd.bind(this);
    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);

    const canvas = this.framework.canvas;
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  removeEventListeners() {
    const canvas = this.framework.canvas;
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    canvas.removeEventListener('touchend', this.onTouchEnd);
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
  }

  // Coordonnées locales
  getLocalPos(clientX, clientY) {
    const rect = this.framework.canvas.getBoundingClientRect();
    const globalX = clientX - rect.left;
    const globalY = clientY - rect.top - this.framework.scrollOffset;
    return {
      x: globalX - this.x,
      y: globalY - this.y
    };
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getLocalPos(touch.clientX, touch.clientY);
    this.handlePress(pos.x, pos.y);
  }

  handleTouchMove(e) {
    e.preventDefault();
  }

  handleTouchEnd(e) {
    e.preventDefault();
  }

  handleMouseDown(e) {
    const pos = this.getLocalPos(e.clientX, e.clientY);
    this.handlePress(pos.x, pos.y);
  }

  handleMouseMove(e) {}

  handleMouseUp(e) {}

  async startCamera() {
    if (this.stream) return;

    try {
      this.stopCamera();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });

      const [track] = this.stream.getVideoTracks();
      const caps = track.getCapabilities?.() || {};
      this.torchSupported = !!caps.torch;

      this.video = document.createElement('video');
      this.video.autoplay = true;
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.srcObject = this.stream;

      this.video.style.position = 'fixed';
      this.video.style.left = '-9999px';
      this.video.style.top = '-9999px';
      this.video.style.width = '1px';
      this.video.style.height = '1px';
      document.body.appendChild(this.video);

      await new Promise(resolve => {
        this.video.onloadedmetadata = () => {
          this.loaded = true;
          this.video.play().catch(e => console.warn('Play auto échoué:', e));
          resolve();
        };
        this.video.onerror = (e) => {
          this.error = 'Erreur vidéo';
          console.error('Video error:', e);
          resolve();
        };
      });

      this.markDirty();
    } catch (err) {
      this.error = err.message || 'Accès caméra refusé';
      console.error('Échec getUserMedia:', err);
      this.markDirty();
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      if (this.video.parentNode) {
        this.video.parentNode.removeChild(this.video);
      }
      this.video.srcObject = null;
      this.video = null;
    }
    this.loaded = false;
    this.markDirty();
  }

  async switchCamera() {
    this.stopCamera();
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.startCamera();
  }

  async toggleTorch() {
    if (!this.torchSupported || !this.stream) return;

    const [track] = this.stream.getVideoTracks();
    try {
      await track.applyConstraints({
        advanced: [{ torch: !this.torchOn }]
      });
      this.torchOn = !this.torchOn;
      this.markDirty();
    } catch (err) {
      console.warn('Torch impossible:', err);
    }
  }

  capturePhoto() {
    if (!this.loaded || !this.video) {
      console.warn('Capture impossible : caméra pas prête');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (this.onPhoto) this.onPhoto(dataUrl);
    console.log('Photo capturée ! DataURL:', dataUrl.substring(0, 50) + '...');

    // Feedback : flash + preview 3s
    this.flashTimer = setTimeout(() => {
      this.flashTimer = null;
      this.markDirty();
    }, 200);

    this.previewPhoto = dataUrl;
    this.previewTimeout = setTimeout(() => {
      this.previewPhoto = null;
      this.markDirty();
    }, 3000);

    this.markDirty();
    return dataUrl;
  }

  switchFitMode() {
    this.currentFitModeIndex = (this.currentFitModeIndex + 1) % this.fitModes.length;
    this.fitMode = this.fitModes[this.currentFitModeIndex];
    this.markDirty();
  }

  handlePress(relX, relY) {

    // Capture centrale
    const captureX = this.width / 2;
    const captureY = this.height - 60;
    if (Math.hypot(relX - captureX, relY - captureY) < this.captureButtonRadius + 10) {
      this.capturePhoto();
      return;
    }

    // Switch caméra
    if (relX < 60 && relY < 60) {
      this.switchCamera();
      return;
    }

    // Torch
    if (this.torchSupported && relX > this.width - 60 && relY < 60) {
      this.toggleTorch();
      return;
    }

    // Switch mode
    const modeButtonX = this.width - 80;
    const modeButtonY = 20;
    if (relX > modeButtonX && relX < modeButtonX + this.modeButtonSize &&
        relY > modeButtonY && relY < modeButtonY + this.modeButtonSize) {
      this.switchFitMode();
      return;
    }
  }

  drawContainIcon(ctx, x, y, size) {
    // Icône "contain" : rectangle avec flèches vers l'intérieur
    const pad = size * 0.2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Rectangle extérieur
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    
    // Flèches pointant vers l'intérieur
    const arrowSize = size * 0.15;
    ctx.fillStyle = '#000';
    
    // Flèche haut
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + pad - 2);
    ctx.lineTo(x + size/2 - arrowSize, y + pad + arrowSize);
    ctx.lineTo(x + size/2 + arrowSize, y + pad + arrowSize);
    ctx.fill();
    
    // Flèche bas
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size - pad + 2);
    ctx.lineTo(x + size/2 - arrowSize, y + size - pad - arrowSize);
    ctx.lineTo(x + size/2 + arrowSize, y + size - pad - arrowSize);
    ctx.fill();
    
    // Flèche gauche
    ctx.beginPath();
    ctx.moveTo(x + pad - 2, y + size/2);
    ctx.lineTo(x + pad + arrowSize, y + size/2 - arrowSize);
    ctx.lineTo(x + pad + arrowSize, y + size/2 + arrowSize);
    ctx.fill();
    
    // Flèche droite
    ctx.beginPath();
    ctx.moveTo(x + size - pad + 2, y + size/2);
    ctx.lineTo(x + size - pad - arrowSize, y + size/2 - arrowSize);
    ctx.lineTo(x + size - pad - arrowSize, y + size/2 + arrowSize);
    ctx.fill();
  }

  drawCoverIcon(ctx, x, y, size) {
    // Icône "cover" : rectangle avec flèches vers l'extérieur
    const pad = size * 0.2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Rectangle intérieur
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    
    // Flèches pointant vers l'extérieur
    const arrowSize = size * 0.15;
    ctx.fillStyle = '#000';
    
    // Flèche haut
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + 2);
    ctx.lineTo(x + size/2 - arrowSize, y + arrowSize + 2);
    ctx.lineTo(x + size/2 + arrowSize, y + arrowSize + 2);
    ctx.fill();
    
    // Flèche bas
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size - 2);
    ctx.lineTo(x + size/2 - arrowSize, y + size - arrowSize - 2);
    ctx.lineTo(x + size/2 + arrowSize, y + size - arrowSize - 2);
    ctx.fill();
    
    // Flèche gauche
    ctx.beginPath();
    ctx.moveTo(x + 2, y + size/2);
    ctx.lineTo(x + arrowSize + 2, y + size/2 - arrowSize);
    ctx.lineTo(x + arrowSize + 2, y + size/2 + arrowSize);
    ctx.fill();
    
    // Flèche droite
    ctx.beginPath();
    ctx.moveTo(x + size - 2, y + size/2);
    ctx.lineTo(x + size - arrowSize - 2, y + size/2 - arrowSize);
    ctx.lineTo(x + size - arrowSize - 2, y + size/2 + arrowSize);
    ctx.fill();
  }

    drawContainIcon(ctx, x, y, size) {
    // Icône "contain" : rectangle avec flèches vers l'intérieur
    const pad = size * 0.2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Rectangle extérieur
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    
    // Flèches pointant vers l'intérieur
    const arrowSize = size * 0.15;
    ctx.fillStyle = '#000';
    
    // Flèche haut
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + pad - 2);
    ctx.lineTo(x + size/2 - arrowSize, y + pad + arrowSize);
    ctx.lineTo(x + size/2 + arrowSize, y + pad + arrowSize);
    ctx.fill();
    
    // Flèche bas
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size - pad + 2);
    ctx.lineTo(x + size/2 - arrowSize, y + size - pad - arrowSize);
    ctx.lineTo(x + size/2 + arrowSize, y + size - pad - arrowSize);
    ctx.fill();
    
    // Flèche gauche
    ctx.beginPath();
    ctx.moveTo(x + pad - 2, y + size/2);
    ctx.lineTo(x + pad + arrowSize, y + size/2 - arrowSize);
    ctx.lineTo(x + pad + arrowSize, y + size/2 + arrowSize);
    ctx.fill();
    
    // Flèche droite
    ctx.beginPath();
    ctx.moveTo(x + size - pad + 2, y + size/2);
    ctx.lineTo(x + size - pad - arrowSize, y + size/2 - arrowSize);
    ctx.lineTo(x + size - pad - arrowSize, y + size/2 + arrowSize);
    ctx.fill();
  }

  drawCoverIcon(ctx, x, y, size) {
    // Icône "cover" : rectangle avec flèches vers l'extérieur
    const pad = size * 0.2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Rectangle intérieur
    ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
    
    // Flèches pointant vers l'extérieur
    const arrowSize = size * 0.15;
    ctx.fillStyle = '#000';
    
    // Flèche haut
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + 2);
    ctx.lineTo(x + size/2 - arrowSize, y + arrowSize + 2);
    ctx.lineTo(x + size/2 + arrowSize, y + arrowSize + 2);
    ctx.fill();
    
    // Flèche bas
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size - 2);
    ctx.lineTo(x + size/2 - arrowSize, y + size - arrowSize - 2);
    ctx.lineTo(x + size/2 + arrowSize, y + size - arrowSize - 2);
    ctx.fill();
    
    // Flèche gauche
    ctx.beginPath();
    ctx.moveTo(x + 2, y + size/2);
    ctx.lineTo(x + arrowSize + 2, y + size/2 - arrowSize);
    ctx.lineTo(x + arrowSize + 2, y + size/2 + arrowSize);
    ctx.fill();
    
    // Flèche droite
    ctx.beginPath();
    ctx.moveTo(x + size - 2, y + size/2);
    ctx.lineTo(x + size - arrowSize - 2, y + size/2 - arrowSize);
    ctx.lineTo(x + size - arrowSize - 2, y + size/2 + arrowSize);
    ctx.fill();
  }

  drawSwitchCameraIcon(ctx, x, y, size) {
    // Icône de switch caméra : deux caméras avec flèche circulaire
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size * 0.35;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Arc circulaire (flèche de rotation)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();
    
    // Flèche en haut à droite
    const arrowSize = size * 0.15;
    const arrowAngle = Math.PI * 0.7;
    const arrowX = centerX + radius * Math.cos(arrowAngle);
    const arrowY = centerY + radius * Math.sin(arrowAngle);
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - arrowSize, arrowY - arrowSize * 0.5);
    ctx.lineTo(arrowX - arrowSize * 0.5, arrowY + arrowSize);
    ctx.fill();
    
    // Mini caméra au centre
    const camWidth = size * 0.25;
    const camHeight = size * 0.18;
    const camX = centerX - camWidth / 2;
    const camY = centerY - camHeight / 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(camX, camY, camWidth, camHeight);
    
    // Objectif
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx) {
    ctx.save();

    ctx.fillStyle = '#000';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Flash blanc après capture
    if (this.flashTimer) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    if (this.error) {
      ctx.fillStyle = '#ff4444';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.error, this.x + this.width/2, this.y + this.height/2);
    } else if (!this.loaded) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Démarrage caméra...', this.x + this.width/2, this.y + this.height/2);
    } else if (this.video && this.loaded) {
      const videoRatio = this.video.videoWidth / this.video.videoHeight;
      const canvasRatio = this.width / this.height;

      let drawWidth = this.width;
      let drawHeight = this.height;
      let offsetX = 0;
      let offsetY = 0;

      if (this.fitMode === 'cover') {
        if (videoRatio > canvasRatio) {
          drawHeight = this.height;
          drawWidth = drawHeight * videoRatio;
          offsetX = (this.width - drawWidth) / 2;
        } else {
          drawWidth = this.width;
          drawHeight = drawWidth / videoRatio;
          offsetY = (this.height - drawHeight) / 2;
        }
      } else if (this.fitMode === 'contain') {
        if (videoRatio > canvasRatio) {
          drawWidth = this.width;
          drawHeight = drawWidth / videoRatio;
          offsetY = (this.height - drawHeight) / 2;
        } else {
          drawHeight = this.height;
          drawWidth = drawHeight * videoRatio;
          offsetX = (this.width - drawWidth) / 2;
        }
      } 

      ctx.drawImage(this.video, this.x + offsetX, this.y + offsetY, drawWidth, drawHeight);

      // Mini preview dernière photo (bas droite, 3s)
      if (this.previewPhoto) {
        const previewSize = 80;
        const img = new Image();
        img.src = this.previewPhoto;
        ctx.drawImage(img, this.x + this.width - previewSize - 10, this.y + this.height - previewSize - 10, previewSize, previewSize);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + this.width - previewSize - 10, this.y + this.height - previewSize - 10, previewSize, previewSize);
      }
    }

    // Contrôles bas
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x, this.y + this.height - 100, this.width, 100);

    // Bouton capture
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y + this.height - 50, this.captureButtonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, this.y + this.height - 50, this.captureButtonRadius + 10, 0, Math.PI * 2);
    ctx.stroke();

    // Switch caméra avec icône
    const switchBtnX = this.x + 20;
    const switchBtnY = this.y + 20;
    const switchBtnSize = 50;
    
    // Fond semi-transparent
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(switchBtnX + switchBtnSize/2, switchBtnY + switchBtnSize/2, switchBtnSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Icône
    this.drawSwitchCameraIcon(ctx, switchBtnX, switchBtnY, switchBtnSize);

    // Torch
    if (this.torchSupported) {
      ctx.fillStyle = this.torchOn ? '#ffeb3b' : '#ffffff';
      ctx.fillText('⚡', this.x + this.width - 50, this.y + 45);
    }

    // Bouton switch mode avec icône
    const btnX = this.x + this.width - 80;
    const btnY = this.y + 20;
    
    // Fond du bouton
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(btnX, btnY, this.modeButtonSize, this.modeButtonSize);
    
    // Bordure
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, this.modeButtonSize, this.modeButtonSize);
    
    // Dessiner l'icône appropriée
    if (this.fitMode === 'contain') {
      this.drawContainIcon(ctx, btnX, btnY, this.modeButtonSize);
    } else {
      this.drawCoverIcon(ctx, btnX, btnY, this.modeButtonSize);
    }

    ctx.restore();
  }
}

export default FloatedCamera;