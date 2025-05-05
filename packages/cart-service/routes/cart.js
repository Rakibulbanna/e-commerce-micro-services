const express = require("express");
const Cart = require("../models/Cart");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Helper function to get ID and type from request
const getCartIdentifier = (req) => {
  const userId = req.headers["user-id"];
  const sessionId = req.headers["session-id"] || req.cookies?.sessionId;
  return {
    id: userId || sessionId || uuidv4(),
    isUser: !!userId,
  };
};

// GET /api/cart
router.get("/", async (req, res) => {
  try {
    const { id, isUser } = getCartIdentifier(req);
    const cart = await Cart.getCart(id, isUser);

    // If no session ID exists, set it
    if (!isUser && !req.cookies?.sessionId) {
      res.cookie("sessionId", id, {
        httpOnly: true,
        maxAge: process.env.CART_TTL * 1000,
      });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Error fetching cart" });
  }
});

// POST /api/cart/items
router.post("/items", async (req, res) => {
  try {
    const { id, isUser } = getCartIdentifier(req);
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({
        message: "Invalid product ID or quantity",
      });
    }

    const cart = await Cart.addItem(
      id,
      {
        productId,
        quantity: Number(quantity),
      },
      isUser
    );

    res.status(200).json(cart);
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Error adding item to cart" });
  }
});

// PUT /api/cart/items/:productId
router.put("/items/:productId", async (req, res) => {
  try {
    const { id, isUser } = getCartIdentifier(req);
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        message: "Invalid quantity",
      });
    }

    const cart = await Cart.updateItemQuantity(
      id,
      productId,
      Number(quantity),
      isUser
    );

    res.status(200).json(cart);
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ message: "Error updating cart item" });
  }
});

// DELETE /api/cart/items/:productId
router.delete("/items/:productId", async (req, res) => {
  try {
    const { id, isUser } = getCartIdentifier(req);
    const { productId } = req.params;

    const cart = await Cart.removeItem(id, productId, isUser);
    res.status(200).json(cart);
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Error removing item from cart" });
  }
});

// POST /api/cart/merge
router.post("/merge", async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const sessionId = req.cookies?.sessionId;

    if (!userId || !sessionId) {
      return res.status(400).json({
        message: "Both user ID and session ID are required for merging",
      });
    }

    const cart = await Cart.mergeCarts(userId, sessionId);

    // Clear the session cookie
    res.clearCookie("sessionId");

    res.status(200).json(cart);
  } catch (error) {
    console.error("Merge carts error:", error);
    res.status(500).json({ message: "Error merging carts" });
  }
});

// DELETE /api/cart
router.delete("/", async (req, res) => {
  try {
    const { id, isUser } = getCartIdentifier(req);
    await Cart.clearCart(id, isUser);

    if (!isUser) {
      res.clearCookie("sessionId");
    }

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Error clearing cart" });
  }
});

module.exports = router;
