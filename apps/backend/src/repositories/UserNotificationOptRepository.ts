import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  userNotificationOpts,
  type WeChatNotificationKind,
  type UserNotificationOpt,
} from "../entities/user-notification-opt";
import type { UserId } from "../entities/user";

export type NotificationSubscriptionSnapshot = {
  enabled: boolean;
  optInAt: Date | null;
  remainingCount: number;
};

export type ConsumeNotificationCreditResult = {
  consumed: boolean;
  remainingCount: number;
  row: UserNotificationOpt | null;
};

const normalizeRemainingCount = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
};

export class UserNotificationOptRepository {
  async findByUserId(userId: UserId): Promise<UserNotificationOpt | null> {
    const result = await db
      .select()
      .from(userNotificationOpts)
      .where(eq(userNotificationOpts.userId, userId));
    return result[0] ?? null;
  }

  async upsertWechatReminderSubscription(
    userId: UserId,
    enabled: boolean,
  ): Promise<UserNotificationOpt | null> {
    return this.upsertWechatNotificationSubscription(userId, "REMINDER_CONFIRMATION", enabled);
  }

  getSubscriptionSnapshot(
    opt: UserNotificationOpt | null,
    kind: WeChatNotificationKind,
  ): NotificationSubscriptionSnapshot {
    if (!opt) {
      return {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
      };
    }

    if (kind === "REMINDER_CONFIRMATION") {
      return {
        enabled: opt.wechatReminderRemainingCount > 0,
        optInAt: opt.wechatReminderOptInAt,
        remainingCount: opt.wechatReminderRemainingCount,
      };
    }
    if (kind === "ACTIVITY_START_REMINDER") {
      return {
        enabled: opt.wechatActivityStartReminderRemainingCount > 0,
        optInAt: opt.wechatActivityStartReminderOptInAt,
        remainingCount: opt.wechatActivityStartReminderRemainingCount,
      };
    }
    if (kind === "PR_MESSAGE") {
      return {
        enabled: opt.wechatPrMessageRemainingCount > 0,
        optInAt: opt.wechatPrMessageOptInAt,
        remainingCount: opt.wechatPrMessageRemainingCount,
      };
    }
    if (kind === "MEETING_POINT_UPDATED") {
      return {
        enabled: opt.wechatMeetingPointUpdatedRemainingCount > 0,
        optInAt: opt.wechatMeetingPointUpdatedOptInAt,
        remainingCount: opt.wechatMeetingPointUpdatedRemainingCount,
      };
    }
    if (kind === "WAITLIST_PROMOTED") {
      return {
        enabled: opt.wechatWaitlistPromotedRemainingCount > 0,
        optInAt: opt.wechatWaitlistPromotedOptInAt,
        remainingCount: opt.wechatWaitlistPromotedRemainingCount,
      };
    }
    if (kind === "PR_READY") {
      return {
        enabled: opt.wechatPrReadyRemainingCount > 0,
        optInAt: opt.wechatPrReadyOptInAt,
        remainingCount: opt.wechatPrReadyRemainingCount,
      };
    }
    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      return {
        enabled: opt.wechatWaitlistAlternativeAvailableRemainingCount > 0,
        optInAt: opt.wechatWaitlistAlternativeAvailableOptInAt,
        remainingCount: opt.wechatWaitlistAlternativeAvailableRemainingCount,
      };
    }
    return {
      enabled: opt.wechatNewPartnerRemainingCount > 0,
      optInAt: opt.wechatNewPartnerOptInAt,
      remainingCount: opt.wechatNewPartnerRemainingCount,
    };
  }

  async upsertWechatNotificationSubscription(
    userId: UserId,
    kind: WeChatNotificationKind,
    enabled: boolean,
  ): Promise<UserNotificationOpt | null> {
    return this.setWechatNotificationRemainingCount(userId, kind, enabled ? 1 : 0);
  }

  async setWechatNotificationRemainingCount(
    userId: UserId,
    kind: WeChatNotificationKind,
    remainingCount: number,
  ): Promise<UserNotificationOpt | null> {
    const now = new Date();
    const normalizedCount = normalizeRemainingCount(remainingCount);
    const enabled = normalizedCount > 0;
    const optInAt = enabled ? now : null;

    if (kind === "REMINDER_CONFIRMATION") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatReminderRemainingCount: normalizedCount,
          wechatReminderOptIn: enabled,
          wechatReminderOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatReminderRemainingCount: normalizedCount,
            wechatReminderOptIn: enabled,
            wechatReminderOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "ACTIVITY_START_REMINDER") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatActivityStartReminderRemainingCount: normalizedCount,
          wechatActivityStartReminderOptIn: enabled,
          wechatActivityStartReminderOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatActivityStartReminderRemainingCount: normalizedCount,
            wechatActivityStartReminderOptIn: enabled,
            wechatActivityStartReminderOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "PR_MESSAGE") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatPrMessageRemainingCount: normalizedCount,
          wechatPrMessageOptIn: enabled,
          wechatPrMessageOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatPrMessageRemainingCount: normalizedCount,
            wechatPrMessageOptIn: enabled,
            wechatPrMessageOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "MEETING_POINT_UPDATED") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatMeetingPointUpdatedRemainingCount: normalizedCount,
          wechatMeetingPointUpdatedOptIn: enabled,
          wechatMeetingPointUpdatedOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatMeetingPointUpdatedRemainingCount: normalizedCount,
            wechatMeetingPointUpdatedOptIn: enabled,
            wechatMeetingPointUpdatedOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "WAITLIST_PROMOTED") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatWaitlistPromotedRemainingCount: normalizedCount,
          wechatWaitlistPromotedOptIn: enabled,
          wechatWaitlistPromotedOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatWaitlistPromotedRemainingCount: normalizedCount,
            wechatWaitlistPromotedOptIn: enabled,
            wechatWaitlistPromotedOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "PR_READY") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatPrReadyRemainingCount: normalizedCount,
          wechatPrReadyOptIn: enabled,
          wechatPrReadyOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatPrReadyRemainingCount: normalizedCount,
            wechatPrReadyOptIn: enabled,
            wechatPrReadyOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatWaitlistAlternativeAvailableRemainingCount: normalizedCount,
          wechatWaitlistAlternativeAvailableOptIn: enabled,
          wechatWaitlistAlternativeAvailableOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatWaitlistAlternativeAvailableRemainingCount: normalizedCount,
            wechatWaitlistAlternativeAvailableOptIn: enabled,
            wechatWaitlistAlternativeAvailableOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    const result = await db
      .insert(userNotificationOpts)
      .values({
        userId,
        wechatNewPartnerRemainingCount: normalizedCount,
        wechatNewPartnerOptIn: enabled,
        wechatNewPartnerOptInAt: optInAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userNotificationOpts.userId,
        set: {
          wechatNewPartnerRemainingCount: normalizedCount,
          wechatNewPartnerOptIn: enabled,
          wechatNewPartnerOptInAt: optInAt,
          updatedAt: now,
        },
      })
      .returning();
    return result[0] ?? null;
  }

  async addOneWechatNotificationCredit(
    userId: UserId,
    kind: WeChatNotificationKind,
  ): Promise<UserNotificationOpt | null> {
    const now = new Date();

    if (kind === "REMINDER_CONFIRMATION") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatReminderRemainingCount: 1,
          wechatReminderOptIn: true,
          wechatReminderOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatReminderRemainingCount: sql`${userNotificationOpts.wechatReminderRemainingCount} + 1`,
            wechatReminderOptIn: true,
            wechatReminderOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "ACTIVITY_START_REMINDER") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatActivityStartReminderRemainingCount: 1,
          wechatActivityStartReminderOptIn: true,
          wechatActivityStartReminderOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatActivityStartReminderRemainingCount: sql`${userNotificationOpts.wechatActivityStartReminderRemainingCount} + 1`,
            wechatActivityStartReminderOptIn: true,
            wechatActivityStartReminderOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "PR_MESSAGE") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatPrMessageRemainingCount: 1,
          wechatPrMessageOptIn: true,
          wechatPrMessageOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatPrMessageRemainingCount: sql`${userNotificationOpts.wechatPrMessageRemainingCount} + 1`,
            wechatPrMessageOptIn: true,
            wechatPrMessageOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "MEETING_POINT_UPDATED") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatMeetingPointUpdatedRemainingCount: 1,
          wechatMeetingPointUpdatedOptIn: true,
          wechatMeetingPointUpdatedOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatMeetingPointUpdatedRemainingCount: sql`${userNotificationOpts.wechatMeetingPointUpdatedRemainingCount} + 1`,
            wechatMeetingPointUpdatedOptIn: true,
            wechatMeetingPointUpdatedOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "WAITLIST_PROMOTED") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatWaitlistPromotedRemainingCount: 1,
          wechatWaitlistPromotedOptIn: true,
          wechatWaitlistPromotedOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatWaitlistPromotedRemainingCount: sql`${userNotificationOpts.wechatWaitlistPromotedRemainingCount} + 1`,
            wechatWaitlistPromotedOptIn: true,
            wechatWaitlistPromotedOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "PR_READY") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatPrReadyRemainingCount: 1,
          wechatPrReadyOptIn: true,
          wechatPrReadyOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatPrReadyRemainingCount: sql`${userNotificationOpts.wechatPrReadyRemainingCount} + 1`,
            wechatPrReadyOptIn: true,
            wechatPrReadyOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatWaitlistAlternativeAvailableRemainingCount: 1,
          wechatWaitlistAlternativeAvailableOptIn: true,
          wechatWaitlistAlternativeAvailableOptInAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatWaitlistAlternativeAvailableRemainingCount: sql`${userNotificationOpts.wechatWaitlistAlternativeAvailableRemainingCount} + 1`,
            wechatWaitlistAlternativeAvailableOptIn: true,
            wechatWaitlistAlternativeAvailableOptInAt: now,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    const result = await db
      .insert(userNotificationOpts)
      .values({
        userId,
        wechatNewPartnerRemainingCount: 1,
        wechatNewPartnerOptIn: true,
        wechatNewPartnerOptInAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userNotificationOpts.userId,
        set: {
          wechatNewPartnerRemainingCount: sql`${userNotificationOpts.wechatNewPartnerRemainingCount} + 1`,
          wechatNewPartnerOptIn: true,
          wechatNewPartnerOptInAt: now,
          updatedAt: now,
        },
      })
      .returning();
    return result[0] ?? null;
  }

  async clearWechatNotificationCredits(
    userId: UserId,
    kind: WeChatNotificationKind,
  ): Promise<UserNotificationOpt | null> {
    return this.setWechatNotificationRemainingCount(userId, kind, 0);
  }

  async consumeOneWechatNotificationCredit(
    userId: UserId,
    kind: WeChatNotificationKind,
  ): Promise<ConsumeNotificationCreditResult> {
    const now = new Date();

    if (kind === "REMINDER_CONFIRMATION") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatReminderRemainingCount: sql`${userNotificationOpts.wechatReminderRemainingCount} - 1`,
          wechatReminderOptIn: sql`(${userNotificationOpts.wechatReminderRemainingCount} - 1) > 0`,
          wechatReminderOptInAt: sql`case when (${userNotificationOpts.wechatReminderRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatReminderOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatReminderRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatReminderRemainingCount ?? 0,
        row,
      };
    }

    if (kind === "ACTIVITY_START_REMINDER") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatActivityStartReminderRemainingCount: sql`${userNotificationOpts.wechatActivityStartReminderRemainingCount} - 1`,
          wechatActivityStartReminderOptIn: sql`(${userNotificationOpts.wechatActivityStartReminderRemainingCount} - 1) > 0`,
          wechatActivityStartReminderOptInAt: sql`case when (${userNotificationOpts.wechatActivityStartReminderRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatActivityStartReminderOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatActivityStartReminderRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatActivityStartReminderRemainingCount ?? 0,
        row,
      };
    }

    if (kind === "PR_MESSAGE") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatPrMessageRemainingCount: sql`${userNotificationOpts.wechatPrMessageRemainingCount} - 1`,
          wechatPrMessageOptIn: sql`(${userNotificationOpts.wechatPrMessageRemainingCount} - 1) > 0`,
          wechatPrMessageOptInAt: sql`case when (${userNotificationOpts.wechatPrMessageRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatPrMessageOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatPrMessageRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatPrMessageRemainingCount ?? 0,
        row,
      };
    }

    if (kind === "MEETING_POINT_UPDATED") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatMeetingPointUpdatedRemainingCount: sql`${userNotificationOpts.wechatMeetingPointUpdatedRemainingCount} - 1`,
          wechatMeetingPointUpdatedOptIn: sql`(${userNotificationOpts.wechatMeetingPointUpdatedRemainingCount} - 1) > 0`,
          wechatMeetingPointUpdatedOptInAt: sql`case when (${userNotificationOpts.wechatMeetingPointUpdatedRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatMeetingPointUpdatedOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatMeetingPointUpdatedRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatMeetingPointUpdatedRemainingCount ?? 0,
        row,
      };
    }

    if (kind === "WAITLIST_PROMOTED") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatWaitlistPromotedRemainingCount: sql`${userNotificationOpts.wechatWaitlistPromotedRemainingCount} - 1`,
          wechatWaitlistPromotedOptIn: sql`(${userNotificationOpts.wechatWaitlistPromotedRemainingCount} - 1) > 0`,
          wechatWaitlistPromotedOptInAt: sql`case when (${userNotificationOpts.wechatWaitlistPromotedRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatWaitlistPromotedOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatWaitlistPromotedRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatWaitlistPromotedRemainingCount ?? 0,
        row,
      };
    }

    if (kind === "PR_READY") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatPrReadyRemainingCount: sql`${userNotificationOpts.wechatPrReadyRemainingCount} - 1`,
          wechatPrReadyOptIn: sql`(${userNotificationOpts.wechatPrReadyRemainingCount} - 1) > 0`,
          wechatPrReadyOptInAt: sql`case when (${userNotificationOpts.wechatPrReadyRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatPrReadyOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatPrReadyRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatPrReadyRemainingCount ?? 0,
        row,
      };
    }

    if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
      const result = await db
        .update(userNotificationOpts)
        .set({
          wechatWaitlistAlternativeAvailableRemainingCount: sql`${userNotificationOpts.wechatWaitlistAlternativeAvailableRemainingCount} - 1`,
          wechatWaitlistAlternativeAvailableOptIn: sql`(${userNotificationOpts.wechatWaitlistAlternativeAvailableRemainingCount} - 1) > 0`,
          wechatWaitlistAlternativeAvailableOptInAt: sql`case when (${userNotificationOpts.wechatWaitlistAlternativeAvailableRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatWaitlistAlternativeAvailableOptInAt} else null end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(userNotificationOpts.userId, userId),
            gt(userNotificationOpts.wechatWaitlistAlternativeAvailableRemainingCount, 0),
          ),
        )
        .returning();
      const row = result[0] ?? null;
      return {
        consumed: row !== null,
        remainingCount: row?.wechatWaitlistAlternativeAvailableRemainingCount ?? 0,
        row,
      };
    }

    const result = await db
      .update(userNotificationOpts)
      .set({
        wechatNewPartnerRemainingCount: sql`${userNotificationOpts.wechatNewPartnerRemainingCount} - 1`,
        wechatNewPartnerOptIn: sql`(${userNotificationOpts.wechatNewPartnerRemainingCount} - 1) > 0`,
        wechatNewPartnerOptInAt: sql`case when (${userNotificationOpts.wechatNewPartnerRemainingCount} - 1) > 0 then ${userNotificationOpts.wechatNewPartnerOptInAt} else null end`,
        updatedAt: now,
      })
      .where(
        and(
          eq(userNotificationOpts.userId, userId),
          gt(userNotificationOpts.wechatNewPartnerRemainingCount, 0),
        ),
      )
      .returning();
    const row = result[0] ?? null;
    return {
      consumed: row !== null,
      remainingCount: row?.wechatNewPartnerRemainingCount ?? 0,
      row,
    };
  }
}
