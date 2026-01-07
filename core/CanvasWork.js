// CanvasWorker.js
let components = [];

self.onmessage = (e) => {
  const { type, payload } = e.data;

  switch(type) {
    case 'INIT':
      components = payload.components;
      self.postMessage({ type: 'READY' });
      break;

    case 'UPDATE_LAYOUT':
      // Recalculer la hauteur des composants dynamiques
      const updated = components.map(comp => {
        if (comp.dynamicHeight && comp.calculateHeight) {
          comp.height = comp.calculateHeight();
        }
        return { id: comp.id, height: comp.height };
      });
      self.postMessage({ type: 'LAYOUT_DONE', payload: updated });
      break;

    case 'SCROLL_INERTIA':
      let { offset, velocity, friction, maxScroll } = payload;
      offset += velocity;
      offset = Math.max(Math.min(offset, 0), -maxScroll);
      velocity *= friction;
      self.postMessage({ type: 'SCROLL_UPDATED', payload: { offset, velocity } });
      break;
  }
};
