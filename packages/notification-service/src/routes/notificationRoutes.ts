import { Router } from "express";
import { publishMessage } from "../lib/rabbitmq";
import {
  notificationSentCounter,
  notificationFailedCounter,
} from "../lib/metrics";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const notification = {
      type: req.body.type,
      recipient: req.body.recipient,
      subject: req.body.subject,
      content: req.body.content,
    };

    await publishMessage(notification);
    notificationSentCounter.inc({ type: notification.type });

    res.status(201).json({
      message: "Notification queued successfully",
      notification,
    });
  } catch (error) {
    console.error("Failed to queue notification:", error);
    notificationFailedCounter.inc({
      type: req.body.type || "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to queue notification" });
  }
});

export default router;
