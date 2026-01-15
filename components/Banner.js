// components/Banner.js
import Component from '../core/Component.js';

export default class Banner extends Component {
  constructor(framework, options = {}) {
    super(framework, options);

    this.text = options.text || '';
    this.type = options.type || 'info';
    this.actions = options.actions || [];
    this.dismissible = options.dismissible === true;

    this.platform = framework.platform || 'material';

    this.width = options.width || framework.width || window.innerWidth;
    this.height = options.height || 64;
    this.x = options.x || 0;
    this.y = options.y || 0;

    this.visible = options.visible !== false;
    this.progress = this.visible ? 1 : 0;
    this.animSpeed = 0.18;

    this._lastUpdate = performance.now();
    this._colors = this._resolveColors();

    // Bounds calculées à chaque frame
    this._actionBounds = [];
    this._dismissBounds = null;
    
    // Pour indiquer qu'on gère nos propres clics
    this.selfManagedClicks = true;

    // Écouter les événements directement sur le canvas
    this._setupEventListeners();

    // Ref si fourni
    if (options.ref) options.ref.current = this;
  }

  /* ===================== Setup ===================== */
  _setupEventListeners() {
    // Stocker les références pour pouvoir les retirer plus tard
    this._boundHandleClick = this._handleClick.bind(this);
    
    // Écouter les événements sur le canvas parent
    if (this.framework && this.framework.canvas) {
      this.framework.canvas.addEventListener('click', this._boundHandleClick);
      this.framework.canvas.addEventListener('touchend', this._boundHandleClick);
    }
  }

  _removeEventListeners() {
    if (this.framework && this.framework.canvas && this._boundHandleClick) {
      this.framework.canvas.removeEventListener('click', this._boundHandleClick);
      this.framework.canvas.removeEventListener('touchend', this._boundHandleClick);
    }
  }

  /* ===================== Lifecycle ===================== */
  onMount() {
    this._setupEventListeners();
  }

  onUnmount() {
    this._removeEventListeners();
  }

  /* ===================== Colors ===================== */
  _resolveColors() {
    if (this.platform === 'cupertino') {
      return {
        bg: 'rgba(250,250,250,0.95)',
        fg: '#000',
        accent: '#007AFF',
        divider: 'rgba(60,60,67,0.15)'
      };
    }

    // Material v3
    const map = {
      info: '#E8F0FE',
      success: '#E6F4EA',
      warning: '#FEF7E0',
      error: '#FCE8E6'
    };

    return {
      bg: map[this.type] || map.info,
      fg: '#1F1F1F',
      accent: '#1A73E8'
    };
  }

  /* ===================== Show/Hide ===================== */
  show() { 
    this.visible = true; 
    this.markDirty(); 
  }
  
  hide() { 
    this.visible = false; 
    this.markDirty(); 
  }

  /* ===================== Update ===================== */
  update() {
    const now = performance.now();
    const dt = Math.min((now - this._lastUpdate) / 16.6, 3);

    const target = this.visible ? 1 : 0;
    this.progress += (target - this.progress) * this.animSpeed * dt;
    this.progress = Math.max(0, Math.min(1, this.progress));

    if (Math.abs(target - this.progress) > 0.01) this.markDirty();

    this._lastUpdate = now;
  }

  /* ===================== Draw ===================== */
  draw(ctx) {
    this.update();
    if (this.progress <= 0.01) return;

    const h = this.height * this.progress;
    const visibleHeight = h;

    ctx.save();

    // Background
    if (this.platform === 'material') {
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillStyle = this._colors.bg;
    ctx.fillRect(this.x, this.y, this.width, visibleHeight);
    ctx.shadowColor = 'transparent';

    // Divider iOS
    if (this.platform === 'cupertino') {
      ctx.strokeStyle = this._colors.divider;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + visibleHeight);
      ctx.lineTo(this.x + this.width, this.y + visibleHeight);
      ctx.stroke();
    }

    // Text
    ctx.fillStyle = this._colors.fg;
    ctx.font =
      this.platform === 'cupertino'
        ? '400 15px -apple-system'
        : '400 14px Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(this.text, this.x + 16, this.y + visibleHeight / 2);

    // Actions - calculer et stocker les bounds
    this._actionBounds = [];
    let x = this.width - 16;
    
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const action = this.actions[i];
      const textWidth = ctx.measureText(action.label).width + 20;
      x -= textWidth;

      ctx.fillStyle = this._colors.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(action.label, this.x + x + textWidth / 2, this.y + visibleHeight / 2);

      // Stocker la hitbox (en coordonnées écran, pas canvas)
      this._actionBounds.push({
        action: action,
        bounds: {
          x: this.x + x,
          y: this.y + (visibleHeight - 44) / 2,
          w: textWidth,
          h: 44
        }
      });

      x -= 12;
    }

