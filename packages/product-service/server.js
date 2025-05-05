require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust later for security)
app.use(express.json()); // Parse JSON bodies

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Product Service MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Routes
app.use("/api/products", productRoutes);

// Basic health check route
app.get("/health", (req, res) => {
  res.status(200).send("Product Service OK");
});

// Start Server
app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});
