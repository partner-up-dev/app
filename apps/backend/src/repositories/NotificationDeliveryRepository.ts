import { db } from "../lib/db";
import {
  notificationDeliveries,
  type NewNotificationDeliveryRow,
  type NotificationDeliveryRow,
} from "../entities/notification-delivery";

export class NotificationDeliveryRepository {
  async create(row: NewNotificationDeliveryRow): Promise<NotificationDeliveryRow | null> {
    const result = await db.insert(notificationDeliveries).values(row).returning();
    return result[0] ?? null;
  }
}
