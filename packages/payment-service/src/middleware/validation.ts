import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv';

const ajv = new Ajv();

const paymentSchema = {
  type: 'object',
  properties: {
    amount: { type: 'number', minimum: 0 },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
    paymentMethod: { type: 'string', enum: ['credit_card', 'debit_card', 'paypal'] },
    orderId: { type: 'string' },
    customerId: { type: 'string' }
  },
  required: ['amount', 'currency', 'paymentMethod', 'orderId', 'customerId'],
  additionalProperties: false
};

const validatePayment = ajv.compile(paymentSchema);

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const valid = validatePayment(req.body);
    if (!valid) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validatePayment.errors
      });
    }
  }
  next();
}; 