import Component from '../core/Component.js';

class Accordion extends Component {

  constructor(framework, options = {}) {
    super(framework, options);

    this.title = options.title || '';
    this.content = options.content || '';
    this.icon = options.icon || null;
    this.expanded = options.expanded || false;

    this.platform = framework.platform;
	
	this.borderColor = options.borderColor || '#E5E5EA'
	
	if(this.platform === 'material'){
      this.headerBg = options.headerBg || '#F8F9FF'; // Material 3 tonal surface
      this.textColor = options.textColor || '#1C1B1F';
    }else{
      this.headerBg = options.headerBg || '#FFFFFF';
      this.textColor = options.textColor || '#000000';
    }

    this.headerHeight = 56;
    this.contentPadding = 16;

    this.animProgress = this.expanded ? 1 : 0;
    this.animating = false;

    this.ripples = [];
	
	this.rippleColor = options.rippleColor || 'rgba(98,0,238,0.12)';

    this.calculateContentHeight();
    this.height = this.headerHeight + (this.expanded ? this.contentHeight : 0);
	
	
	this.onClick = () => {
      if (this.animating) return;

      // Ripple centré Material
      if (this.platform === 'material') {
        this.addRipple();
      }

      this.toggle();
    };

  }

  calculateContentHeight() {
    const ctx = this.framework.ctx;
    ctx.save();
    ctx.font = '14px -apple-system, sans-serif';

    const maxWidth = this.width - this.contentPadding * 2;

    const words = this.content.split(' ');
    let lines = [];
    let line = '';

    words.forEach(word => {

      const test = line + word + ' ';
      if (ctx.measureText(test).width < maxWidth) {
        line = test;
      } else {
        lines.push(line);
        line = word + ' ';
      }

    });

    lines.push(line);
    this.lines = lines;

    ctx.restore();

    this.contentHeight = lines.length * 20 + this.contentPadding * 2;
  }

  toggle() {

    if (this.animating) return;

    this.expanded = !this.expanded;

    const target = this.expanded ? 1 : 0;

    this.animating = true;

    const animate = () => {

      this.animProgress += (target - this.animProgress) * 0.2;

      if (Math.abs(target - this.animProgress) < 0.01) {
        this.animProgress = target;
        this.animating = false;
      } else {
        requestAnimationFrame(animate);
      }

      this.height = this.headerHeight + this.contentHeight * this.animProgress;

    };

    animate();
  }
  
  addRipple() {
    const ripple = {
      x: this.width / 2,
      y: this.headerHeight / 2,
      radius: 0,
      maxRadius: Math.max(this.width, this.headerHeight) * 1.5,
      opacity: 0.3
    };
    this.ripples.push(ripple);
    this.animateRipples();
  }

  animateRipples() {
    const animate = () => {
      let active = false;
      for (let ripple of this.ripples) {
        if (ripple.radius < ripple.maxRadius) {
          ripple.radius += ripple.maxRadius / 15;
          ripple.opacity -= 0.03;
          active = true;
        }
      }
      this.ripples = this.ripples.filter(r => r.opacity > 0);
      if (active) requestAnimationFrame(animate);
    };
    animate();
  }

  draw(ctx){

    ctx.save();

    let headerBg;
    let textColor;
    let borderColor = this.borderColor;

    if(this.platform === 'material'){
      headerBg = this.headerBg; // Material 3 tonal surface
      textColor = this.textColor ;
    }else{
      headerBg = this.headerBg;
      textColor = this.textColor ;
    }

    // background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x,this.y,this.width,this.height);

    // header
    ctx.fillStyle = headerBg;
    ctx.fillRect(this.x,this.y,this.width,this.headerHeight);

    // Cupertino separator
    if(this.platform === 'cupertino'){
      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(this.x,this.y+this.headerHeight);
      ctx.lineTo(this.x+this.width,this.y+this.headerHeight);
      ctx.stroke();
    }

    // Ripple Material
    if(this.platform === 'material'){
      ctx.save();

      ctx.beginPath();
      ctx.rect(this.x,this.y,this.width,this.headerHeight);
      ctx.clip();

      this.ripples.forEach(r=>{

        ctx.globalAlpha = r.opacity;
        ctx.fillStyle = this.rippleColor;
        ctx.beginPath();
        ctx.arc(this.x+r.x,this.y+r.y,r.radius,0,Math.PI*2);
        ctx.fill();

      });

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Title
    ctx.fillStyle = textColor;
    ctx.font = this.platform==='material'
      ? '500 16px Roboto'
      : '600 16px -apple-system';

    ctx.textAlign='left';
    ctx.textBaseline='middle';

    ctx.fillText(
      this.title,
      this.x+16,
      this.y+this.headerHeight/2
    );

    // Chevron
    ctx.save();

    ctx.translate(this.x+this.width-24,this.y+this.headerHeight/2);
    ctx.rotate(this.animProgress*Math.PI);

    ctx.strokeStyle='#666';
    ctx.lineWidth = this.platform==='material'?2:1.3;

    ctx.beginPath();
    ctx.moveTo(-5,-3);
    ctx.lineTo(0,3);
    ctx.lineTo(5,-3);
    ctx.stroke();

    ctx.restore();

    // content
    if(this.animProgress>0){

      ctx.save();

      ctx.beginPath();
      ctx.rect(
        this.x,
        this.y+this.headerHeight,
        this.width,
        this.contentHeight*this.animProgress
      );
      ctx.clip();

      ctx.fillStyle='#666';
      ctx.font='14px -apple-system';

      let y=this.y+this.headerHeight+this.contentPadding;

      this.lines.forEach(line=>{
        ctx.fillText(line,this.x+this.contentPadding,y);
        y+=20;
      });

      ctx.restore();

    }

    ctx.restore();

  }

}

export default Accordion;
