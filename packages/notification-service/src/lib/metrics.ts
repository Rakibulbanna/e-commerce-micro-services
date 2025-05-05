import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from "prom-client";

// Initialize Prometheus metrics
collectDefaultMetrics();
register.setDefaultLabels({
  app: "notification-service",
});

// Define metrics
export const notificationSentCounter = new Counter({
  name: "notification_sent_total",
  help: "Total number of notifications sent",
  labelNames: ["type"],
});

export const notificationFailedCounter = new Counter({
  name: "notification_failed_total",
  help: "Total number of failed notifications",
  labelNames: ["type", "error"],
});

export const notificationLatency = new Histogram({
  name: "notification_latency_seconds",
  help: "Time taken to send notifications",
  labelNames: ["type"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Middleware to expose metrics endpoint
export const metricsMiddleware = async (req: any, res: any) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};
