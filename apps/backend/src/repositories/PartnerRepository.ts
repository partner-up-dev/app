import { db } from "../lib/db";
import {
  partners,
  type PartnerId,
  type PartnerStatus,
} from "../entities/partner";
import { partnerRequests } from "../entities/partner-request";
import type { PRId } from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { users } from "../entities/user";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

export type ActiveParticipantSummary = {
  partnerId: PartnerId;
  status: Extract<PartnerStatus, "JOINED" | "CONFIRMED" | "ATTENDED">;
  userId: UserId;
  nickname: string | null;
  avatar: string | null;
  phoneNumber: string | null;
};

export type PendingParticipantSummary = {
  partnerId: PartnerId;
  status: Extract<PartnerStatus, "PENDING">;
  userId: UserId;
  nickname: string | null;
  avatar: string | null;
  waitlistedAt: Date | null;
};

export type AlternativeWaitlistReminderSlot = {
  partnerId: PartnerId;
  prId: PRId;
  userId: UserId;
  waitlistedAt: Date | null;
};

export type RosterParticipantSummary = {
  partnerId: PartnerId;
  status: Extract<
    PartnerStatus,
    "JOINED" | "CONFIRMED" | "ATTENDED" | "EXITED" | "RELEASED"
  >;
  userId: UserId | null;
  nickname: string | null;
  avatar: string | null;
  releasedAt?: Date | null;
  releaseReason?: string | null;
};

export class PartnerRepository {
  async findById(id: PartnerId) {
    const result = await db.select().from(partners).where(eq(partners.id, id));
    return result[0] ?? null;
  }

  async findByPrId(prId: PRId) {
    return db
      .select()
      .from(partners)
      .where(eq(partners.prId, prId))
      .orderBy(asc(partners.id));
  }

  async findActiveByPrIdAndUserId(prId: PRId, userId: UserId) {
    const result = await db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.userId, userId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(desc(partners.id));
    return result[0] ?? null;
  }

