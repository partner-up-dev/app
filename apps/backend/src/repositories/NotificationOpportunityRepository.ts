import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  notificationOpportunities,
  type NewNotificationOpportunityRow,
  type NotificationOpportunityRow,
} from "../entities/notification-opportunity";

export class NotificationOpportunityRepository {
  async createOnce(row: NewNotificationOpportunityRow): Promise<NotificationOpportunityRow | null> {
    const result = await db
      .insert(notificationOpportunities)
      .values(row)
      .onConflictDoNothing({ target: notificationOpportunities.dedupeKey })
      .returning();
    return result[0] ?? null;
  }

  async markScheduledByDedupeKey(
    dedupeKey: string,
    jobId: number | null,
  ): Promise<NotificationOpportunityRow | null> {
    const result = await db
      .update(notificationOpportunities)
      .set({
        status: "SCHEDULED",
        jobId,
        updatedAt: new Date(),
      })
      .where(eq(notificationOpportunities.dedupeKey, dedupeKey))
      .returning();
    return result[0] ?? null;
  }
}
