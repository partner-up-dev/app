import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  notificationWaves,
  type NewNotificationWaveRow,
  type NotificationWaveRow,
} from "../entities/notification-wave";

export class NotificationWaveRepository {
  async createOnce(row: NewNotificationWaveRow): Promise<NotificationWaveRow | null> {
    const result = await db
      .insert(notificationWaves)
      .values(row)
      .onConflictDoNothing({
        target: [notificationWaves.notificationKind, notificationWaves.waveKey],
      })
      .returning();
    return result[0] ?? null;
  }

  async findByKindAndWaveKey(input: {
    notificationKind: NotificationWaveRow["notificationKind"];
    waveKey: string;
  }): Promise<NotificationWaveRow | null> {
    const result = await db
      .select()
      .from(notificationWaves)
      .where(
        and(
          eq(notificationWaves.notificationKind, input.notificationKind),
          eq(notificationWaves.waveKey, input.waveKey),
        ),
      );
    return result[0] ?? null;
  }
}
