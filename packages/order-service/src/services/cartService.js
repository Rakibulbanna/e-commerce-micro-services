const axios = require("axios");
const rabbitmq = require("../lib/rabbitmq");

class CartService {
  constructor() {
    this.cartServiceUrl = process.env.CART_SERVICE_URL;
  }

  async clearCart(userId) {
    try {
      // Call Cart Service to clear the cart
      const response = await axios.delete(`${this.cartServiceUrl}/api/cart`, {
        headers: {
          "user-id": userId,
        },
      });

      if (response.status === 200) {
        // Publish cart cleared event
        await rabbitmq.publish("cart", "cart.cleared", {
          userId,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  }
}

module.exports = new CartService();
