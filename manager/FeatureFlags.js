// ==========================================
// 6. FEATURE FLAGS & AB TESTING
// ==========================================

class FeatureFlags {
  constructor(config = {}) {
    this.flags = config.flags || {};
    this.userId = config.userId;
    this.experiments = {};
  }

  isEnabled(flagName) {
    const flag = this.flags[flagName];
    
    if (typeof flag === 'boolean') {
      return flag;
    }

    if (typeof flag === 'object') {
      // Percentage rollout
      if (flag.percentage && this.userId) {
        const hash = this.hashUserId(this.userId);
        return hash < flag.percentage;
      }

      // A/B test
      if (flag.variants) {
        return this.getVariant(flagName, flag.variants);
      }
    }

    return false;
  }

  getVariant(experimentName, variants) {
    if (!this.userId) return variants[0];

    const hash = this.hashUserId(this.userId + experimentName);
    const variantIndex = hash % variants.length;
    
    this.experiments[experimentName] = variants[variantIndex];
    return variants[variantIndex];
  }

  hashUserId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  trackExperiment(experimentName) {
    // Envoyer à analytics
    console.log('Experiment:', experimentName, this.experiments[experimentName]);
  }
}

export default FeatureFlags;