const nodemailer = require("nodemailer");
const { metrics } = require("../lib/metrics");
const RetryHandler = require("../lib/retry");
const rateLimiters = require("../lib/rateLimiter");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.retryHandler = new RetryHandler(3, 1000); // 3 retries, 1s initial delay
  }

  async sendOrderConfirmation(order, user) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: `Order Confirmation - Order #${order.id}`,
        html: this.generateOrderConfirmationEmail(order, user),
      };

      // Acquire rate limit token before sending
      await rateLimiters.smtp.acquire();

      await this.retryHandler.execute(
        () => this.transporter.sendMail(mailOptions),
        { type: "email_order_confirmation", orderId: order.id, userId: user.id }
      );

      metrics.emailSent.inc({ type: "order_confirmation" });
    } catch (error) {
      console.error("Error sending order confirmation email:", error);
      metrics.emailError.inc({ type: "order_confirmation" });
      throw error;
    }
  }

  async sendPaymentConfirmation(order, user) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: `Payment Confirmation - Order #${order.id}`,
        html: this.generatePaymentConfirmationEmail(order, user),
      };

      // Acquire rate limit token before sending
      await rateLimiters.smtp.acquire();

      await this.retryHandler.execute(
        () => this.transporter.sendMail(mailOptions),
        {
          type: "email_payment_confirmation",
          orderId: order.id,
          userId: user.id,
        }
      );

      metrics.emailSent.inc({ type: "payment_confirmation" });
    } catch (error) {
      console.error("Error sending payment confirmation email:", error);
      metrics.emailError.inc({ type: "payment_confirmation" });
      throw error;
    }
  }

  async sendShippingConfirmation(order, user) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: `Your Order Has Been Shipped - Order #${order.id}`,
        html: this.generateShippingConfirmationEmail(order, user),
      };

      // Acquire rate limit token before sending
      await rateLimiters.smtp.acquire();

      await this.retryHandler.execute(
        () => this.transporter.sendMail(mailOptions),
        {
          type: "email_shipping_confirmation",
          orderId: order.id,
          userId: user.id,
        }
      );

      metrics.emailSent.inc({ type: "shipping_confirmation" });
    } catch (error) {
      console.error("Error sending shipping confirmation email:", error);
      metrics.emailError.inc({ type: "shipping_confirmation" });
      throw error;
    }
  }

  generateOrderConfirmationEmail(order, user) {
    return `
      <h1>Thank you for your order!</h1>
      <p>Dear ${user.name},</p>
      <p>We're pleased to confirm your order #${order.id} has been received.</p>
      <h2>Order Details:</h2>
      <ul>
        ${order.items
          .map(
            (item) => `
          <li>${item.name} - Quantity: ${item.quantity} - Price: $${item.price}</li>
        `
          )
          .join("")}
      </ul>
      <p><strong>Total Amount: $${order.totalAmount}</strong></p>
      <p>We'll notify you when your order ships.</p>
      <p>Thank you for shopping with us!</p>
    `;
  }

  generatePaymentConfirmationEmail(order, user) {
    return `
      <h1>Payment Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>We've received your payment for order #${order.id}.</p>
      <p><strong>Amount Paid: $${order.totalAmount}</strong></p>
      <p>Your order is now being processed.</p>
      <p>Thank you for your business!</p>
    `;
  }

  generateShippingConfirmationEmail(order, user) {
    return `
      <h1>Your Order Has Been Shipped!</h1>
      <p>Dear ${user.name},</p>
      <p>Great news! Your order #${order.id} has been shipped.</p>
      <p>You can track your package using the following link:</p>
      <p><a href="${order.trackingUrl}">Track Your Package</a></p>
      <p>Thank you for your patience!</p>
    `;
  }
}

module.exports = new EmailService();
