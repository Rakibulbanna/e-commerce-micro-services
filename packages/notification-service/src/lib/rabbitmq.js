const amqp = require("amqplib");

class RabbitMQ {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = new Set();
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Handle connection errors
      this.connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err);
        this.reconnect();
      });

      this.connection.on("close", () => {
        console.log("RabbitMQ connection closed");
        this.reconnect();
      });

      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error("Error connecting to RabbitMQ:", error);
      throw error;
    }
  }

  async reconnect() {
    try {
      if (this.connection) {
        await this.connection.close();
      }

      console.log("Attempting to reconnect to RabbitMQ...");
      await this.connect();

      // Re-establish queues and consumers
      for (const queue of this.queues) {
        await this.consume(queue.name, queue.handler);
      }
    } catch (error) {
      console.error("Error reconnecting to RabbitMQ:", error);
      // Retry after 5 seconds
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  async consume(queueName, handler) {
    try {
      if (!this.channel) {
        throw new Error("Channel not initialized");
      }

      // Assert queue exists
      await this.channel.assertQueue(queueName, {
        durable: true,
      });

      // Store queue info for reconnection
      this.queues.add({ name: queueName, handler });

      // Consume messages
      await this.channel.consume(queueName, async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            this.channel.ack(msg);
          } catch (error) {
            console.error(`Error processing message from ${queueName}:`, error);
            // Reject message and requeue
            this.channel.nack(msg, false, true);
          }
        }
      });

      console.log(`Started consuming from queue: ${queueName}`);
    } catch (error) {
      console.error(`Error setting up consumer for ${queueName}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("RabbitMQ connection closed");
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
      throw error;
    }
  }
}
