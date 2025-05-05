const amqp = require("amqplib");
const { metrics } = require("./metrics");

class RabbitMQ {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(process.env.ORDER_EXCHANGE, "topic", {
        durable: true,
      });

      // Declare queue
      await this.channel.assertQueue(process.env.ORDER_QUEUE, {
        durable: true,
      });

      // Bind queue to exchange
      await this.channel.bindQueue(
        process.env.ORDER_QUEUE,
        process.env.ORDER_EXCHANGE,
        process.env.ORDER_ROUTING_KEY
      );

      // Set up error handlers
      this.connection.on("error", this.handleError.bind(this));
      this.connection.on("close", this.handleClose.bind(this));

      // Reset retry count on successful connection
      this.retryCount = 0;

      console.log("RabbitMQ connected successfully");
      return this.channel;
    } catch (error) {
      console.error("RabbitMQ connection error:", error);
      metrics.rabbitmqConnectionFailed.inc();
      await this.handleError(error);
    }
  }

  async handleError(error) {
    console.error("RabbitMQ error:", error);

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(
        `Retrying connection (${this.retryCount}/${this.maxRetries})...`
      );

      setTimeout(() => {
        this.connect();
      }, this.retryDelay);
    } else {
      console.error("Max retries reached. Please check RabbitMQ connection.");
      process.exit(1);
    }
  }

  async handleClose() {
    console.log("RabbitMQ connection closed");
    await this.handleError(new Error("Connection closed"));
  }

  async publish(exchange, routingKey, message) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel.assertExchange(exchange, "topic", { durable: true });
      this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      console.log(`Published message to ${routingKey}:`, message);
    } catch (error) {
      console.error("Error publishing message:", error);
      metrics.messagePublishFailed.inc();
      throw error;
    }
  }

  async consume(queue, callback) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel.assertQueue(queue, { durable: true });
      this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel.ack(msg);
          } catch (error) {
            console.error("Error processing message:", error);
            // Reject message and requeue
            this.channel.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      console.error("Error setting up consumer:", error);
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
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }
}

module.exports = new RabbitMQ();
