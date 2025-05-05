const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true, // For text search
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      index: true, // For text search
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
      index: true, // For filtering
    },
    brand: {
      type: String,
      required: [true, "Product brand is required"],
      trim: true,
      index: true, // For filtering
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
      index: true, // For range queries and sorting
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true, // For filtering and sorting
    },
    inStock: {
      type: Boolean,
      default: true,
      index: true, // For filtering
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true, // For sorting by newest
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Create text index for name and description fields
productSchema.index({ name: "text", description: "text" });

// Compound indexes for common query patterns
productSchema.index({ category: 1, brand: 1 }); // For category + brand filtering
productSchema.index({ category: 1, price: 1 }); // For category + price range filtering
productSchema.index({ category: 1, rating: 1 }); // For category + rating filtering

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
