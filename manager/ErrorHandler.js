// ==========================================
// 1. ERROR HANDLING & LOGGING
// ==========================================

class ErrorHandler {
  constructor(options = {}) {
    this.sentryDsn = options.sentryDsn;
    this.environment = options.environment || 'production';
    this.logLevel = options.logLevel || 'error';
    this.errors = [];
  }

  captureError(error, context = {}) {
    const errorLog = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.push(errorLog);
    
    // Log to console in dev
    if (this.environment === 'development') {
      console.error('🚨 Error captured:', errorLog);
    }

    // Send to Sentry in production
    if (this.sentryDsn && this.environment === 'production') {
      this.sendToSentry(errorLog);
    }

    return errorLog;
  }

  sendToSentry(errorLog) {
    // Integration avec Sentry
    if (window.Sentry) {
      window.Sentry.captureException(new Error(errorLog.message), {
        extra: errorLog.context
      });
    }
  }

  wrap(fn, context = '') {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.captureError(error, { context, args });
        throw error;
      }
    };
  }
}

export default ErrorHandler;