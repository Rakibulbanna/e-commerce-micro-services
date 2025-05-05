import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

// Initialize Prometheus metrics
collectDefaultMetrics();
register.setDefaultLabels({
  app: 'payment-service'
});

// Define metrics
export const paymentProcessedCounter = new Counter({
  name: 'payment_processed_total',
  help: 'Total number of payments processed',
  labelNames: ['status']
});

export const paymentFailedCounter = new Counter({
  name: 'payment_failed_total',
  help: 'Total number of failed payments',
  labelNames: ['error']
});

export const paymentLatency = new Histogram({
  name: 'payment_latency_seconds',
  help: 'Time taken to process payments',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware to expose metrics endpoint
export const metricsMiddleware = async (req: any, res: any) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

// Register metrics
export const registerMetrics = () => {
  // Metrics are automatically registered when created
  console.log('Metrics registered successfully');
}; 