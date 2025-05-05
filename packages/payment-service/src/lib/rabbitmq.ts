import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { paymentProcessedCounter, paymentFailedCounter } from './metrics';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const PAYMENT_EXCHANGE = 'payments';
const PAYMENT_QUEUE = 'payment_queue';
const PAYMENT_ROUTING_KEY = 'payment';

let channel: Channel;

export async function connect() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange(PAYMENT_EXCHANGE, 'direct', {
      durable: true
    });

    // Declare queue
    await channel.assertQueue(PAYMENT_QUEUE, {
      durable: true
    });

    // Bind queue to exchange
    await channel.bindQueue(
      PAYMENT_QUEUE,
      PAYMENT_EXCHANGE,
      PAYMENT_ROUTING_KEY
    );

    // Set up consumer
    channel.consume(PAYMENT_QUEUE, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          // Process payment here
          console.log('Processing payment:', content);
          
          // Increment success counter
          paymentProcessedCounter.inc({ status: 'success' });
          
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing payment:', error);
          // Increment failure counter
          paymentFailedCounter.inc({ 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          channel.nack(msg, false, false);
        }
      }
    });

    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function publishMessage(message: any) {
  try {
    const buffer = Buffer.from(JSON.stringify(message));
    channel.publish(
      PAYMENT_EXCHANGE,
      PAYMENT_ROUTING_KEY,
      buffer,
      { persistent: true }
    );
  } catch (error) {
    console.error('Failed to publish message:', error);
    throw error;
  }
} 