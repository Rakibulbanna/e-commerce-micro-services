import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { register, collectDefaultMetrics } from "prom-client";
import swaggerUi from "swagger-ui-express";
import productRoutes from "./routes/products";
import { swaggerSpec } from "./config/swagger";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Initialize Prometheus metrics
collectDefaultMetrics();
register.setDefaultLabels({
  app: "product-service",
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
});
app.use(limiter);

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Product Service API Documentation",
  })
);

// Routes
app.use("/api/products", productRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Product service listening on port ${PORT}`);
  console.log(
    `Swagger documentation available at http://localhost:${PORT}/api-docs`
  );
});
