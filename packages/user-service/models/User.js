const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"], // Store hash, but input validation is useful
    },
    // Add other profile fields as needed later
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Pre-save hook to hash password before saving (only if modified)
// Note: This is often handled in the route handler for more control,
// but can be done here too.
// We will hash in the route handler based on the plan.

// Method to compare password for login
// IMPORTANT: We compare in the route handler, not adding methods here yet
// to keep the model focused on data structure.

const User = mongoose.model("User", userSchema);

module.exports = User;
