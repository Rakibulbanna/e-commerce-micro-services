import { Request, Response, NextFunction } from "express";
import { Counter, Histogram } from "prom-client";

// Create metrics
const orderCreatedTotal = new Counter({
  name: "order_created_total",
  help: "Total number of orders created",
});

const orderCreationFailedTotal = new Counter({
  name: "order_creation_failed_total",
  help: "Total number of failed order creations",
});

const orderStatusUpdatedTotal = new Counter({
  name: "order_status_updated_total",
  help: "Total number of order status updates",
});

const shippingStatusUpdatedTotal = new Counter({
  name: "shipping_status_updated_total",
  help: "Total number of shipping status updates",
});

const paymentStatusUpdatedTotal = new Counter({
  name: "payment_status_updated_total",
  help: "Total number of payment status updates",
});

const orderProcessingDuration = new Histogram({
  name: "order_processing_duration_seconds",
  help: "Duration of order processing in seconds",
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Middleware to track request duration
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    orderProcessingDuration.observe(duration);
  });
  next();
};

// Export metrics for use in other files
export const metrics = {
  orderCreatedTotal,
  orderCreationFailedTotal,
  orderStatusUpdatedTotal,
  shippingStatusUpdatedTotal,
  paymentStatusUpdatedTotal,
  orderProcessingDuration,
};

// Register metrics
export const registerMetrics = () => {
  // Metrics are automatically registered when created
  console.log("Metrics registered successfully");
};
