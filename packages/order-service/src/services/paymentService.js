const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const rabbitmq = require("../lib/rabbitmq");

class PaymentService {
  constructor() {
    this.sslCommerzConfig = {
      storeId: process.env.SSLCOMMERZ_STORE_ID,
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
      sandbox: process.env.NODE_ENV !== "production",
      baseUrl:
        process.env.NODE_ENV === "production"
          ? "https://securepay.sslcommerz.com"
          : "https://sandbox.sslcommerz.com",
    };
  }

  async initiatePayment(order) {
    try {
      const paymentIntentId = uuidv4();

      const paymentData = {
        store_id: this.sslCommerzConfig.storeId,
        store_passwd: this.sslCommerzConfig.storePassword,
        total_amount: order.totalAmount,
        currency: "BDT",
        tran_id: paymentIntentId,
        product_category: "general",
        success_url: `${process.env.API_BASE_URL}/api/payments/success`,
        fail_url: `${process.env.API_BASE_URL}/api/payments/fail`,
        cancel_url: `${process.env.API_BASE_URL}/api/payments/cancel`,
        ipn_url: `${process.env.API_BASE_URL}/api/payments/ipn`,
        shipping_method: "NO",
        product_name: "Order Payment",
        product_profile: "general",
        cus_name: order.shippingAddress.name,
        cus_email: order.shippingAddress.email,
        cus_add1: order.shippingAddress.address,
        cus_city: order.shippingAddress.city,
        cus_postcode: order.shippingAddress.postalCode,
        cus_country: "Bangladesh",
        cus_phone: order.shippingAddress.phone,
        multi_card_name: "",
        value_a: order.id, // Store order ID for webhook processing
        value_b: order.userId, // Store user ID for webhook processing
      };

      const response = await axios.post(
        `${this.sslCommerzConfig.baseUrl}/gwprocess/v4/api.php`,
        paymentData
      );

      if (response.data.status === "VALID") {
        // Publish payment initiated event
        await rabbitmq.publish("payments", "payment.initiated", {
          orderId: order.id,
          paymentIntentId,
          amount: order.totalAmount,
        });

        return {
          paymentIntentId,
          gatewayUrl: response.data.GatewayPageURL,
        };
      }

      throw new Error("Payment initiation failed");
    } catch (error) {
      console.error("Payment initiation error:", error);
      throw error;
    }
  }

  async handleWebhook(payload) {
    try {
      const {
        value_a: orderId,
        value_b: userId,
        status,
        tran_id: paymentIntentId,
      } = payload;

      // Verify the payment with SSLCommerz
      const isValid = await this.verifyPayment(payload);

      if (!isValid) {
        throw new Error("Invalid payment verification");
      }

      if (status === "VALID") {
        await rabbitmq.publish("payments", "payment.success", {
          orderId,
          userId,
          paymentIntentId,
        });
      } else {
        await rabbitmq.publish("payments", "payment.failed", {
          orderId,
          userId,
          paymentIntentId,
          reason: status,
        });
      }

      return true;
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw error;
    }
  }

  async verifyPayment(payload) {
    try {
      const { tran_id, val_id } = payload;

      const response = await axios.get(
        `${this.sslCommerzConfig.baseUrl}/validator/api/validationserverAPI.php`,
        {
          params: {
            val_id,
            store_id: this.sslCommerzConfig.storeId,
            store_passwd: this.sslCommerzConfig.storePassword,
            format: "json",
          },
        }
      );

      return response.data.status === "VALID";
    } catch (error) {
      console.error("Payment verification error:", error);
      return false;
    }
  }
}

module.exports = new PaymentService();
