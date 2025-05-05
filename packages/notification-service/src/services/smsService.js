const twilio = require("twilio");
const { metrics } = require("../lib/metrics");
const RetryHandler = require("../lib/retry");
const rateLimiters = require("../lib/rateLimiter");

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.retryHandler = new RetryHandler(3, 1000); // 3 retries, 1s initial delay
  }

  async sendOrderConfirmation(order, user) {
    try {
      // Acquire rate limit token before sending
      await rateLimiters.twilio.acquire();

      const message = await this.retryHandler.execute(
        () =>
          this.client.messages.create({
            body: `Thank you for your order #${order.id}! Total: $${order.totalAmount}. We'll notify you when it ships.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone,
          }),
        { type: "sms_order_confirmation", orderId: order.id, userId: user.id }
      );

      metrics.smsSent.inc({ type: "order_confirmation" });
      return message;
    } catch (error) {
      console.error("Error sending order confirmation SMS:", error);
      metrics.smsError.inc({ type: "order_confirmation" });
      throw error;
    }
  }

  async sendPaymentConfirmation(order, user) {
    try {
      // Acquire rate limit token before sending
      await rateLimiters.twilio.acquire();

      const message = await this.retryHandler.execute(
        () =>
          this.client.messages.create({
            body: `Payment received for order #${order.id}. Amount: $${order.totalAmount}.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone,
          }),
        { type: "sms_payment_confirmation", orderId: order.id, userId: user.id }
      );

      metrics.smsSent.inc({ type: "payment_confirmation" });
      return message;
    } catch (error) {
      console.error("Error sending payment confirmation SMS:", error);
      metrics.smsError.inc({ type: "payment_confirmation" });
      throw error;
    }
  }

  async sendShippingConfirmation(order, user) {
    try {
      // Acquire rate limit token before sending
      await rateLimiters.twilio.acquire();

      const message = await this.retryHandler.execute(
        () =>
          this.client.messages.create({
            body: `Your order #${order.id} has been shipped! Track your package at: ${order.trackingUrl}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone,
          }),
        {
          type: "sms_shipping_confirmation",
          orderId: order.id,
          userId: user.id,
        }
      );

      metrics.smsSent.inc({ type: "shipping_confirmation" });
      return message;
    } catch (error) {
      console.error("Error sending shipping confirmation SMS:", error);
      metrics.smsError.inc({ type: "shipping_confirmation" });
      throw error;
    }
  }
}

module.exports = new SMSService();
