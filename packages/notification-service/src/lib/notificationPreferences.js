const { metrics } = require("./metrics");
const {
  NotificationPreferences: NotificationPreferencesModel,
} = require("./database");

class NotificationPreferences {
  constructor() {
    this.defaultPreferences = {
      email: {
        orderConfirmation: true,
        paymentConfirmation: true,
        shippingConfirmation: true,
        marketing: false,
      },
      sms: {
        orderConfirmation: true,
        paymentConfirmation: true,
        shippingConfirmation: true,
        marketing: false,
      },
      push: {
        orderConfirmation: true,
        paymentConfirmation: true,
        shippingConfirmation: true,
        marketing: false,
      },
      webhook: {
        enabled: false,
        url: null,
        secret: null,
      },
      language: "en",
      timezone: "UTC",
    };
  }

  async getUserPreferences(userId) {
    try {
      let preferences = await NotificationPreferencesModel.findOne({ userId });

      if (!preferences) {
        // Create default preferences if none exist
        preferences = await NotificationPreferencesModel.create({
          userId,
          ...this.defaultPreferences,
        });
      }

      return preferences;
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      metrics.notificationPreferencesError.inc({ operation: "get" });
      throw error;
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      this.validatePreferences(preferences);

      const updatedPreferences =
        await NotificationPreferencesModel.findOneAndUpdate(
          { userId },
          {
            $set: {
              ...preferences,
              updatedAt: new Date(),
            },
          },
          {
            new: true,
            upsert: true,
          }
        );

      metrics.notificationPreferencesUpdated.inc();
      return updatedPreferences;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      metrics.notificationPreferencesError.inc({ operation: "update" });
      throw error;
    }
  }

  validatePreferences(preferences) {
    const validChannels = ["email", "sms", "push", "webhook"];
    const validTypes = [
      "orderConfirmation",
      "paymentConfirmation",
      "shippingConfirmation",
      "marketing",
    ];

    for (const channel of validChannels) {
      if (preferences[channel]) {
        if (channel === "webhook") {
          if (preferences[channel].enabled && !preferences[channel].url) {
            throw new Error("Webhook URL is required when webhook is enabled");
          }
        } else {
          for (const type of validTypes) {
            if (
              preferences[channel][type] !== undefined &&
              typeof preferences[channel][type] !== "boolean"
            ) {
              throw new Error(
                `Invalid preference value for ${channel}.${type}`
              );
            }
          }
        }
      }
    }

    if (preferences.language && typeof preferences.language !== "string") {
      throw new Error("Language must be a string");
    }

    if (preferences.timezone && typeof preferences.timezone !== "string") {
      throw new Error("Timezone must be a string");
    }
  }

  async shouldSendNotification(userId, channel, type) {
    try {
      const preferences = await this.getUserPreferences(userId);

      if (!preferences[channel] || preferences[channel][type] === undefined) {
        return this.defaultPreferences[channel][type];
      }

      return preferences[channel][type];
    } catch (error) {
      console.error("Error checking notification preferences:", error);
      metrics.notificationPreferencesError.inc({ operation: "check" });
      // Default to sending notifications if there's an error
      return true;
    }
  }

  async bulkUpdatePreferences(userIds, preferences) {
    try {
      this.validatePreferences(preferences);

      const bulkOps = userIds.map((userId) => ({
        updateOne: {
          filter: { userId },
          update: {
            $set: {
              ...preferences,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      const result = await NotificationPreferencesModel.bulkWrite(bulkOps);

      metrics.notificationPreferencesBulkUpdated.inc({ count: userIds.length });
      return {
        success: true,
        count: userIds.length,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      };
    } catch (error) {
      console.error("Error bulk updating preferences:", error);
      metrics.notificationPreferencesError.inc({ operation: "bulk_update" });
      throw error;
    }
  }

  async getWebhookConfig(userId) {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences.webhook;
    } catch (error) {
      console.error("Error getting webhook config:", error);
      metrics.notificationPreferencesError.inc({ operation: "get_webhook" });
      return this.defaultPreferences.webhook;
    }
  }

  async getLanguageAndTimezone(userId) {
    try {
      const preferences = await this.getUserPreferences(userId);
      return {
        language: preferences.language || this.defaultPreferences.language,
        timezone: preferences.timezone || this.defaultPreferences.timezone,
      };
    } catch (error) {
      console.error("Error getting language and timezone:", error);
      metrics.notificationPreferencesError.inc({
        operation: "get_localization",
      });
      return {
        language: this.defaultPreferences.language,
        timezone: this.defaultPreferences.timezone,
      };
    }
  }
}

module.exports = NotificationPreferences;
