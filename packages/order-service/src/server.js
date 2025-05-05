require("dotenv").config();
const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const rabbitmq = require("./lib/rabbitmq");
const orderRoutes = require("./routes/order");
const paymentService = require("./services/paymentService");
const inventoryService = require("./services/inventoryService");
const cartService = require("./services/cartService");
const orderService = require("./services/orderService");

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/orders", orderRoutes);

// Payment webhook endpoints
app.post("/api/payments/ipn", async (req, res) => {
  try {
    await paymentService.handleWebhook(req.body);
    res.status(200).send("OK");
  } catch (error) {
    console.error("IPN processing error:", error);
    res.status(500).send("Error processing IPN");
  }
});

app.post("/api/payments/success", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/orders/success`);
});

app.post("/api/payments/fail", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/orders/fail`);
});

app.post("/api/payments/cancel", (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/orders/cancel`);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("Order Service OK");
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
    await rabbitmq.consume("payment.success", async (message) => {
      const { orderId, userId } = message;

      try {
        // Update order status
        const order = await orderService.updateOrderStatus(orderId, "PAID");

        // Decrease inventory
        await inventoryService.decreaseStock(order.items);

        // Clear cart
        await cartService.clearCart(userId);

        // Publish order paid event
        await rabbitmq.publish("orders", "order.paid", {
          orderId,
          userId,
        });
      } catch (error) {
        console.error("Error processing payment success:", error);
        // Publish error event
        await rabbitmq.publish("orders", "order.error", {
          orderId,
          userId,
          error: error.message,
        });
      }
    });

    await rabbitmq.consume("payment.failed", async (message) => {
      const { orderId } = message;
      await orderService.updateOrderStatus(orderId, "FAILED");
    });

    console.log(`Order Service running on port ${PORT}`);
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
      await prisma.$disconnect();
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
