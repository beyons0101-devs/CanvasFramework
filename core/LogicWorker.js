// LogicWorker.js
let state = {};

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch(type) {
    case 'SET_STATE':
      state = payload;
      self.postMessage({ type: 'STATE_UPDATED', payload: state });
      break;

    case 'EXECUTE':
      // payload: { fnString: string, args: array }
      // Attention : on envoie la fonction en string et on l'exécute ici
      try {
        const fn = new Function('state', 'args', payload.fnString);
        const result = await fn(state, payload.args);
        self.postMessage({ type: 'EXECUTION_RESULT', payload: result });
      } catch (err) {
        self.postMessage({ type: 'EXECUTION_ERROR', payload: err.message });
      }
      break;
  }
};
