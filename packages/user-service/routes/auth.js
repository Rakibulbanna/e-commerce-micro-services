const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// POST /api/users/register
router.post("/register", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  // Consider adding more robust validation (e.g., using a library like Joi or express-validator)
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" }); // 409 Conflict
    }

    // Hash password
    const salt = await bcrypt.genSalt(10); // Salt rounds as planned
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    await newUser.save();

    // Exclude password hash from response
    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;

    res
      .status(201)
      .json({ message: "User registered successfully", user: userResponse });
  } catch (error) {
    console.error("Registration error:", error);
    // Mongoose validation error
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Server error during registration" });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" }); // Use generic message
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" }); // Use generic message
    }

    // Login successful
    // TODO: Implement token generation (JWT/OAuth) in Phase 6

    // Exclude password hash from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res
      .status(200)
      .json({
        message: "Login successful",
        user: userResponse /* , token: 'your_jwt_token_here' */,
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;
