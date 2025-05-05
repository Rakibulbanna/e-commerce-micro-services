require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust later for security)
app.use(express.json()); // Parse JSON bodies

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("User Service MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Routes
app.use("/api/users", authRoutes);
app.use("/api/users", profileRoutes); // Assuming profile routes also start with /api/users

// Basic health check route
app.get("/health", (req, res) => {
  res.status(200).send("User Service OK");
});

// Start Server
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
