import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { FeedbackQuestionnaireInstanceId } from "../entities/feedback-questionnaire";
import type { PRJoinGateConfig } from "../entities/join-gate";
import {
  type NewPartnerRequest,
  type PartnerRequest,
  type PartnerRequestFields,
  type PRId,
  type PRReadyCycleId,
  type PRStatus,
  type PRTimeWindow,
  partnerRequests,
  type VisibilityStatus,
  type WechatThumbnailCache,
  type XiaohongshuPosterCache,
} from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export class PartnerRequestRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewPartnerRequest) {
    const result = await this.executor.insert(partnerRequests).values(data).returning();
    return result[0];
  }

  async findById(id: PRId) {
    const result = await this.executor
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id));
    return result[0] || null;
  }

  async findByIdForUpdate(id: PRId): Promise<PartnerRequest | null> {
    const result = await this.executor
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id))
      .for("update");
    return result[0] ?? null;
  }

  async findByIds(ids: PRId[]) {
    if (ids.length === 0) return [];
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(inArray(partnerRequests.id, ids))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByStatuses(statuses: PRStatus[]) {
    if (statuses.length === 0) return [];
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(inArray(partnerRequests.status, statuses))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async listAll(): Promise<PartnerRequest[]> {
    return await this.executor
      .select()
      .from(partnerRequests)
      .orderBy(desc(partnerRequests.createdAt));
  }

  async listDistinctTypes(): Promise<string[]> {
    const rows = await this.executor
      .selectDistinct({ type: partnerRequests.type })
      .from(partnerRequests)
      .orderBy(partnerRequests.type);
    return rows.map((row) => row.type);
  }

  async findVisibleByType(type: string): Promise<PartnerRequest[]> {
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(and(eq(partnerRequests.type, type), eq(partnerRequests.visibilityStatus, "VISIBLE")))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByType(type: string): Promise<PartnerRequest[]> {
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.type, type))
      .orderBy(desc(partnerRequests.createdAt));
  }

  /**
   * Source-owned type coordination locks its full current impact set in a
   * deterministic order before it observes effective meeting points.
   */
  async findByTypeForUpdate(type: string): Promise<PartnerRequest[]> {
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.type, type))
      .orderBy(asc(partnerRequests.id))
      .for("update");
  }

  /**
   * POI rename/update locks the full old/new name impact set before it
   * observes effective meeting points. Location text remains the current
   * relation until a separately authorized POI identity model exists.
   */
  async findByLocationsForUpdate(locations: string[]): Promise<PartnerRequest[]> {
    const normalizedLocations = Array.from(
      new Set(locations.map((location) => location.trim()).filter(Boolean)),
    );
    if (normalizedLocations.length === 0) {
      return [];
    }

    return await this.executor
      .select()
      .from(partnerRequests)
      .where(inArray(partnerRequests.location, normalizedLocations))
      .orderBy(asc(partnerRequests.id))
      .for("update");
  }

  async findVisibleByTypeAndTime(
    type: string,
    timeWindow: PRTimeWindow,
  ): Promise<PartnerRequest[]> {
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(
        and(
          eq(partnerRequests.type, type),
          eq(partnerRequests.time, timeWindow),
          eq(partnerRequests.visibilityStatus, "VISIBLE"),
        ),
      )
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByTypeAndTime(type: string, timeWindow: PRTimeWindow): Promise<PartnerRequest[]> {
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(and(eq(partnerRequests.type, type), eq(partnerRequests.time, timeWindow)))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByCreatorId(userId: UserId) {
    return await this.executor
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.createdBy, userId))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async updateStatus(id: PRId, status: PRStatus) {
    const result = await this.executor
      .update(partnerRequests)
      .set({ status })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  /**
   * Persistence primitive for the PR-owned READY transition. Callers must
   * hold the PR transaction/row lock and supply the freshly generated cycle.
   */
  async enterReadyWithCycle(
    id: PRId,
    readyCycleId: PRReadyCycleId,
  ): Promise<PartnerRequest | null> {
    const result = await this.executor
      .update(partnerRequests)
      .set({ status: "READY", readyCycleId })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }

  async updateVisibilityStatus(id: PRId, visibilityStatus: VisibilityStatus) {
    const result = await this.executor
      .update(partnerRequests)
      .set({ visibilityStatus })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async updatePartnerRules(
    id: PRId,
    data: {
      confirmationEnabled: boolean;
      confirmationStartOffsetMinutes: number | null;
      confirmationEndOffsetMinutes: number | null;
      joinLockOffsetMinutes: number | null;
    },
  ) {
    const result = await this.executor
      .update(partnerRequests)
      .set({
        confirmationEnabled: data.confirmationEnabled,
        confirmationStartOffsetMinutes: data.confirmationStartOffsetMinutes,
        confirmationEndOffsetMinutes: data.confirmationEndOffsetMinutes,
        joinLockOffsetMinutes: data.joinLockOffsetMinutes,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async updateJoinGateConfig(
    id: PRId,
    joinGateConfig: PRJoinGateConfig,
  ): Promise<PartnerRequest | null> {
    const result = await this.executor
      .update(partnerRequests)
      .set({
        joinGateConfig,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async updateNotes(id: PRId, notes: string | null): Promise<PartnerRequest | null> {
    const result = await this.executor
      .update(partnerRequests)
      .set({
        notes,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async updateFeedbackQuestionnaireInstanceId(
    id: PRId,
    feedbackQuestionnaireInstanceId: FeedbackQuestionnaireInstanceId | null,
  ): Promise<PartnerRequest | null> {
    const result = await this.executor
      .update(partnerRequests)
      .set({
        feedbackQuestionnaireInstanceId,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async updateFields(id: PRId, fields: PartnerRequestFields) {
    const result = await this.executor
      .update(partnerRequests)
      .set({
        title: fields.title,
        type: fields.type,
        time: fields.time,
        location: fields.location,
        route: fields.route,
        minPartners: fields.minPartners,
        maxPartners: fields.maxPartners,
        budget: fields.budget,
        preferences: fields.preferences,
        notes: fields.notes,
        meetingPoint: fields.meetingPoint ?? null,
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async setCreatedBy(id: PRId, userId: UserId | null) {
    const result = await this.executor
      .update(partnerRequests)
      .set({ createdBy: userId })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async addXiaohongshuPoster(
    id: PRId,
    cache: XiaohongshuPosterCache,
  ): Promise<PartnerRequest | null> {
    const result = await this.executor
      .update(partnerRequests)
      .set({ xiaohongshuPoster: cache })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async addWechatThumbnail(id: PRId, cache: WechatThumbnailCache): Promise<PartnerRequest | null> {
    const result = await this.executor
      .update(partnerRequests)
      .set({ wechatThumbnail: cache })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async findXiaohongshuPoster(
    id: PRId,
    caption: string,
    posterStylePrompt: string,
  ): Promise<string | null> {
    const result = await this.executor
      .select({ xiaohongshuPoster: partnerRequests.xiaohongshuPoster })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id));
    const pr = result[0];
    if (!pr?.xiaohongshuPoster) return null;
    const cache = pr.xiaohongshuPoster;
    if (cache.caption === caption && cache.posterStylePrompt === posterStylePrompt) {
      return cache.posterUrl;
    }
    return null;
  }

  async findWechatThumbnail(id: PRId, style: number): Promise<string | null> {
    const result = await this.executor
      .select({ wechatThumbnail: partnerRequests.wechatThumbnail })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id));
    const pr = result[0];
    if (!pr?.wechatThumbnail) return null;
    const cache = pr.wechatThumbnail;
    if (cache.style === style) {
      return cache.posterUrl;
    }
    return null;
  }

  async clearPosterCache(id: PRId): Promise<void> {
    await this.executor
      .update(partnerRequests)
      .set({ xiaohongshuPoster: null, wechatThumbnail: null })
      .where(eq(partnerRequests.id, id));
  }

  async deleteById(id: PRId): Promise<PartnerRequest | null> {
    const result = await this.executor
      .delete(partnerRequests)
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] ?? null;
  }
}
