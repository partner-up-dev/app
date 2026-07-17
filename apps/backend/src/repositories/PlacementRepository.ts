import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  placements,
  type NewPlacement,
  type Placement,
  type PlacementId,
} from "../entities/placement";
import type { PlacementType } from "../domains/merchandising/model";
import type { RepositoryExecutor } from "./_executor";

export class PlacementRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewPlacement): Promise<Placement> {
    const result = await this.executor.insert(placements).values(data).returning();
    return result[0]!;
  }

  async findById(id: PlacementId): Promise<Placement | null> {
    const result = await this.executor.select().from(placements).where(eq(placements.id, id));
    return result[0] ?? null;
  }

  async listAll(): Promise<Placement[]> {
    return this.executor
      .select()
      .from(placements)
      .orderBy(asc(placements.placementType), asc(placements.priority), desc(placements.createdAt));
  }

  async listActiveByType(input: { placementType: PlacementType }): Promise<Placement[]> {
    return this.executor
      .select()
      .from(placements)
      .where(
        and(
          eq(placements.placementType, input.placementType),
          eq(placements.status, "ACTIVE"),
          or(isNull(placements.effectiveFrom), lte(placements.effectiveFrom, new Date())),
          or(isNull(placements.effectiveTo), gt(placements.effectiveTo, new Date())),
        ),
      )
      .orderBy(desc(placements.priority), desc(placements.createdAt));
  }

  async updateById(id: PlacementId, data: Partial<NewPlacement>): Promise<Placement | null> {
    const result = await this.executor
      .update(placements)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(placements.id, id))
      .returning();
    return result[0] ?? null;
  }
}
