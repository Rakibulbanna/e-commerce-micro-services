import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { metrics } from "../lib/metrics";
import { publishMessage } from "../lib/rabbitmq";
import { PrismaClient, OrderStatus } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Create a new order
router.post(
  "/",
  authenticate,
  validateRequest("create"),
  async (req, res, next) => {
    try {
      const order = await prisma.order.create({
        data: {
          userId: req.user!.userId,
          items: {
            create: req.body.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
          status: OrderStatus.PENDING,
          total: req.body.items.reduce(
            (total: number, item: any) => total + item.price * item.quantity,
            0
          ),
        },
      });

      metrics.orderCreatedTotal.inc();
      await publishMessage("order_created", order);

      res.status(201).json(order);
    } catch (error) {
      metrics.orderCreationFailedTotal.inc();
      next(error);
    }
  }
);

// Get all orders for the authenticated user
router.get("/", authenticate, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Get a specific order
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userId !== req.user!.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Update order status (admin only)
router.patch(
  "/:id/status",
  authenticate,
  authorize(["admin"]),
  validateRequest("updateStatus"),
  async (req, res, next) => {
    try {
      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: { status: req.body.status as OrderStatus },
      });

      metrics.orderStatusUpdatedTotal.inc();
      await publishMessage("order_status_updated", order);

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
