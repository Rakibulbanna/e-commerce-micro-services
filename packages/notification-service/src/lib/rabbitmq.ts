import amqp, { Channel, ConsumeMessage } from "amqplib";
import { notificationSentCounter, notificationFailedCounter } from "./metrics";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const NOTIFICATION_EXCHANGE = "notifications";
const NOTIFICATION_QUEUE = "notification_queue";
const NOTIFICATION_ROUTING_KEY = "notification";

let channel: Channel;

export async function connect() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange(NOTIFICATION_EXCHANGE, "direct", {
      durable: true,
    });

    // Declare queue
    await channel.assertQueue(NOTIFICATION_QUEUE, {
      durable: true,
    });

    // Bind queue to exchange
    await channel.bindQueue(
      NOTIFICATION_QUEUE,
      NOTIFICATION_EXCHANGE,
      NOTIFICATION_ROUTING_KEY
    );

    // Set up consumer
    channel.consume(NOTIFICATION_QUEUE, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          // Process notification here
          console.log("Processing notification:", content);

          // Increment success counter
          notificationSentCounter.inc({ type: content.type });

          channel.ack(msg);
        } catch (error) {
          console.error("Error processing notification:", error);
          // Increment failure counter
          notificationFailedCounter.inc({
            type: "unknown",
            error: error instanceof Error ? error.message : "Unknown error",
          });
          channel.nack(msg, false, false);
        }
      }
    });

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    throw error;
  }
}

export async function publishMessage(message: any) {
  try {
    const buffer = Buffer.from(JSON.stringify(message));
    channel.publish(NOTIFICATION_EXCHANGE, NOTIFICATION_ROUTING_KEY, buffer, {
      persistent: true,
    });
  } catch (error) {
    console.error("Failed to publish message:", error);
    throw error;
  }
}
