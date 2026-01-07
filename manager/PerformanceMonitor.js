// ==========================================
// 2. PERFORMANCE MONITORING
// ==========================================

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 60,
      frameTime: 0,
      memoryUsage: 0,
      renderTime: 0,
      componentCount: 0
    };
    
    this.fpsHistory = [];
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.isMonitoring = false;
  }

  startMonitoring() {
    this.isMonitoring = true;
    this.updateMetrics();
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  updateMetrics() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    
    // Calculer FPS
    this.frameCount++;
    if (deltaTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.fpsHistory.push(this.metrics.fps);
      
      // Garder seulement les 60 dernières secondes
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastTime = now;
      
      // Alerter si FPS < 30
      if (this.metrics.fps < 30) {
        console.warn('⚠️ Low FPS detected:', this.metrics.fps);
      }
    }

    // Mémoire (si disponible)
    if (performance.memory) {
      this.metrics.memoryUsage = Math.round(
        performance.memory.usedJSHeapSize / 1048576
      ); // MB
    }

    requestAnimationFrame(() => this.updateMetrics());
  }

  measureRender(fn) {
    const start = performance.now();
    fn();
    const end = performance.now();
    this.metrics.renderTime = end - start;
    return this.metrics.renderTime;
  }

  getReport() {
    return {
      current: this.metrics,
      averageFPS: this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length,
      minFPS: Math.min(...this.fpsHistory),
      maxFPS: Math.max(...this.fpsHistory)
    };
  }
}

export default PerformanceMonitor;