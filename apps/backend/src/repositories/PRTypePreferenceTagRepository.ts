import { and, asc, eq, inArray } from "drizzle-orm";
import {
  type NewPRTypePreferenceTag,
  type PRTypePreferenceTag,
  type PRTypePreferenceTagId,
  type PRTypePreferenceTagModerationStatus,
  prTypePreferenceTags,
} from "../entities/pr-type-preference-tag";
import { db } from "../lib/db";

export class PRTypePreferenceTagRepository {
  async create(data: NewPRTypePreferenceTag): Promise<PRTypePreferenceTag> {
    const result = await db.insert(prTypePreferenceTags).values(data).returning();
    return result[0]!;
  }

  async findById(id: PRTypePreferenceTagId): Promise<PRTypePreferenceTag | null> {
    const result = await db
      .select()
      .from(prTypePreferenceTags)
      .where(eq(prTypePreferenceTags.id, id));
    return result[0] ?? null;
  }

  async findByType(type: string): Promise<PRTypePreferenceTag[]> {
    return await db
      .select()
      .from(prTypePreferenceTags)
      .where(eq(prTypePreferenceTags.type, type))
      .orderBy(asc(prTypePreferenceTags.createdAt), asc(prTypePreferenceTags.id));
  }

  async findByTypeAndStatuses(
    type: string,
    moderationStatuses: PRTypePreferenceTagModerationStatus[],
  ): Promise<PRTypePreferenceTag[]> {
    if (moderationStatuses.length === 0) return [];
    return await db
      .select()
      .from(prTypePreferenceTags)
      .where(
        and(
          eq(prTypePreferenceTags.type, type),
          inArray(prTypePreferenceTags.moderationStatus, moderationStatuses),
        ),
      )
      .orderBy(asc(prTypePreferenceTags.createdAt), asc(prTypePreferenceTags.id));
  }

  async update(
    id: PRTypePreferenceTagId,
    data: Partial<Pick<PRTypePreferenceTag, "label" | "description" | "moderationStatus">>,
  ): Promise<PRTypePreferenceTag | null> {
    const result = await db
      .update(prTypePreferenceTags)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prTypePreferenceTags.id, id))
      .returning();
    return result[0] ?? null;
  }
}