  async findPendingByPrIdAndUserId(prId: PRId, userId: UserId) {
    const result = await db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.userId, userId),
          eq(partners.status, "PENDING"),
        ),
      )
      .orderBy(desc(partners.waitlistedAt), desc(partners.id));
    return result[0] ?? null;
  }

  async findActiveByUserId(userId: UserId) {
    return db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.userId, userId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(desc(partners.id));
  }

  async listActiveIdsByPrId(prId: PRId): Promise<PartnerId[]> {
    const rows = await db
      .select({ id: partners.id })
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(asc(partners.id));
    return rows.map((row) => row.id);
  }

  async listActiveParticipantSummariesByPrId(
    prId: PRId,
  ): Promise<ActiveParticipantSummary[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
        phoneNumber: users.phoneNumber,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(asc(partners.id));

    return rows.map((row) => ({
      partnerId: row.partnerId,
      status: row.status as Extract<
        PartnerStatus,
        "JOINED" | "CONFIRMED" | "ATTENDED"
      >,
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
      phoneNumber: row.phoneNumber,
    }));
  }

  async listPendingParticipantSummariesByPrId(
    prId: PRId,
  ): Promise<PendingParticipantSummary[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
        waitlistedAt: partners.waitlistedAt,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(and(eq(partners.prId, prId), eq(partners.status, "PENDING")))
      .orderBy(asc(partners.waitlistedAt), asc(partners.id));

    return rows.map((row) => ({
      partnerId: row.partnerId,
      status: "PENDING",
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
      waitlistedAt: row.waitlistedAt,
    }));
  }

  async listRosterParticipantSummariesByPrId(
    prId: PRId,
  ): Promise<RosterParticipantSummary[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
        releasedAt: partners.releasedAt,
        releaseReason: partners.releaseReason,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, [
            "JOINED",
            "CONFIRMED",
            "ATTENDED",
            "EXITED",
            "RELEASED",
          ]),
          sql`${partners.userId} is not null`,
        ),
      )
      .orderBy(asc(partners.id));

    return rows.map((row) => ({
      partnerId: row.partnerId,
      status: row.status as RosterParticipantSummary["status"],
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
      releasedAt: row.releasedAt,
      releaseReason: row.releaseReason,
    }));
  }

  async findActiveParticipantSummaryByPrIdAndPartnerId(
    prId: PRId,
    partnerId: PartnerId,
  ): Promise<ActiveParticipantSummary | null> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
        phoneNumber: users.phoneNumber,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.id, partnerId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      );

    const row = rows[0] ?? null;
    if (!row) {
      return null;
    }

    return {
      partnerId: row.partnerId,
      status: row.status as Extract<
        PartnerStatus,
        "JOINED" | "CONFIRMED" | "ATTENDED"
      >,
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
      phoneNumber: row.phoneNumber,
    };
  }

  async countActiveByPrId(prId: PRId): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      );
    return result[0]?.count ?? 0;
  }

  async countPendingByPrId(prId: PRId): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(partners)
      .where(and(eq(partners.prId, prId), eq(partners.status, "PENDING")));
    return result[0]?.count ?? 0;
  }

  async countActiveByPrIds(prIds: PRId[]): Promise<Map<PRId, number>> {
    if (prIds.length === 0) {
      return new Map<PRId, number>();
    }

    const rows = await db
      .select({
        prId: partners.prId,
        count: sql<number>`count(*)::int`,
      })
      .from(partners)
      .where(
        and(
          inArray(partners.prId, prIds),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .groupBy(partners.prId);

    return new Map(rows.map((row) => [row.prId, row.count]));
  }

  async countTotalByPrId(prId: PRId): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(partners)
      .where(eq(partners.prId, prId));
    return result[0]?.count ?? 0;
  }

  async createSlot(data: {
    prId: PRId;
    userId: UserId;
    status: PartnerStatus;
    alternativePrReminderOptIn?: boolean;
  }) {
    const now = new Date();
    const nextStatus = data.status;
    const alternativePrReminderOptIn =
      nextStatus === "PENDING" && data.alternativePrReminderOptIn === true;
    const result = await db
      .insert(partners)
      .values({
        prId: data.prId,
        userId: data.userId,
        status: nextStatus,
        waitlistedAt: nextStatus === "PENDING" ? now : null,
        alternativePrReminderOptIn,
        alternativePrReminderOptedInAt: alternativePrReminderOptIn ? now : null,
        exitedAt: nextStatus === "EXITED" ? now : null,
        confirmedAt: nextStatus === "CONFIRMED" ? now : null,
        releasedAt: nextStatus === "RELEASED" ? now : null,
        releaseReason: null,
      })
      .returning();
    return result[0] ?? null;
  }

  async updateStatus(id: PartnerId, status: PartnerStatus) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status,
        waitlistedAt: status === "PENDING" ? now : null,
        exitedAt: status === "EXITED" ? now : null,
        releasedAt: status === "RELEASED" ? now : null,
        releaseReason: null,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async reactivateSlot(
    id: PartnerId,
    status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">,
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status,
        waitlistedAt: null,
        confirmedAt: status === "CONFIRMED" ? now : null,
        exitedAt: null,
        releasedAt: null,
        releaseReason: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        paymentStatus: "NONE",
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async markPending(
    id: PartnerId,
    options: { alternativePrReminderOptIn?: boolean } = {},
  ) {
    const now = new Date();
    const alternativePrReminderOptIn =
      options.alternativePrReminderOptIn === true;
    const result = await db
      .update(partners)
      .set({
        status: "PENDING",
        waitlistedAt: now,
        alternativePrReminderOptIn,
        alternativePrReminderOptedInAt: alternativePrReminderOptIn ? now : null,
        confirmedAt: null,
        exitedAt: null,
        releasedAt: null,
        releaseReason: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        paymentStatus: "NONE",
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async promotePendingSlot(
    id: PartnerId,
    status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">,
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status,
        waitlistedAt: null,
        confirmedAt: status === "CONFIRMED" ? now : null,
        exitedAt: null,
        releasedAt: null,
        releaseReason: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        paymentStatus: "NONE",
      })
      .where(and(eq(partners.id, id), eq(partners.status, "PENDING")))
      .returning();
    return result[0] ?? null;
  }

  async cancelPendingSlot(id: PartnerId) {
    const result = await db
      .update(partners)
      .set({
        status: "CANCELLED",
        waitlistedAt: null,
        alternativePrReminderOptIn: false,
        alternativePrReminderOptedInAt: null,
        confirmedAt: null,
        exitedAt: null,
        releasedAt: null,
        releaseReason: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        paymentStatus: "NONE",
      })
      .where(and(eq(partners.id, id), eq(partners.status, "PENDING")))
      .returning();
    return result[0] ?? null;
  }

  async listPendingAlternativeReminderSlotsByTypeAndLocation(input: {
    type: string;
    location: string;
    excludePrId: PRId;
  }): Promise<AlternativeWaitlistReminderSlot[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        prId: partners.prId,
        userId: partners.userId,
        waitlistedAt: partners.waitlistedAt,
      })
      .from(partners)
      .innerJoin(partnerRequests, eq(partnerRequests.id, partners.prId))
      .where(
        and(
          eq(partners.status, "PENDING"),
          eq(partners.alternativePrReminderOptIn, true),
          eq(partnerRequests.type, input.type),
          eq(partnerRequests.location, input.location),
          ne(partners.prId, input.excludePrId),
        ),
      )
      .orderBy(asc(partners.waitlistedAt), asc(partners.id));

    return rows;
  }

  async listPendingAlternativeReminderSlotsByUserForAlternative(input: {
    userId: UserId;
    type: string;
    location: string;
    excludePrId: PRId;
  }): Promise<AlternativeWaitlistReminderSlot[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        prId: partners.prId,
        userId: partners.userId,
        waitlistedAt: partners.waitlistedAt,
      })
      .from(partners)
      .innerJoin(partnerRequests, eq(partnerRequests.id, partners.prId))
      .where(
        and(
          eq(partners.userId, input.userId),
          eq(partners.status, "PENDING"),
          eq(partners.alternativePrReminderOptIn, true),
          eq(partnerRequests.type, input.type),
          eq(partnerRequests.location, input.location),
          ne(partners.prId, input.excludePrId),
        ),
      )
      .orderBy(asc(partners.waitlistedAt), asc(partners.id));

    return rows;
  }

  async listPendingAlternativeReminderSlotsByUser(
    userId: UserId,
  ): Promise<AlternativeWaitlistReminderSlot[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        prId: partners.prId,
        userId: partners.userId,
        waitlistedAt: partners.waitlistedAt,
      })
      .from(partners)
      .where(
        and(
          eq(partners.userId, userId),
          eq(partners.status, "PENDING"),
          eq(partners.alternativePrReminderOptIn, true),
        ),
      )
      .orderBy(asc(partners.waitlistedAt), asc(partners.id));

    return rows;
  }

  async markConfirmed(id: PartnerId) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "CONFIRMED",
        waitlistedAt: null,
        confirmedAt: now,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async markReleased(
    id: PartnerId,
    options: {
      releaseReason?: string | null;
    } = {},
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "RELEASED",
        waitlistedAt: null,
        exitedAt: null,
        confirmedAt: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        paymentStatus: "NONE",
        releasedAt: now,
        releaseReason: options.releaseReason ?? null,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async findReleasedByPrIdAndUserId(prId: PRId, userId: UserId) {
    const result = await db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.userId, userId),
          inArray(partners.status, ["RELEASED", "EXITED"]),
        ),
      )
      .orderBy(desc(partners.id));
    return result[0] ?? null;
  }

  async findReusableInactiveByPrIdAndUserId(prId: PRId, userId: UserId) {
    const result = await db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.userId, userId),
          inArray(partners.status, ["CANCELLED", "RELEASED", "EXITED"]),
        ),
      )
      .orderBy(desc(partners.id));
    return result[0] ?? null;
  }

  async reportCheckIn(id: PartnerId) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "ATTENDED",
        waitlistedAt: null,
        attendedAt: now,
        checkInAt: now,
        didAttend: true,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async deleteByIds(ids: PartnerId[]) {
    if (ids.length === 0) return;
    await db.delete(partners).where(inArray(partners.id, ids));
  }
}
