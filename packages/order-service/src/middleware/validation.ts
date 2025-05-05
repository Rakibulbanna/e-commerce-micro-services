import { Request, Response, NextFunction } from "express";
import Ajv from "ajv";
import { AppError } from "./errorHandler";

const ajv = new Ajv();

// Schema for creating an order
const createOrderSchema = {
  type: "object",
  properties: {
    customerId: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productId: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
        },
        required: ["productId", "quantity"],
      },
    },
    shippingAddress: {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        country: { type: "string" },
        zipCode: { type: "string" },
      },
      required: ["street", "city", "state", "country", "zipCode"],
    },
  },
  required: ["customerId", "items", "shippingAddress"],
};

// Schema for updating order status
const updateOrderStatusSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    },
  },
  required: ["status"],
};

const validateCreateOrder = ajv.compile(createOrderSchema);
const validateUpdateOrderStatus = ajv.compile(updateOrderStatusSchema);

export const validateRequest = (type: "create" | "updateStatus") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validate =
      type === "create" ? validateCreateOrder : validateUpdateOrderStatus;

    if (!validate(req.body)) {
      throw new AppError(400, "Invalid request body");
    }

    next();
  };
};