    // Dismiss button
    if (this.dismissible) {
      const hitSize = 44;
      const cx = this.width - 28;
      const cy = this.y + visibleHeight / 2;

      ctx.fillStyle =
        this.platform === 'cupertino'
          ? 'rgba(60,60,67,0.6)'
          : this._colors.fg;

      ctx.font =
        this.platform === 'cupertino'
          ? '600 16px -apple-system'
          : '500 16px Roboto';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', cx, cy);

      this._dismissBounds = {
        x: cx - hitSize / 2,
        y: cy - hitSize / 2,
        w: hitSize,
        h: hitSize
      };
    } else {
      this._dismissBounds = null;
    }

    ctx.restore();
    
    // DEBUG: Dessiner les hitboxes
    if (this.framework && this.framework.debbug) {
      this._drawDebugHitboxes(ctx);
    }
  }
  
  /* ===================== Debug ===================== */
  _drawDebugHitboxes(ctx) {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    
    // Dessiner la hitbox principale du banner
    const h = this.height * this.progress;
    ctx.strokeRect(this.x, this.y, this.width, h);
    
    // Dessiner les hitboxes des actions
    if (this._actionBounds && this._actionBounds.length > 0) {
      for (const item of this._actionBounds) {
        const b = item.bounds;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        
        // Texte de debug
        ctx.fillStyle = 'red';
        ctx.font = '10px monospace';
        ctx.fillText(item.action.label, b.x + 5, b.y + 12);
      }
    }
    
    // Dessiner la hitbox du dismiss button
    if (this._dismissBounds) {
      const b = this._dismissBounds;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillText('X', b.x + 5, b.y + 12);
    }
    
    ctx.restore();
  }

  /* ===================== Click Handling ===================== */
  _handleClick(event) {
    if (this.progress < 0.95) return;
    
    // Obtenir les coordonnées du clic/touch
    let clientX, clientY;
    
    if (event.type === 'touchend') {
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    // Convertir en coordonnées canvas SIMPLIFIÉ
    const canvasRect = this.framework.canvas.getBoundingClientRect();
    
    // Coordonnées relatives au canvas (en pixels CSS, pas en pixels canvas)
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    
    console.log('Click converted:', { 
      clientX, clientY, 
      canvasLeft: canvasRect.left, 
      canvasTop: canvasRect.top,
      x, y,
      bannerX: this.x,
      bannerY: this.y,
      bannerWidth: this.width,
      bannerHeight: this.height * this.progress
    });
    
    // Vérifier si on clique sur le banner (en coordonnées CSS)
    const bannerBottom = this.y + (this.height * this.progress);
    if (x < this.x || x > this.x + this.width || y < this.y || y > bannerBottom) {
      console.log('Click outside banner');
      return;
    }
    
    console.log('Click INSIDE banner!');
    
    // Empêcher la propagation
    event.stopPropagation();
    
    // 1️⃣ Dismiss button
    if (this.dismissible && this._dismissBounds) {
      const b = this._dismissBounds;
      console.log('Checking dismiss bounds:', b, 'click:', {x, y});
      if (x >= b.x && x <= b.x + b.w && 
          y >= b.y && y <= b.y + b.h) {
        console.log('Dismiss clicked!');
        this.hide();
        return;
      }
    }
    
    // 2️⃣ Actions
    if (this._actionBounds && this._actionBounds.length > 0) {
      console.log('Checking', this._actionBounds.length, 'action bounds');
      for (const item of this._actionBounds) {
        const b = item.bounds;
        console.log('Checking action:', item.action.label, 'bounds:', b);
        if (x >= b.x && x <= b.x + b.w && 
            y >= b.y && y <= b.y + b.h) {
          console.log('Action clicked:', item.action.label);
          item.action.onClick?.();
          return;
        }
      }
    }
    
    console.log('Click on banner but not on any button');
  }

  /* ===================== Resize ===================== */
  _resize(width) {
    this.width = width;
    this.markDirty();
  }
}