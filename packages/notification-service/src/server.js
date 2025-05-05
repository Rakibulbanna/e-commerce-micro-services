require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rabbitmq = require("./lib/rabbitmq");
const emailService = require("./services/emailService");
const smsService = require("./services/smsService");
const { register, metrics } = require("./lib/metrics");

const app = express();
const PORT = process.env.PORT || 3006;
const PROMETHEUS_PORT = process.env.PROMETHEUS_PORT || 9090;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json());

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("Notification Service OK");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Start server
const server = app.listen(PORT, async () => {
  try {
    // Connect to RabbitMQ
    await rabbitmq.connect();

    // Set up RabbitMQ consumers
    await rabbitmq.consume("order.placed", async (message) => {
      const timer = metrics.responseTime.startTimer({ type: "order_placed" });
      try {
        const { order, user } = message;

        // Send notifications
        await Promise.all([
          emailService.sendOrderConfirmation(order, user),
          smsService.sendOrderConfirmation(order, user),
        ]);

        metrics.messageProcessed.inc({ type: "order_placed" });
        timer();
      } catch (error) {
        console.error("Error processing order.placed:", error);
        metrics.messageError.inc({ type: "order_placed" });
        timer();
      }
    });

    await rabbitmq.consume("payment.success", async (message) => {
      const timer = metrics.responseTime.startTimer({
        type: "payment_success",
      });
      try {
        const { order, user } = message;

        // Send notifications
        await Promise.all([
          emailService.sendPaymentConfirmation(order, user),
          smsService.sendPaymentConfirmation(order, user),
        ]);

        metrics.messageProcessed.inc({ type: "payment_success" });
        timer();
      } catch (error) {
        console.error("Error processing payment.success:", error);
        metrics.messageError.inc({ type: "payment_success" });
        timer();
      }
    });

    await rabbitmq.consume("order.shipped", async (message) => {
      const timer = metrics.responseTime.startTimer({ type: "order_shipped" });
      try {
        const { order, user } = message;

        // Send notifications
        await Promise.all([
          emailService.sendShippingConfirmation(order, user),
          smsService.sendShippingConfirmation(order, user),
        ]);

        metrics.messageProcessed.inc({ type: "order_shipped" });
        timer();
      } catch (error) {
        console.error("Error processing order.shipped:", error);
        metrics.messageError.inc({ type: "order_shipped" });
        timer();
      }
    });

    console.log(`Notification Service running on port ${PORT}`);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down gracefully...");

  server.close(async () => {
    try {
      await rabbitmq.close();
      console.log("Server closed");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
