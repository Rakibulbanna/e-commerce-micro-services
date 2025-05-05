const { ScheduledNotification } = require("../lib/database");
const { metrics } = require("../lib/metrics");
const NotificationQueue = require("../lib/notificationQueue");
const moment = require("moment-timezone");

class ScheduledNotificationService {
  constructor(notificationQueue) {
    this.notificationQueue = notificationQueue;
    this.processing = false;
    this.timer = null;
  }

  async scheduleNotification(notification) {
    try {
      const scheduledNotification = await ScheduledNotification.create({
        ...notification,
        status: "pending",
      });

      metrics.scheduledNotificationCreated.inc();
      return scheduledNotification;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      metrics.scheduledNotificationError.inc({ operation: "schedule" });
      throw error;
    }
  }

  async bulkScheduleNotifications(notifications) {
    try {
      const scheduledNotifications = await ScheduledNotification.insertMany(
        notifications.map((notification) => ({
          ...notification,
          status: "pending",
        }))
      );

      metrics.scheduledNotificationBulkCreated.inc({
        count: notifications.length,
      });
      return scheduledNotifications;
    } catch (error) {
      console.error("Error bulk scheduling notifications:", error);
      metrics.scheduledNotificationError.inc({ operation: "bulk_schedule" });
      throw error;
    }
  }

  async cancelNotification(notificationId) {
    try {
      const notification = await ScheduledNotification.findByIdAndUpdate(
        notificationId,
        {
          $set: {
            status: "cancelled",
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!notification) {
        throw new Error(
          `Scheduled notification not found with id: ${notificationId}`
        );
      }

      metrics.scheduledNotificationCancelled.inc();
      return notification;
    } catch (error) {
      console.error("Error cancelling notification:", error);
      metrics.scheduledNotificationError.inc({ operation: "cancel" });
      throw error;
    }
  }

  async rescheduleNotification(notificationId, newScheduledTime) {
    try {
      const notification = await ScheduledNotification.findByIdAndUpdate(
        notificationId,
        {
          $set: {
            scheduledFor: newScheduledTime,
            status: "pending",
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!notification) {
        throw new Error(
          `Scheduled notification not found with id: ${notificationId}`
        );
      }

      metrics.scheduledNotificationRescheduled.inc();
      return notification;
    } catch (error) {
      console.error("Error rescheduling notification:", error);
      metrics.scheduledNotificationError.inc({ operation: "reschedule" });
      throw error;
    }
  }

  async startProcessing() {
    if (this.processing) return;
    this.processing = true;

    while (this.processing) {
      try {
        const now = new Date();
        const pendingNotifications = await ScheduledNotification.find({
          status: "pending",
          scheduledFor: { $lte: now },
        }).limit(100);

        if (pendingNotifications.length > 0) {
          for (const notification of pendingNotifications) {
            try {
              // Add to notification queue
              await this.notificationQueue.add(notification, 0);

              // Update status to sent
              await ScheduledNotification.findByIdAndUpdate(notification._id, {
                $set: {
                  status: "sent",
                  updatedAt: new Date(),
                },
              });

              metrics.scheduledNotificationProcessed.inc();
            } catch (error) {
              console.error("Error processing scheduled notification:", error);

              // Update retry count and status
              const retryCount = notification.retryCount + 1;
              const status =
                retryCount >= notification.maxRetries ? "failed" : "pending";

              await ScheduledNotification.findByIdAndUpdate(notification._id, {
                $set: {
                  status,
                  retryCount,
                  updatedAt: new Date(),
                },
              });

              metrics.scheduledNotificationError.inc({ operation: "process" });
            }
          }
        }

        // Wait for next check
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          "Error in scheduled notification processing loop:",
          error
        );
        metrics.scheduledNotificationError.inc({
          operation: "processing_loop",
        });
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  stopProcessing() {
    this.processing = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async getPendingNotifications(userId) {
    try {
      const notifications = await ScheduledNotification.find({
        userId,
        status: "pending",
      }).sort({ scheduledFor: 1 });

      return notifications;
    } catch (error) {
      console.error("Error fetching pending notifications:", error);
      metrics.scheduledNotificationError.inc({ operation: "get_pending" });
      throw error;
    }
  }

  async getFailedNotifications(userId) {
    try {
      const notifications = await ScheduledNotification.find({
        userId,
        status: "failed",
      }).sort({ updatedAt: -1 });

      return notifications;
    } catch (error) {
      console.error("Error fetching failed notifications:", error);
      metrics.scheduledNotificationError.inc({ operation: "get_failed" });
      throw error;
    }
  }
}

module.exports = ScheduledNotificationService;
