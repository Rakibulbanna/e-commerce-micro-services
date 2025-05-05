const client = require("prom-client");

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Order metrics
const orderCreated = new client.Counter({
  name: "order_created_total",
  help: "Total number of orders created",
});

const orderCreationFailed = new client.Counter({
  name: "order_creation_failed_total",
  help: "Total number of failed order creations",
});

const orderFetchFailed = new client.Counter({
  name: "order_fetch_failed_total",
  help: "Total number of failed order fetches",
});

const orderUpdateFailed = new client.Counter({
  name: "order_update_failed_total",
  help: "Total number of failed order updates",
});

const orderStatusUpdated = new client.Counter({
  name: "order_status_updated_total",
  help: "Total number of order status updates",
  labelNames: ["status"],
});

const shippingStatusUpdated = new client.Counter({
  name: "shipping_status_updated_total",
  help: "Total number of shipping status updates",
  labelNames: ["status"],
});

const shippingUpdateFailed = new client.Counter({
  name: "shipping_update_failed_total",
  help: "Total number of failed shipping updates",
});

const paymentStatusUpdated = new client.Counter({
  name: "payment_status_updated_total",
  help: "Total number of payment status updates",
  labelNames: ["status"],
});

const paymentUpdateFailed = new client.Counter({
  name: "payment_update_failed_total",
  help: "Total number of failed payment updates",
});

const metricsFetchFailed = new client.Counter({
  name: "metrics_fetch_failed_total",
  help: "Total number of failed metrics fetches",
});

// Register metrics
register.registerMetric(orderCreated);
register.registerMetric(orderCreationFailed);
register.registerMetric(orderFetchFailed);
register.registerMetric(orderUpdateFailed);
register.registerMetric(orderStatusUpdated);
register.registerMetric(shippingStatusUpdated);
register.registerMetric(shippingUpdateFailed);
register.registerMetric(paymentStatusUpdated);
register.registerMetric(paymentUpdateFailed);
register.registerMetric(metricsFetchFailed);

module.exports = {
  register,
  metrics: {
    orderCreated,
    orderCreationFailed,
    orderFetchFailed,
    orderUpdateFailed,
    orderStatusUpdated,
    shippingStatusUpdated,
    shippingUpdateFailed,
    paymentStatusUpdated,
    paymentUpdateFailed,
    metricsFetchFailed,
  },
};
