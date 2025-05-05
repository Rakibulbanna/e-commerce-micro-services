const mongoose = require("mongoose");
const { metrics } = require("./metrics");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Notification Preferences Schema
const notificationPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    orderConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    shippingConfirmation: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  sms: {
    orderConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    shippingConfirmation: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  push: {
    orderConfirmation: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    shippingConfirmation: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  webhook: {
    enabled: { type: Boolean, default: false },
    url: { type: String },
    secret: { type: String },
  },
  language: { type: String, default: "en" },
  timezone: { type: String, default: "UTC" },
  updatedAt: { type: Date, default: Date.now },
});

// Notification Template Schema
const notificationTemplateSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "orderConfirmation",
      "paymentConfirmation",
      "shippingConfirmation",
      "marketing",
    ],
  },
  channel: {
    type: String,
    required: true,
    enum: ["email", "sms", "push"],
  },
  language: {
    type: String,
    required: true,
    default: "en",
  },
  subject: { type: String },
  body: { type: String, required: true },
  variables: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Scheduled Notification Schema
const scheduledNotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  channel: { type: String, required: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  scheduledFor: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create indexes
notificationPreferencesSchema.index({ userId: 1 });
notificationTemplateSchema.index({ type: 1, channel: 1, language: 1 });
scheduledNotificationSchema.index({ userId: 1, scheduledFor: 1, status: 1 });

// Create models
const NotificationPreferences = mongoose.model(
  "NotificationPreferences",
  notificationPreferencesSchema
);
const NotificationTemplate = mongoose.model(
  "NotificationTemplate",
  notificationTemplateSchema
);
const ScheduledNotification = mongoose.model(
  "ScheduledNotification",
  scheduledNotificationSchema
);

module.exports = {
  connectDB,
  NotificationPreferences,
  NotificationTemplate,
  ScheduledNotification,
};
