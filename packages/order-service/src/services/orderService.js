const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const {
  OrderStatus,
  PaymentStatus,
  ShippingStatus,
} = require("@prisma/client");
const { publishMessage } = require("../lib/rabbitmq");
const { metrics } = require("../lib/metrics");

class OrderService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async createOrder(data) {
    try {
      // Validate user exists
      await this.validateUser(data.userId);

      // Get product details and calculate prices
      const { items, totalAmount } = await this.calculateOrderAmount(
        data.items
      );

      // Create order with calculated amounts
      const order = await this.prisma.order.create({
        data: {
          userId: data.userId,
          status: OrderStatus.PENDING,
          totalAmount,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
          shipping: {
            create: {
              addressId: data.shipping.addressId,
              method: data.shipping.method,
            },
          },
          payment: {
            create: {
              method: data.payment.method,
              amount: totalAmount,
            },
          },
          metadata: data.metadata,
        },
        include: {
          items: true,
          shipping: {
            include: {
              address: true,
            },
          },
          payment: true,
        },
      });

      // Publish order created event
      await publishMessage("order.created", {
        orderId: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
      });

      metrics.orderCreated.inc();
      return order;
    } catch (error) {
      metrics.orderCreationFailed.inc();
      throw error;
    }
  }

  async getOrderById(id) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          shipping: {
            include: {
              address: true,
            },
          },
          payment: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      metrics.orderFetchFailed.inc();
      throw error;
    }
  }

  async getUserOrders(userId, filters = {}) {
    try {
      const where = {
        userId,
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate &&
          filters.endDate && {
            createdAt: {
              gte: new Date(filters.startDate),
              lte: new Date(filters.endDate),
            },
          }),
      };

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          items: true,
          shipping: {
            include: {
              address: true,
            },
          },
          payment: true,
        },
        skip: filters.page ? (filters.page - 1) * (filters.limit || 10) : 0,
        take: filters.limit || 10,
        orderBy: { createdAt: "desc" },
      });

      return orders;
    } catch (error) {
      metrics.orderFetchFailed.inc();
      throw error;
    }
  }

  async updateOrderStatus(id, data) {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: {
          status: data.status,
          metadata: data.metadata,
          version: { increment: 1 },
        },
        include: {
          items: true,
          shipping: {
            include: {
              address: true,
            },
          },
          payment: true,
        },
      });

      // Publish order status updated event
      await publishMessage("order.status.updated", {
        orderId: order.id,
        status: order.status,
        userId: order.userId,
      });

      metrics.orderStatusUpdated.inc();
      return order;
    } catch (error) {
      metrics.orderUpdateFailed.inc();
      throw error;
    }
  }

  async updateShippingStatus(id, data) {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: {
          shipping: {
            update: {
              status: data.status,
              trackingNumber: data.trackingNumber,
              estimatedDelivery: data.estimatedDelivery,
              actualDelivery: data.actualDelivery,
              metadata: data.metadata,
            },
          },
          version: { increment: 1 },
        },
        include: {
          items: true,
          shipping: {
            include: {
              address: true,
            },
          },
          payment: true,
        },
      });

      // Publish shipping status updated event
      await publishMessage("order.shipping.updated", {
        orderId: order.id,
        status: order.shipping.status,
        userId: order.userId,
      });

      metrics.shippingStatusUpdated.inc();
      return order;
    } catch (error) {
      metrics.shippingUpdateFailed.inc();
      throw error;
    }
  }

  async updatePaymentStatus(id, data) {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: {
          payment: {
            update: {
              status: data.status,
              transactionId: data.transactionId,
              metadata: data.metadata,
            },
          },
          version: { increment: 1 },
        },
        include: {
          items: true,
          shipping: {
            include: {
              address: true,
            },
          },
          payment: true,
        },
      });

      // Publish payment status updated event
      await publishMessage("order.payment.updated", {
        orderId: order.id,
        status: order.payment.status,
        userId: order.userId,
      });

      metrics.paymentStatusUpdated.inc();
      return order;
    } catch (error) {
      metrics.paymentUpdateFailed.inc();
      throw error;
    }
  }

  async getMetrics() {
    try {
      const [
        totalOrders,
        totalRevenue,
        ordersByStatus,
        ordersByPaymentMethod,
        ordersByShippingMethod,
      ] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _sum: {
            totalAmount: true,
          },
        }),
        this.prisma.order.groupBy({
          by: ["status"],
          _count: true,
        }),
        this.prisma.order.groupBy({
          by: ["payment.method"],
          _count: true,
        }),
        this.prisma.order.groupBy({
          by: ["shipping.method"],
          _count: true,
        }),
      ]);

      return {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        averageOrderValue:
          totalOrders > 0
            ? (totalRevenue._sum.totalAmount || 0) / totalOrders
            : 0,
        ordersByStatus: ordersByStatus.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.status]: curr._count,
          }),
          {}
        ),
        ordersByPaymentMethod: ordersByPaymentMethod.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.method]: curr._count,
          }),
          {}
        ),
        ordersByShippingMethod: ordersByShippingMethod.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.method]: curr._count,
          }),
          {}
        ),
      };
    } catch (error) {
      metrics.metricsFetchFailed.inc();
      throw error;
    }
  }

  async validateUser(userId) {
    try {
      const response = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/users/${userId}`
      );
      return response.data;
    } catch (error) {
      throw new Error("Invalid user");
    }
  }

  async calculateOrderAmount(items) {
    try {
      const productDetails = await Promise.all(
        items.map(async (item) => {
          const response = await axios.get(
            `${process.env.PRODUCT_SERVICE_URL}/products/${item.productId}`
          );
          return {
            ...item,
            unitPrice: response.data.price,
            totalPrice: response.data.price * item.quantity,
          };
        })
      );

      const totalAmount = productDetails.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      return { items: productDetails, totalAmount };
    } catch (error) {
      throw new Error("Failed to calculate order amount");
    }
  }
}

module.exports = new OrderService();
