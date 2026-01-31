import Component from '../core/Component.js';

/**
 * Composant QR Code Reader autonome
 * Analyse en temps réel le flux vidéo pour détecter les QR codes
 */
class QRCodeReader extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.facingMode = options.facingMode || 'environment';
    this.autoStart = options.autoStart !== false;
    this.onQRCodeDetected = options.onQRCodeDetected || null; // Callback quand un QR code est détecté
    this.onError = options.onError || null;
    
    // Options de scan
    this.scanInterval = options.scanInterval || 300; // ms entre chaque analyse
    this.continuous = options.continuous !== false; // Continue à scanner même après détection
    this.vibrateOnDetect = options.vibrateOnDetect !== false; // Vibration mobile
    
    this.stream = null;
    this.video = null;
    this.loaded = false;
    this.error = null;
    
    // État du scan
    this.isScanning = false;
    this.scanTimer = null;
    this.lastScanTime = 0;
    this.currentQRCode = null;
    this.scanHistory = []; // Historique des codes scannés
    
    // UI
    this.showControls = true;
    this.showScannerOverlay = true;
    this.scannerFrameSize = 250; // Taille du cadre de scan
    this.scannerFrameColor = '#00ff00';
    this.scannerLineColor = '#ff0000';
    this.scannerLineHeight = 2;
    this.scannerLineSpeed = 2;
    this.scannerLinePosition = 0;
    this.scannerLineDirection = 1;
    
    this.torchSupported = false;
    this.torchOn = false;
    
    this.isStarting = false;
    
    // Charger la librairie QR code (jsQR)
    this.loadQRScanner();
  }

  async _mount() {
    super._mount?.();

    if (this.autoStart && !this.stream && !this.isStarting) {
      this.isStarting = true;
      await this.startCamera();
      this.isStarting = false;
    }

    this.setupEventListeners();
  }

  destroy() {
    this.stopScanning();
    this.removeEventListeners();
    this.stopCamera();
    super.destroy?.();
  }

  // Charger jsQR depuis CDN
  loadQRScanner() {
    if (typeof jsQR === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.onload = () => {
        console.log('jsQR loaded');
        if (this.loaded && !this.isScanning) {
          this.startScanning();
        }
      };
      script.onerror = () => {
        console.error('Failed to load jsQR');
        this.error = 'Échec du chargement du scanner QR';
      };
      document.head.appendChild(script);
    }
  }

  setupEventListeners() {
    this.onTouchStart = this.handleTouchStart.bind(this);
    this.onMouseDown = this.handleMouseDown.bind(this);

    const canvas = this.framework.canvas;
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  removeEventListeners() {
    const canvas = this.framework.canvas;
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('mousedown', this.onMouseDown);
  }

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

  handleMouseDown(e) {
    const pos = this.getLocalPos(e.clientX, e.clientY);
    this.handlePress(pos.x, pos.y);
  }

  async startCamera() {
    if (this.stream) return;

    try {
      this.stopCamera();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.facingMode,
          width: { ideal: 320 },
          height: { ideal: 240 },
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
          this.video.play().then(() => {
            if (typeof jsQR !== 'undefined') {
              this.startScanning();
            }
            resolve();
          }).catch(e => {
            console.warn('Play auto échoué:', e);
            resolve();
          });
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
      if (this.onError) this.onError(this.error);
      this.markDirty();
    }
  }

  stopCamera() {
    this.stopScanning();
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

  startScanning() {
    if (this.isScanning || !this.loaded || !this.video) return;
    
    this.isScanning = true;
    this.scanTimer = setInterval(() => {
      this.scanQRCode();
    }, this.scanInterval);
  }

  stopScanning() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.isScanning = false;
  }

  async switchCamera() {
    this.stopScanning();
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

  scanQRCode() {
    if (!this.loaded || !this.video || typeof jsQR === 'undefined') return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Définir la taille optimale pour la détection
    const width = this.video.videoWidth;
    const height = this.video.videoHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    // Dessiner l'image vidéo
    ctx.drawImage(this.video, 0, 0, width, height);
    
    // Extraire les données d'image
    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Scanner le QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      this.handleQRCodeDetected(code.data, code.location);
    } else {
      this.currentQRCode = null;
    }
    
    this.markDirty();
  }

  handleQRCodeDetected(data, location) {
    const now = Date.now();
    
    // Éviter les doublons rapides
    if (this.scanHistory.length > 0) {
      const lastScan = this.scanHistory[this.scanHistory.length - 1];
      if (lastScan.data === data && now - lastScan.timestamp < 2000) {
        return; // Code déjà scanné récemment
      }
    }

    this.currentQRCode = {
      data: data,
      location: location,
      timestamp: now
    };

    // Ajouter à l'historique
    this.scanHistory.push({
      data: data,
      timestamp: now
    });
    
    // Limiter l'historique
    if (this.scanHistory.length > 10) {
      this.scanHistory.shift();
    }

    // Feedback haptique
    if (this.vibrateOnDetect && navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Callback
    if (this.onQRCodeDetected) {
      this.onQRCodeDetected(data);
    }

    // Stop si pas en mode continu
    if (!this.continuous) {
      this.stopScanning();
    }

    console.log('QR Code détecté:', data);
  }

  handlePress(relX, relY) {
    // Bouton switch caméra (haut gauche)
    if (relX < 60 && relY < 60) {
      this.switchCamera();
      return;
    }

    // Torch (haut droite)
    if (this.torchSupported && relX > this.width - 60 && relY < 60) {
      this.toggleTorch();
      return;
    }

    // Zone centrale pour réinitialiser le scan
    if (relX > this.width/2 - 100 && relX < this.width/2 + 100 &&
        relY > this.height/2 - 100 && relY < this.height/2 + 100) {
      if (!this.isScanning && this.loaded) {
        this.startScanning();
      }
      return;
    }
  }

  drawScannerOverlay(ctx) {
    if (!this.showScannerOverlay) return;

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const frameSize = this.scannerFrameSize;
    const halfSize = frameSize / 2;

    // Fond semi-transparent autour
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    
    // Haut
    ctx.fillRect(this.x, this.y, this.width, centerY - halfSize);
    // Bas
    ctx.fillRect(this.x, centerY + halfSize, this.width, this.height - (centerY + halfSize));
    // Gauche
    ctx.fillRect(this.x, centerY - halfSize, centerX - halfSize, frameSize);
    // Droite
    ctx.fillRect(centerX + halfSize, centerY - halfSize, centerX - halfSize, frameSize);

    // Cadre de scan
    ctx.strokeStyle = this.scannerFrameColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(centerX - halfSize, centerY - halfSize, frameSize, frameSize);

    // Coins décoratifs
    const cornerSize = 20;
    
    // Coin haut gauche
    ctx.beginPath();
    ctx.moveTo(centerX - halfSize, centerY - halfSize + cornerSize);
    ctx.lineTo(centerX - halfSize, centerY - halfSize);
    ctx.lineTo(centerX - halfSize + cornerSize, centerY - halfSize);
    ctx.stroke();

    // Coin haut droit
    ctx.beginPath();
    ctx.moveTo(centerX + halfSize - cornerSize, centerY - halfSize);
    ctx.lineTo(centerX + halfSize, centerY - halfSize);
    ctx.lineTo(centerX + halfSize, centerY - halfSize + cornerSize);
    ctx.stroke();

    // Coin bas gauche
    ctx.beginPath();
    ctx.moveTo(centerX - halfSize, centerY + halfSize - cornerSize);
    ctx.lineTo(centerX - halfSize, centerY + halfSize);
    ctx.lineTo(centerX - halfSize + cornerSize, centerY + halfSize);
    ctx.stroke();

    // Coin bas droit
    ctx.beginPath();
    ctx.moveTo(centerX + halfSize - cornerSize, centerY + halfSize);
    ctx.lineTo(centerX + halfSize, centerY + halfSize);
    ctx.lineTo(centerX + halfSize, centerY + halfSize - cornerSize);
    ctx.stroke();

    // Ligne animée
    this.scannerLinePosition += this.scannerLineSpeed * this.scannerLineDirection;
    if (this.scannerLinePosition > frameSize || this.scannerLinePosition < 0) {
      this.scannerLineDirection *= -1;
    }

    const lineY = centerY - halfSize + this.scannerLinePosition;
    ctx.fillStyle = this.scannerLineColor;
    ctx.fillRect(centerX - halfSize, lineY, frameSize, this.scannerLineHeight);
  }

  drawControls(ctx) {
    // Bouton switch caméra
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(this.x + 30, this.y + 30, 25, 0, Math.PI * 2);
    ctx.fill();

    // Icône caméra
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄', this.x + 30, this.y + 30);

    // Torch
    if (this.torchSupported) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(this.x + this.width - 30, this.y + 30, 25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.torchOn ? '#ffeb3b' : '#fff';
      ctx.fillText('⚡', this.x + this.width - 30, this.y + 30);
    }

    // État du scan
    const scanStatusY = this.y + this.height - 40;
    ctx.fillStyle = this.isScanning ? '#4CAF50' : '#FF5722';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.isScanning ? 'Scan en cours...' : 'Scan arrêté',
      this.x + this.width / 2,
      scanStatusY
    );

    // Dernier QR code détecté
    if (this.currentQRCode) {
      ctx.fillStyle = 'rgba(0, 150, 0, 0.8)';
      ctx.fillRect(this.x, this.y + this.height - 90, this.width, 40);

      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      
      // Tronquer si trop long
      const displayText = this.currentQRCode.data.length > 50 
        ? this.currentQRCode.data.substring(0, 47) + '...' 
        : this.currentQRCode.data;
      
      ctx.fillText(
        `QR Code: ${displayText}`,
        this.x + this.width / 2,
        this.y + this.height - 70
      );
    }
  }

  draw(ctx) {
    ctx.save();

    // Fond
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x, this.y, this.width, this.height);

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
      // Ajustement de la vidéo (cover pour remplir l'écran)
      const videoRatio = this.video.videoWidth / this.video.videoHeight;
      const canvasRatio = this.width / this.height;

      let drawWidth = this.width;
      let drawHeight = this.height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > canvasRatio) {
        drawHeight = this.height;
        drawWidth = drawHeight * videoRatio;
        offsetX = (this.width - drawWidth) / 2;
      } else {
        drawWidth = this.width;
        drawHeight = drawWidth / videoRatio;
        offsetY = (this.height - drawHeight) / 2;
      }

      ctx.drawImage(this.video, this.x + offsetX, this.y + offsetY, drawWidth, drawHeight);

      // Dessiner l'overlay de scan
      this.drawScannerOverlay(ctx);

      // Dessiner les contrôles
      this.drawControls(ctx);
    }

    // Instructions
    if (this.loaded && !this.currentQRCode) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Placez un QR code dans le cadre',
        this.x + this.width / 2,
        this.y + this.height / 2 + 150
      );
    }

    ctx.restore();
  }
}

export default QRCodeReader;