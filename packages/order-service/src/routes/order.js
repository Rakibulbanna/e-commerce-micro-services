const express = require("express");
const router = express.Router();
const orderService = require("../services/orderService");
const { validateToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { metrics } = require("../lib/metrics");

// Create order
router.post(
  "/",
  validateToken,
  validateRequest({
    body: {
      type: "object",
      required: ["items", "shipping", "payment"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["productId", "quantity"],
            properties: {
              productId: { type: "string" },
              quantity: { type: "number", minimum: 1 },
            },
          },
        },
        shipping: {
          type: "object",
          required: ["addressId", "method"],
          properties: {
            addressId: { type: "string" },
            method: { type: "string" },
          },
        },
        payment: {
          type: "object",
          required: ["method"],
          properties: {
            method: { type: "string" },
          },
        },
        metadata: { type: "object" },
      },
    },
  }),
  async (req, res) => {
    try {
      const order = await orderService.createOrder({
        ...req.body,
        userId: req.user.id,
      });
      res.status(201).json(order);
    } catch (error) {
      metrics.orderCreationFailed.inc();
      res.status(400).json({ error: error.message });
    }
  }
);

// Get order by ID
router.get("/:id", validateToken, async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.json(order);
  } catch (error) {
    metrics.orderFetchFailed.inc();
    res.status(404).json({ error: error.message });
  }
});

// Get user orders
router.get(
  "/user/orders",
  validateToken,
  validateRequest({
    query: {
      type: "object",
      properties: {
        status: { type: "string" },
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time" },
        page: { type: "number", minimum: 1 },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
    },
  }),
  async (req, res) => {
    try {
      const orders = await orderService.getUserOrders(req.user.id, req.query);
      res.json(orders);
    } catch (error) {
      metrics.orderFetchFailed.inc();
      res.status(400).json({ error: error.message });
    }
  }
);

// Update order status
router.patch(
  "/:id/status",
  validateToken,
  validateRequest({
    body: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: [
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "REFUNDED",
          ],
        },
        metadata: { type: "object" },
      },
    },
  }),
  async (req, res) => {
    try {
      const order = await orderService.updateOrderStatus(
        req.params.id,
        req.body
      );
      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      res.json(order);
    } catch (error) {
      metrics.orderUpdateFailed.inc();
      res.status(400).json({ error: error.message });
    }
  }
);

// Update shipping status
router.patch(
  "/:id/shipping",
  validateToken,
  validateRequest({
    body: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: ["PROCESSING", "SHIPPED", "DELIVERED", "FAILED"],
        },
        trackingNumber: { type: "string" },
        estimatedDelivery: { type: "string", format: "date-time" },
        actualDelivery: { type: "string", format: "date-time" },
        metadata: { type: "object" },
      },
    },
  }),
  async (req, res) => {
    try {
      const order = await orderService.updateShippingStatus(
        req.params.id,
        req.body
      );
      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      res.json(order);
    } catch (error) {
      metrics.shippingUpdateFailed.inc();
      res.status(400).json({ error: error.message });
    }
  }
);

// Update payment status
router.patch(
  "/:id/payment",
  validateToken,
  validateRequest({
    body: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: ["PROCESSING", "COMPLETED", "FAILED", "REFUNDED"],
        },
        transactionId: { type: "string" },
        metadata: { type: "object" },
      },
    },
  }),
  async (req, res) => {
    try {
      const order = await orderService.updatePaymentStatus(
        req.params.id,
        req.body
      );
      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      res.json(order);
    } catch (error) {
      metrics.paymentUpdateFailed.inc();
      res.status(400).json({ error: error.message });
    }
  }
);

// Get order metrics
router.get("/metrics/summary", validateToken, async (req, res) => {
  try {
    const metrics = await orderService.getMetrics();
    res.json(metrics);
  } catch (error) {
    metrics.metricsFetchFailed.inc();
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
