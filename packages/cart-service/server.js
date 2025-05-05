require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cartRoutes = require("./routes/cart");

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/cart", cartRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("Cart Service OK");
});

// Start server
app.listen(PORT, () => {
  console.log(`Cart Service running on port ${PORT}`);
});
