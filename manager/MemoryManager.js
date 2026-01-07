// ==========================================
// 4. MEMORY MANAGEMENT
// ==========================================

class MemoryManager {
  constructor(framework) {
    this.framework = framework;
    this.imageCache = new Map();
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.currentCacheSize = 0;
    this.componentRegistry = new WeakMap();
  }

  cacheImage(url, image) {
    const size = this.estimateImageSize(image);
    
    // Éviction si dépassement
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictOldest();
    }

    this.imageCache.set(url, {
      image,
      size,
      lastAccessed: Date.now(),
      accessCount: 0
    });

    this.currentCacheSize += size;
  }

  getImage(url) {
    const cached = this.imageCache.get(url);
    if (cached) {
      cached.lastAccessed = Date.now();
      cached.accessCount++;
      return cached.image;
    }
    return null;
  }

  evictOldest() {
    let oldest = null;
    let oldestTime = Infinity;

    for (let [url, data] of this.imageCache) {
      if (data.lastAccessed < oldestTime) {
        oldestTime = data.lastAccessed;
        oldest = url;
      }
    }

    if (oldest) {
      const data = this.imageCache.get(oldest);
      this.currentCacheSize -= data.size;
      this.imageCache.delete(oldest);
    }
  }

  estimateImageSize(image) {
    // Estimation approximative
    return image.width * image.height * 4; // 4 bytes per pixel (RGBA)
  }

  registerComponent(component) {
    this.componentRegistry.set(component, {
      created: Date.now(),
      listeners: []
    });
  }

  unregisterComponent(component) {
    const data = this.componentRegistry.get(component);
    if (data) {
      // Nettoyer tous les event listeners
      data.listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    }
    this.componentRegistry.delete(component);
  }

  trackListener(component, element, event, handler) {
    const data = this.componentRegistry.get(component);
    if (data) {
      data.listeners.push({ element, event, handler });
    }
  }

  clearAll() {
    this.imageCache.clear();
    this.currentCacheSize = 0;
  }

  getMemoryReport() {
    return {
      imageCacheSize: `${(this.currentCacheSize / 1024 / 1024).toFixed(2)} MB`,
      imageCacheCount: this.imageCache.size,
      componentCount: this.framework.components.length,
      heapSize: performance.memory 
        ? `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`
        : 'N/A'
    };
  }
}

export default MemoryManager;