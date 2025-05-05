import { Request, Response, NextFunction } from "express";
import Ajv from "ajv";

const ajv = new Ajv();

const notificationSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["email", "sms", "push"] },
    recipient: { type: "string" },
    subject: { type: "string" },
    content: { type: "string" },
  },
  required: ["type", "recipient", "content"],
  additionalProperties: false,
};

const validateNotification = ajv.compile(notificationSchema);

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method === "POST" || req.method === "PUT") {
    const valid = validateNotification(req.body);
    if (!valid) {
      return res.status(400).json({
        error: "Invalid request body",
        details: validateNotification.errors,
      });
    }
  }
  next();
};
