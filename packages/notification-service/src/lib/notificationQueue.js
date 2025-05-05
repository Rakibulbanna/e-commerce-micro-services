const { EventEmitter } = require("events");
const { metrics } = require("./metrics");

class NotificationQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxSize: options.maxSize || 10000,
      batchSize: options.batchSize || 100,
      processInterval: options.processInterval || 1000,
      ...options,
    };

    this.queue = [];
    this.processing = false;
    this.timer = null;
  }

  add(notification, priority = 0) {
    if (this.queue.length >= this.options.maxSize) {
      metrics.notificationQueueFull.inc({ type: notification.type });
      throw new Error("Queue is full");
    }

    const item = {
      notification,
      priority,
      timestamp: Date.now(),
    };

    // Insert maintaining priority order
    const index = this.queue.findIndex((q) => q.priority < priority);
    if (index === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(index, 0, item);
    }

    metrics.notificationQueueSize.set(
      { type: notification.type },
      this.queue.length
    );
    this.emit("added", item);

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
  }

  async startProcessing() {
    if (this.processing) return;
    this.processing = true;

    while (this.processing && this.queue.length > 0) {
      const batch = this.queue.splice(0, this.options.batchSize);

      try {
        await this.processBatch(batch);
      } catch (error) {
        console.error("Error processing notification batch:", error);
        // Put failed items back in queue with lower priority
        batch.forEach((item) => {
          item.priority = Math.max(0, item.priority - 1);
          this.queue.push(item);
        });
      }

      // Update metrics
      metrics.notificationQueueSize.set({ type: "all" }, this.queue.length);

      // Wait for next interval
      await new Promise((resolve) =>
        setTimeout(resolve, this.options.processInterval)
      );
    }

    this.processing = false;
  }

  async processBatch(batch) {
    const startTime = Date.now();

    for (const item of batch) {
      try {
        await this.emit("process", item.notification);
        metrics.notificationProcessed.inc({ type: item.notification.type });
      } catch (error) {
        console.error("Error processing notification:", error);
        metrics.notificationError.inc({ type: item.notification.type });
        throw error;
      }
    }

    const duration = Date.now() - startTime;
    metrics.notificationProcessingTime.observe(
      { type: "batch" },
      duration / 1000
    );
  }

  stop() {
    this.processing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  clear() {
    this.queue = [];
    metrics.notificationQueueSize.set({ type: "all" }, 0);
  }

  getSize() {
    return this.queue.length;
  }
}

module.exports = NotificationQueue;
