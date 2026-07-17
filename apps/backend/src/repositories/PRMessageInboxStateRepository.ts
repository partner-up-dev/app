import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { prMessageInboxStates, type PRMessageInboxState } from "../entities/pr-message-inbox-state";
import type { PRId } from "../entities/partner-request";
import type { PRMessageId } from "../entities/pr-message";
import type { UserId } from "../entities/user";

export class PRMessageInboxStateRepository {
  async findByPrIdAndUserId(prId: PRId, userId: UserId): Promise<PRMessageInboxState | null> {
    const result = await db
      .select()
      .from(prMessageInboxStates)
      .where(and(eq(prMessageInboxStates.prId, prId), eq(prMessageInboxStates.userId, userId)));
    return result[0] ?? null;
  }

  async findByPrIdAndUserIds(prId: PRId, userIds: UserId[]): Promise<PRMessageInboxState[]> {
    if (userIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(prMessageInboxStates)
      .where(
        and(eq(prMessageInboxStates.prId, prId), inArray(prMessageInboxStates.userId, userIds)),
      );
  }

  async upsertLastReadMessageId(
    prId: PRId,
    userId: UserId,
    lastReadMessageId: PRMessageId,
  ): Promise<PRMessageInboxState | null> {
    const now = new Date();
    const result = await db
      .insert(prMessageInboxStates)
      .values({
        prId,
        userId,
        lastReadMessageId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [prMessageInboxStates.prId, prMessageInboxStates.userId],
        set: {
          lastReadMessageId: sql`greatest(coalesce(${prMessageInboxStates.lastReadMessageId}, 0), ${lastReadMessageId})`,
          updatedAt: now,
        },
      })
      .returning();

    return result[0] ?? null;
  }

  async upsertLastNotifiedMessageId(
    prId: PRId,
    userId: UserId,
    lastNotifiedMessageId: PRMessageId,
  ): Promise<PRMessageInboxState | null> {
    const now = new Date();
    const result = await db
      .insert(prMessageInboxStates)
      .values({
        prId,
        userId,
        lastNotifiedMessageId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [prMessageInboxStates.prId, prMessageInboxStates.userId],
        set: {
          lastNotifiedMessageId: sql`greatest(coalesce(${prMessageInboxStates.lastNotifiedMessageId}, 0), ${lastNotifiedMessageId})`,
          updatedAt: now,
        },
      })
      .returning();

    return result[0] ?? null;
  }
}
