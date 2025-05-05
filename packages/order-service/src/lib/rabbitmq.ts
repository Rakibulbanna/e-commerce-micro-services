import amqp from "amqplib";
import { logger } from "./logger";

let channel: amqp.Channel;

export const connect = async () => {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    channel = await connection.createChannel();

    // Declare queues
    await channel.assertQueue("order_created", { durable: true });
    await channel.assertQueue("order_status_updated", { durable: true });
    await channel.assertQueue("shipping_status_updated", { durable: true });
    await channel.assertQueue("payment_status_updated", { durable: true });

    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ:", error);
    throw error;
  }
};

export const publishMessage = async (queue: string, message: any) => {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    logger.info(`Message published to queue ${queue}`);
  } catch (error) {
    logger.error(`Failed to publish message to queue ${queue}:`, error);
    throw error;
  }
};

export const consumeMessage = async (
  queue: string,
  callback: (message: any) => Promise<void>
) => {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not initialized");
    }
    await channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing message from queue ${queue}:`, error);
          channel.nack(msg);
        }
      }
    });
    logger.info(`Started consuming messages from queue ${queue}`);
  } catch (error) {
    logger.error(`Failed to consume messages from queue ${queue}:`, error);
    throw error;
  }
};
