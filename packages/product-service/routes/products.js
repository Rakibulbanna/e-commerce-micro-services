const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// GET /api/products
// Query params: search, category, brand, minPrice, maxPrice, minRating, inStock, sort
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort = "-createdAt", // Default sort by newest
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = {};

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (inStock !== undefined) query.inStock = inStock === "true";
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }
    if (minRating !== undefined) {
      query.rating = { $gte: Number(minRating) };
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    res.status(200).json({
      products,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (error) {
    console.error("Product search error:", error);
    res.status(500).json({ message: "Server error while fetching products" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Get product error:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    res.status(500).json({ message: "Server error while fetching product" });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Server error while creating product" });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }
    res.status(500).json({ message: "Server error while updating product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    res.status(500).json({ message: "Server error while deleting product" });
  }
});

module.exports = router;
