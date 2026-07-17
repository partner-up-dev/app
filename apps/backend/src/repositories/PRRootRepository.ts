import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  partnerRequests,
  type NewPartnerRequest,
  type PartnerRequest,
  type PartnerRequestFields,
  type PRId,
  type PRStatus,
  type VisibilityStatus,
  type XiaohongshuPosterCache,
  type WechatThumbnailCache,
} from "../entities/partner-request";
import type { UserId } from "../entities/user";

export class PRRootRepository {
  async create(data: NewPartnerRequest): Promise<PartnerRequest> {
    const result = await db.insert(partnerRequests).values(data).returning();
    return result[0];
  }

  async findById(id: PRId): Promise<PartnerRequest | null> {
    const result = await db.select().from(partnerRequests).where(eq(partnerRequests.id, id));
    return result[0] ?? null;
  }

  async findByIds(ids: PRId[]): Promise<PartnerRequest[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(partnerRequests)
      .where(inArray(partnerRequests.id, ids))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByCreatorId(userId: UserId): Promise<PartnerRequest[]> {
    return await db
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.createdBy, userId))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async updateStatus(id: PRId, status: PRStatus): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ status })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async updateVisibilityStatus(
    id: PRId,
    visibilityStatus: VisibilityStatus,
  ): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ visibilityStatus })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async updatePartnerRules(
    id: PRId,
    data: {
      confirmationStartOffsetMinutes: number | null;
      confirmationEndOffsetMinutes: number | null;
      joinLockOffsetMinutes: number | null;
    },
  ): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({
        confirmationStartOffsetMinutes: data.confirmationStartOffsetMinutes,
        confirmationEndOffsetMinutes: data.confirmationEndOffsetMinutes,
        joinLockOffsetMinutes: data.joinLockOffsetMinutes,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async updateFields(id: PRId, fields: PartnerRequestFields): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({
        title: fields.title,
        type: fields.type,
        time: fields.time,
        location: fields.location,
        route: fields.route,
        minPartners: fields.minPartners,
        maxPartners: fields.maxPartners,
        preferences: fields.preferences,
        notes: fields.notes,
        meetingPoint: fields.meetingPoint ?? null,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async setCreatedBy(id: PRId, userId: UserId | null): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ createdBy: userId })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async addXiaohongshuPoster(
    id: PRId,
    cache: XiaohongshuPosterCache,
  ): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ xiaohongshuPoster: cache })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async addWechatThumbnail(id: PRId, cache: WechatThumbnailCache): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ wechatThumbnail: cache })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async clearPosterCache(id: PRId): Promise<void> {
    await db
      .update(partnerRequests)
      .set({ xiaohongshuPoster: null, wechatThumbnail: null })
      .where(eq(partnerRequests.id, id));
  }
}
