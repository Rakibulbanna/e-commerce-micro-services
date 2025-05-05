import { Router } from 'express';
import { publishMessage } from '../lib/rabbitmq';
import { paymentProcessedCounter, paymentFailedCounter } from '../lib/metrics';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const payment = {
      amount: req.body.amount,
      currency: req.body.currency,
      paymentMethod: req.body.paymentMethod,
      orderId: req.body.orderId,
      customerId: req.body.customerId
    };

    await publishMessage(payment);
    paymentProcessedCounter.inc({ status: 'pending' });

    res.status(201).json({
      message: 'Payment queued successfully',
      payment
    });
  } catch (error) {
    console.error('Failed to queue payment:', error);
    paymentFailedCounter.inc({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to queue payment' });
  }
});

export default router; 