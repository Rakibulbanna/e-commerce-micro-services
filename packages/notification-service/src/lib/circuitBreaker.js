const { metrics } = require("./metrics");

class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === "OPEN") {
      if (this.shouldReset()) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error(`${this.serviceName} circuit breaker is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
    metrics.circuitBreakerState.set({ service: this.serviceName }, 0); // 0 = CLOSED
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    metrics.circuitBreakerFailures.inc({ service: this.serviceName });

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      metrics.circuitBreakerState.set({ service: this.serviceName }, 1); // 1 = OPEN
      console.error(`${this.serviceName} circuit breaker is now OPEN`);
    }
  }

  shouldReset() {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  getState() {
    return this.state;
  }
}

// Create circuit breakers for different services
const circuitBreakers = {
  smtp: new CircuitBreaker("smtp", {
    failureThreshold: 5,
    resetTimeout: 30000,
  }),
  twilio: new CircuitBreaker("twilio", {
    failureThreshold: 5,
    resetTimeout: 30000,
  }),
};

module.exports = circuitBreakers;
