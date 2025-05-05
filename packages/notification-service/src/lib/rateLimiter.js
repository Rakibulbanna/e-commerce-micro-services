const { metrics } = require("./metrics");

class RateLimiter {
  constructor(ratePerSecond, burstSize, serviceName) {
    this.ratePerSecond = ratePerSecond;
    this.burstSize = burstSize;
    this.tokens = burstSize;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
    this.serviceName = serviceName;

    // Initialize metrics
    metrics.rateLimiterTokens.set({ service: serviceName }, burstSize);
    metrics.rateLimiterQueueSize.set({ service: serviceName }, 0);
  }

  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      metrics.rateLimiterQueueSize.set(
        { service: this.serviceName },
        this.queue.length
      );
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timePassed = (now - this.lastRefill) / 1000;
      this.lastRefill = now;

      // Refill tokens based on time passed
      this.tokens = Math.min(
        this.burstSize,
        this.tokens + timePassed * this.ratePerSecond
      );

      // Update tokens metric
      metrics.rateLimiterTokens.set({ service: this.serviceName }, this.tokens);

      if (this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.queue.shift();
        resolve();
        // Update queue size metric
        metrics.rateLimiterQueueSize.set(
          { service: this.serviceName },
          this.queue.length
        );
      } else {
        // Wait for next token
        const waitTime = ((1 - this.tokens) / this.ratePerSecond) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.processing = false;
  }
}

// Create rate limiters for different services
const rateLimiters = {
  smtp: new RateLimiter(10, 20, "smtp"), // 10 emails per second, burst of 20
  twilio: new RateLimiter(5, 10, "twilio"), // 5 SMS per second, burst of 10
};

module.exports = rateLimiters;
