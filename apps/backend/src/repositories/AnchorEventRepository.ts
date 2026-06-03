import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorEvents,
  type AnchorEvent,
  type AnchorEventId,
  type NewAnchorEvent,
  type AnchorEventStatus,
} from "../entities/anchor-event";

export class AnchorEventRepository {
  async create(data: NewAnchorEvent): Promise<AnchorEvent> {
    const result = await db.insert(anchorEvents).values(data).returning();
    return result[0];
  }

  async listAll(): Promise<AnchorEvent[]> {
    return await db.select().from(anchorEvents).orderBy(desc(anchorEvents.createdAt));
  }

  async listDistinctTypes(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ type: anchorEvents.type })
      .from(anchorEvents)
      .orderBy(anchorEvents.type);
    return rows.map((row) => row.type);
  }

  async findById(id: AnchorEventId): Promise<AnchorEvent | null> {
    const result = await db
      .select()
      .from(anchorEvents)
      .where(eq(anchorEvents.id, id));
    return result[0] ?? null;
  }

  async findByStatuses(statuses: AnchorEventStatus[]): Promise<AnchorEvent[]> {
    if (statuses.length === 0) return [];
    return await db
      .select()
      .from(anchorEvents)
      .where(inArray(anchorEvents.status, statuses))
      .orderBy(desc(anchorEvents.createdAt));
  }

  async listActive(): Promise<AnchorEvent[]> {
    return this.findByStatuses(["ACTIVE"]);
  }

  async findByType(type: string): Promise<AnchorEvent[]> {
    return await db
      .select()
      .from(anchorEvents)
      .where(eq(anchorEvents.type, type))
      .orderBy(desc(anchorEvents.createdAt));
  }

  async findOneByType(type: string): Promise<AnchorEvent | null> {
    const result = await db
      .select()
      .from(anchorEvents)
      .where(eq(anchorEvents.type, type));
    return result[0] ?? null;
  }

  async updateStatus(
    id: AnchorEventId,
    status: AnchorEventStatus,
  ): Promise<AnchorEvent | null> {
    const result = await db
      .update(anchorEvents)
      .set({ status, updatedAt: new Date() })
      .where(eq(anchorEvents.id, id))
      .returning();
    return result[0] ?? null;
  }

  async update(
    id: AnchorEventId,
    data: Partial<
      Pick<
        AnchorEvent,
        | "title"
        | "type"
        | "description"
        | "locationPool"
        | "routePool"
        | "timePoolConfig"
        | "defaultMinPartners"
        | "defaultMaxPartners"
        | "defaultPrNotes"
        | "defaultConfirmationEnabled"
        | "defaultConfirmationStartOffsetMinutes"
        | "defaultConfirmationEndOffsetMinutes"
        | "defaultJoinLockOffsetMinutes"
        | "meetingPoint"
        | "locationMeetingPoints"
        | "joinGateConfig"
        | "participationFrequencyLimit"
        | "feedbackQuestionnaireTemplateId"
        | "coverImage"
        | "betaGroupQrCode"
        | "prCreationPolicy"
        | "fullPrExpansionPolicy"
        | "status"
      >
    >,
  ): Promise<AnchorEvent | null> {
    const result = await db
      .update(anchorEvents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(anchorEvents.id, id))
      .returning();
    return result[0] ?? null;
  }
}
