const { metrics } = require("./metrics");

class RetryHandler {
  constructor(maxRetries = 3, initialDelay = 1000) {
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelay;
  }

  async execute(operation, context = {}) {
    let lastError;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;

        // Track retry attempt
        if (context.type) {
          if (context.type.startsWith("email_")) {
            metrics.emailRetry.inc({
              type: context.type.replace("email_", ""),
              attempt: attempt.toString(),
            });
          } else if (context.type.startsWith("sms_")) {
            metrics.smsRetry.inc({
              type: context.type.replace("sms_", ""),
              attempt: attempt.toString(),
            });
          }
        }

        if (attempt === this.maxRetries) {
          console.error(`Operation failed after ${attempt} attempts:`, {
            error: error.message,
            context,
          });
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        console.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries}):`,
          {
            error: error.message,
            context,
          }
        );

        await this.wait(delay);
      }
    }

    throw lastError;
  }

  calculateDelay(attempt) {
    // Exponential backoff with jitter
    const exponentialDelay = this.initialDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = RetryHandler;
