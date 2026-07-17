import { z } from "zod";

export const notificationChannelSchema = z.enum([
  "WECHAT_SUBSCRIPTION",
  "WECHAT_TEMPLATE",
  "EMAIL",
  "SMS",
]);

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL = "WECHAT_SUBSCRIPTION" as const;
export const WECHAT_TEMPLATE_NOTIFICATION_CHANNEL = "WECHAT_TEMPLATE" as const;
