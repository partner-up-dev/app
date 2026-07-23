import { and, desc, eq, inArray } from "drizzle-orm";
import { normalizeMeetingPointConfig, type MeetingPointConfig } from "../entities/meeting-point";
import {
  normalizePoiAvailabilityRules,
  pois,
  type Poi,
  type PoiAvailabilityRule,
  type PoiCoordinate,
  type PoiStatus,
} from "../entities/poi";
import type { UserId } from "../entities/user";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

const normalizeIds = (ids: string[]): string[] => {
  const set = new Set<string>();
  for (const id of ids) {
    const normalized = id.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
};

const normalizeNumericIds = (ids: number[]): number[] => {
  const set = new Set<number>();
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0) continue;
    set.add(id);
  }
  return Array.from(set);
};

const normalizeGallery = (gallery: string[]): string[] => {
  const set = new Set<string>();
  for (const item of gallery) {
    const normalized = item.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
};

export class PoiRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async listAll(): Promise<Poi[]> {
    return await this.executor.select().from(pois);
  }

  async findById(id: number, options: { includeUnpublished?: boolean } = {}): Promise<Poi | null> {
    const result = await this.findByIds([id], options);
    return result[0] ?? null;
  }

  async findByIdForUpdate(id: number): Promise<Poi | null> {
    const result = await this.executor.select().from(pois).where(eq(pois.id, id)).for("update");
    return result[0] ?? null;
  }

  async findByIds(ids: number[], options: { includeUnpublished?: boolean } = {}): Promise<Poi[]> {
    const normalizedIds = normalizeNumericIds(ids);
    if (normalizedIds.length === 0) {
      return [];
    }

    const filters = [inArray(pois.id, normalizedIds)];
    if (options.includeUnpublished !== true) {
      filters.push(eq(pois.status, "PUBLISHED"));
    }

    return await this.executor
      .select()
      .from(pois)
      .where(and(...filters));
  }

  async findByName(
    name: string,
    options: { includeUnpublished?: boolean } = {},
  ): Promise<Poi | null> {
    const result = await this.findByNames([name], options);
    return result[0] ?? null;
  }

  async findByNames(
    names: string[],
    options: { includeUnpublished?: boolean } = {},
  ): Promise<Poi[]> {
    const normalizedNames = normalizeIds(names);
    if (normalizedNames.length === 0) {
      return [];
    }

    const filters = [inArray(pois.name, normalizedNames)];
    if (options.includeUnpublished !== true) {
      filters.push(eq(pois.status, "PUBLISHED"));
    }

    return await this.executor
      .select()
      .from(pois)
      .where(and(...filters));
  }

  async findBySubmitter(submitterUserId: UserId): Promise<Poi[]> {
    return await this.executor
      .select()
      .from(pois)
      .where(eq(pois.submittedByUserId, submitterUserId))
      .orderBy(desc(pois.createdAt), desc(pois.updatedAt));
  }

  async upsertByName(
    name: string,
    data: {
      fullAddress?: string | null;
      gallery: string[];
      gcj02?: PoiCoordinate | null;
      wgs84?: PoiCoordinate | null;
      bd09?: PoiCoordinate | null;
      status?: PoiStatus;
      perTimeWindowCap?: number | null;
      availabilityRules?: PoiAvailabilityRule[];
      meetingPoint?: MeetingPointConfig | null;
      submittedByUserId?: UserId | null;
      reviewedByUserId?: UserId | null;
      reviewedAt?: Date | null;
      rejectReason?: string | null;
    },
  ): Promise<Poi> {
    const normalizedName = name.trim();
    const normalizedFullAddress = data.fullAddress?.trim() || null;
    const normalizedGallery = normalizeGallery(data.gallery);
    const normalizedPerTimeWindowCap =
      data.perTimeWindowCap === undefined ? null : data.perTimeWindowCap;
    const shouldReplaceAvailabilityRules = data.availabilityRules !== undefined;
    const normalizedAvailabilityRules = shouldReplaceAvailabilityRules
      ? normalizePoiAvailabilityRules(data.availabilityRules)
      : [];
    const normalizedMeetingPoint = normalizeMeetingPointConfig(data.meetingPoint);

    const result = await this.executor
      .insert(pois)
      .values({
        name: normalizedName,
        fullAddress: normalizedFullAddress,
        status: data.status ?? "PUBLISHED",
        gallery: normalizedGallery,
        gcj02: data.gcj02 ?? null,
        wgs84: data.wgs84 ?? null,
        bd09: data.bd09 ?? null,
        perTimeWindowCap: normalizedPerTimeWindowCap,
        availabilityRules: normalizedAvailabilityRules,
        meetingPoint: normalizedMeetingPoint,
        submittedByUserId: data.submittedByUserId ?? null,
        reviewedByUserId: data.reviewedByUserId ?? null,
        reviewedAt: data.reviewedAt ?? null,
        rejectReason: data.rejectReason ?? null,
      })
      .onConflictDoUpdate({
        target: pois.name,
        set: {
          fullAddress: normalizedFullAddress,
          gallery: normalizedGallery,
          gcj02: data.gcj02 ?? null,
          wgs84: data.wgs84 ?? null,
          bd09: data.bd09 ?? null,
          perTimeWindowCap: normalizedPerTimeWindowCap,
          ...(data.status ? { status: data.status } : {}),
          ...(shouldReplaceAvailabilityRules
            ? { availabilityRules: normalizedAvailabilityRules }
            : {}),
          meetingPoint: normalizedMeetingPoint,
          ...(data.submittedByUserId !== undefined
            ? { submittedByUserId: data.submittedByUserId }
            : {}),
          ...(data.reviewedByUserId !== undefined
            ? { reviewedByUserId: data.reviewedByUserId }
            : {}),
          ...(data.reviewedAt !== undefined ? { reviewedAt: data.reviewedAt } : {}),
          ...(data.rejectReason !== undefined ? { rejectReason: data.rejectReason } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  }

  async createByName(
    name: string,
    data: {
      fullAddress?: string | null;
      gallery: string[];
      gcj02?: PoiCoordinate | null;
      wgs84?: PoiCoordinate | null;
      bd09?: PoiCoordinate | null;
      perTimeWindowCap?: number | null;
      availabilityRules?: PoiAvailabilityRule[];
      meetingPoint?: MeetingPointConfig | null;
    },
  ): Promise<Poi | null> {
    const normalizedName = name.trim();
    const normalizedFullAddress = data.fullAddress?.trim() || null;
    const normalizedGallery = normalizeGallery(data.gallery);
    const normalizedAvailabilityRules = normalizePoiAvailabilityRules(data.availabilityRules ?? []);
    const normalizedMeetingPoint = normalizeMeetingPointConfig(data.meetingPoint);

    const result = await this.executor
      .insert(pois)
      .values({
        name: normalizedName,
        fullAddress: normalizedFullAddress,
        status: "PUBLISHED",
        gallery: normalizedGallery,
        gcj02: data.gcj02 ?? null,
        wgs84: data.wgs84 ?? null,
        bd09: data.bd09 ?? null,
        perTimeWindowCap: data.perTimeWindowCap ?? null,
        availabilityRules: normalizedAvailabilityRules,
        meetingPoint: normalizedMeetingPoint,
      })
      .onConflictDoNothing({
        target: pois.name,
      })
      .returning();

    return result[0] ?? null;
  }

  async updateById(
    id: number,
    data: {
      name: string;
      fullAddress?: string | null;
      gallery: string[];
      gcj02?: PoiCoordinate | null;
      wgs84?: PoiCoordinate | null;
      bd09?: PoiCoordinate | null;
      perTimeWindowCap?: number | null;
      availabilityRules?: PoiAvailabilityRule[];
      meetingPoint?: MeetingPointConfig | null;
    },
  ): Promise<Poi | null> {
    const normalizedName = data.name.trim();
    const normalizedFullAddress = data.fullAddress?.trim() || null;
    const normalizedGallery = normalizeGallery(data.gallery);
    const normalizedPerTimeWindowCap =
      data.perTimeWindowCap === undefined ? null : data.perTimeWindowCap;
    const normalizedAvailabilityRules =
      data.availabilityRules === undefined
        ? []
        : normalizePoiAvailabilityRules(data.availabilityRules);
    const normalizedMeetingPoint = normalizeMeetingPointConfig(data.meetingPoint);

    const result = await this.executor
      .update(pois)
      .set({
        name: normalizedName,
        fullAddress: normalizedFullAddress,
        gallery: normalizedGallery,
        gcj02: data.gcj02 ?? null,
        wgs84: data.wgs84 ?? null,
        bd09: data.bd09 ?? null,
        perTimeWindowCap: normalizedPerTimeWindowCap,
        availabilityRules: normalizedAvailabilityRules,
        meetingPoint: normalizedMeetingPoint,
        updatedAt: new Date(),
      })
      .where(eq(pois.id, id))
      .returning();

    return result[0] ?? null;
  }

  async createApplication(data: {
    name: string;
    imageUrl: string;
    submittedByUserId: UserId;
  }): Promise<Poi | null> {
    const result = await this.executor
      .insert(pois)
      .values({
        name: data.name.trim(),
        fullAddress: null,
        status: "PENDING",
        gallery: [data.imageUrl.trim()].filter(Boolean),
        gcj02: null,
        wgs84: null,
        bd09: null,
        perTimeWindowCap: null,
        availabilityRules: [],
        meetingPoint: null,
        submittedByUserId: data.submittedByUserId,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectReason: null,
      })
      .onConflictDoNothing()
      .returning();

    return result[0] ?? null;
  }

  async updateReviewState(
    id: number,
    data: {
      status: Extract<PoiStatus, "PUBLISHED" | "REJECTED">;
      reviewedByUserId: UserId | null;
      rejectReason?: string | null;
    },
  ): Promise<Poi | null> {
    const result = await this.executor
      .update(pois)
      .set({
        status: data.status,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: new Date(),
        rejectReason: data.status === "REJECTED" ? (data.rejectReason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(pois.id, id))
      .returning();

    return result[0] ?? null;
  }
}
