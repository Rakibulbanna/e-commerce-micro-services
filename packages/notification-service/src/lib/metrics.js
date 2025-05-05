const client = require("prom-client");

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const metrics = {
  // Email metrics
  emailSent: new client.Counter({
    name: "notification_email_sent_total",
    help: "Total number of emails sent",
    labelNames: ["type"],
  }),

  emailError: new client.Counter({
    name: "notification_email_error_total",
    help: "Total number of email sending errors",
    labelNames: ["type"],
  }),

  emailRetry: new client.Counter({
    name: "notification_email_retry_total",
    help: "Total number of email retry attempts",
    labelNames: ["type", "attempt"],
  }),

  emailRateLimited: new client.Counter({
    name: "notification_email_rate_limited_total",
    help: "Total number of rate-limited email requests",
    labelNames: ["type"],
  }),

  // SMS metrics
  smsSent: new client.Counter({
    name: "notification_sms_sent_total",
    help: "Total number of SMS sent",
    labelNames: ["type"],
  }),

  smsError: new client.Counter({
    name: "notification_sms_error_total",
    help: "Total number of SMS sending errors",
    labelNames: ["type"],
  }),

  smsRetry: new client.Counter({
    name: "notification_sms_retry_total",
    help: "Total number of SMS retry attempts",
    labelNames: ["type", "attempt"],
  }),

  smsRateLimited: new client.Counter({
    name: "notification_sms_rate_limited_total",
    help: "Total number of rate-limited SMS requests",
    labelNames: ["type"],
  }),

  // Rate limiter metrics
  rateLimiterQueueSize: new client.Gauge({
    name: "notification_rate_limiter_queue_size",
    help: "Current size of rate limiter queues",
    labelNames: ["service"],
  }),

  rateLimiterTokens: new client.Gauge({
    name: "notification_rate_limiter_tokens",
    help: "Current number of available tokens",
    labelNames: ["service"],
  }),

  // Circuit breaker metrics
  circuitBreakerState: new client.Gauge({
    name: "notification_circuit_breaker_state",
    help: "Current state of circuit breaker (0=CLOSED, 1=OPEN, 2=HALF_OPEN)",
    labelNames: ["service"],
  }),

  circuitBreakerFailures: new client.Counter({
    name: "notification_circuit_breaker_failures_total",
    help: "Total number of circuit breaker failures",
    labelNames: ["service"],
  }),

  // Notification queue metrics
  notificationQueueSize: new client.Gauge({
    name: "notification_queue_size",
    help: "Current size of notification queue",
    labelNames: ["type"],
  }),

  notificationQueueFull: new client.Counter({
    name: "notification_queue_full_total",
    help: "Total number of times queue was full",
    labelNames: ["type"],
  }),

  notificationProcessed: new client.Counter({
    name: "notification_processed_total",
    help: "Total number of notifications processed",
    labelNames: ["type"],
  }),

  notificationError: new client.Counter({
    name: "notification_error_total",
    help: "Total number of notification processing errors",
    labelNames: ["type"],
  }),

  notificationProcessingTime: new client.Histogram({
    name: "notification_processing_time_seconds",
    help: "Time taken to process notifications",
    labelNames: ["type"],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),

  // Notification preferences metrics
  notificationPreferencesUpdated: new client.Counter({
    name: "notification_preferences_updated_total",
    help: "Total number of notification preferences updates",
  }),

  notificationPreferencesBulkUpdated: new client.Counter({
    name: "notification_preferences_bulk_updated_total",
    help: "Total number of bulk notification preferences updates",
    labelNames: ["count"],
  }),

  notificationPreferencesError: new client.Counter({
    name: "notification_preferences_error_total",
    help: "Total number of notification preferences errors",
    labelNames: ["operation"],
  }),

  // Template metrics
  templateCreated: new client.Counter({
    name: "notification_template_created_total",
    help: "Total number of templates created",
  }),

  templateUpdated: new client.Counter({
    name: "notification_template_updated_total",
    help: "Total number of templates updated",
  }),

  templateDeactivated: new client.Counter({
    name: "notification_template_deactivated_total",
    help: "Total number of templates deactivated",
  }),

  templateRendered: new client.Counter({
    name: "notification_template_rendered_total",
    help: "Total number of templates rendered",
    labelNames: ["type", "channel"],
  }),

  templateBulkCreated: new client.Counter({
    name: "notification_template_bulk_created_total",
    help: "Total number of templates created in bulk",
    labelNames: ["count"],
  }),

  templateError: new client.Counter({
    name: "notification_template_error_total",
    help: "Total number of template operation errors",
    labelNames: ["operation"],
  }),

  // Scheduled notification metrics
  scheduledNotificationCreated: new client.Counter({
    name: "notification_scheduled_created_total",
    help: "Total number of scheduled notifications created",
  }),

  scheduledNotificationBulkCreated: new client.Counter({
    name: "notification_scheduled_bulk_created_total",
    help: "Total number of scheduled notifications created in bulk",
    labelNames: ["count"],
  }),

  scheduledNotificationCancelled: new client.Counter({
    name: "notification_scheduled_cancelled_total",
    help: "Total number of scheduled notifications cancelled",
  }),

  scheduledNotificationRescheduled: new client.Counter({
    name: "notification_scheduled_rescheduled_total",
    help: "Total number of scheduled notifications rescheduled",
  }),

  scheduledNotificationProcessed: new client.Counter({
    name: "notification_scheduled_processed_total",
    help: "Total number of scheduled notifications processed",
  }),

  scheduledNotificationError: new client.Counter({
    name: "notification_scheduled_error_total",
    help: "Total number of scheduled notification errors",
    labelNames: ["operation"],
  }),

  // RabbitMQ metrics
  messageProcessed: new client.Counter({
    name: "notification_message_processed_total",
    help: "Total number of messages processed",
    labelNames: ["type"],
  }),

  messageError: new client.Counter({
    name: "notification_message_error_total",
    help: "Total number of message processing errors",
    labelNames: ["type"],
  }),

  // Response time metrics
  responseTime: new client.Histogram({
    name: "notification_response_time_seconds",
    help: "Response time in seconds",
    labelNames: ["type"],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
};

// Register custom metrics
Object.values(metrics).forEach((metric) => register.registerMetric(metric));

module.exports = {
  register,
  metrics,
};
