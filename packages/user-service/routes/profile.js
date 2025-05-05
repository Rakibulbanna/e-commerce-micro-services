const express = require("express");
const User = require("../models/User");
// const authMiddleware = require('../middleware/auth'); // We will add this later

const router = express.Router();

// GET /api/users/profile/:userId
// Initially, getting any user profile without auth
// Later, this might be GET /api/users/me and use auth middleware
router.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash"); // Exclude password hash

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    if (error.kind === "ObjectId") {
      // Handle invalid MongoDB ObjectId format
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    res.status(500).json({ message: "Server error fetching profile" });
  }
});

// PUT /api/users/profile/:userId
// Initially, updating any user profile without auth
// Later, this should be protected and likely operate on the logged-in user
router.put("/profile/:userId", async (req, res) => {
  const { firstName, lastName, ...otherUpdates } = req.body;
  const allowedUpdates = { firstName, lastName }; // Only allow specific fields for now

  // Prevent updating sensitive fields like email or password here
  if (Object.keys(otherUpdates).length > 0) {
    return res.status(400).json({
      message: "Only firstName and lastName can be updated via this endpoint.",
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true, context: "query" } // return updated doc, run schema validators
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Server error updating profile" });
  }
});

module.exports = router;
