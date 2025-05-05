import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import { metricsMiddleware } from "./lib/metrics";
import { connect as connectRabbitMQ } from "./lib/rabbitmq";
import notificationRoutes from "./routes/notificationRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { validateRequest } from "./middleware/validation";
import { authenticate } from "./middleware/auth";

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
app.use(
  "/api/notifications",
  authenticate,
  validateRequest,
  notificationRoutes
);
app.get("/metrics", metricsMiddleware);
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Error handling
app.use(errorHandler);

// Initialize services
async function init() {
  try {
    await connectRabbitMQ();
    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
  init();
});
