const { createClient } = require("redis");

class Cart {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });
    this.client.connect().catch(console.error);
  }

  // Generate cart key based on user ID or session ID
  generateCartKey(id, isUser = false) {
    return isUser ? `user:${id}:cart` : `session:${id}:cart`;
  }

  // Get cart items
  async getCart(id, isUser = false) {
    try {
      const cartKey = this.generateCartKey(id, isUser);
      const cartData = await this.client.get(cartKey);
      return cartData ? JSON.parse(cartData) : { items: [] };
    } catch (error) {
      console.error("Error getting cart:", error);
      throw error;
    }
  }

  // Add item to cart
  async addItem(id, item, isUser = false) {
    try {
      const cartKey = this.generateCartKey(id, isUser);
      const cart = await this.getCart(id, isUser);

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        (i) => i.productId === item.productId
      );

      if (existingItemIndex > -1) {
        // Update quantity if item exists
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        // Add new item
        cart.items.push(item);
      }

      // Save to Redis with TTL
      await this.client.set(cartKey, JSON.stringify(cart), {
        EX: process.env.CART_TTL,
      });

      return cart;
    } catch (error) {
      console.error("Error adding item to cart:", error);
      throw error;
    }
  }

  // Update item quantity
  async updateItemQuantity(id, productId, quantity, isUser = false) {
    try {
      const cartKey = this.generateCartKey(id, isUser);
      const cart = await this.getCart(id, isUser);

      const itemIndex = cart.items.findIndex((i) => i.productId === productId);

      if (itemIndex > -1) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          cart.items.splice(itemIndex, 1);
        } else {
          // Update quantity
          cart.items[itemIndex].quantity = quantity;
        }

        // Save to Redis with TTL
        await this.client.set(cartKey, JSON.stringify(cart), {
          EX: process.env.CART_TTL,
        });
      }

      return cart;
    } catch (error) {
      console.error("Error updating cart item:", error);
      throw error;
    }
  }

  // Remove item from cart
  async removeItem(id, productId, isUser = false) {
    try {
      const cartKey = this.generateCartKey(id, isUser);
      const cart = await this.getCart(id, isUser);

      cart.items = cart.items.filter((item) => item.productId !== productId);

      // Save to Redis with TTL
      await this.client.set(cartKey, JSON.stringify(cart), {
        EX: process.env.CART_TTL,
      });

      return cart;
    } catch (error) {
      console.error("Error removing cart item:", error);
      throw error;
    }
  }

  // Clear cart
  async clearCart(id, isUser = false) {
    try {
      const cartKey = this.generateCartKey(id, isUser);
      await this.client.del(cartKey);
      return { items: [] };
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  }

  // Merge anonymous cart with user cart
  async mergeCarts(userId, sessionId) {
    try {
      const userCart = await this.getCart(userId, true);
      const sessionCart = await this.getCart(sessionId, false);

      // Merge items
      sessionCart.items.forEach((sessionItem) => {
        const existingItemIndex = userCart.items.findIndex(
          (userItem) => userItem.productId === sessionItem.productId
        );

        if (existingItemIndex > -1) {
          // Add quantities if item exists
          userCart.items[existingItemIndex].quantity += sessionItem.quantity;
        } else {
          // Add new item
          userCart.items.push(sessionItem);
        }
      });

      // Save merged cart
      const userCartKey = this.generateCartKey(userId, true);
      await this.client.set(userCartKey, JSON.stringify(userCart), {
        EX: process.env.CART_TTL,
      });

      // Clear session cart
      await this.clearCart(sessionId, false);

      return userCart;
    } catch (error) {
      console.error("Error merging carts:", error);
      throw error;
    }
  }
}

module.exports = new Cart();
