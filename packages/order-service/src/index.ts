import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { registerMetrics, metricsMiddleware } from "./lib/metrics";
import { connect as connectRabbitMQ } from "./lib/rabbitmq";
import orderRoutes from "./routes/orderRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./lib/logger";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));
app.use(metricsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use("/api/orders", orderRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3002;

const start = async () => {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Register metrics
    registerMetrics();

    app.listen(PORT, () => {
      logger.info(`Order service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
