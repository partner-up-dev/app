import { desc, eq, sql } from "drizzle-orm";
import { type NewPRTypeConfig, type PRTypeConfig, prTypeConfigs } from "../entities/pr-type-config";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export class PRTypeConfigRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewPRTypeConfig): Promise<PRTypeConfig> {
    const result = await this.executor.insert(prTypeConfigs).values(data).returning();
    return result[0];
  }

  async findByType(type: string): Promise<PRTypeConfig | null> {
    const result = await this.executor
      .select()
      .from(prTypeConfigs)
      .where(eq(prTypeConfigs.type, type))
      .limit(1);
    return result[0] ?? null;
  }

  async findByTypeForUpdate(type: string): Promise<PRTypeConfig | null> {
    const result = await this.executor
      .select()
      .from(prTypeConfigs)
      .where(eq(prTypeConfigs.type, type))
      .limit(1)
      .for("update");
    return result[0] ?? null;
  }

  /** Operator creation needs case/whitespace-insensitive uniqueness without changing the persisted key. */
  async findByNormalizedType(type: string): Promise<PRTypeConfig | null> {
    const result = await this.executor
      .select()
      .from(prTypeConfigs)
      .where(sql`lower(btrim(${prTypeConfigs.type})) = lower(btrim(${type}))`)
      .limit(1);
    return result[0] ?? null;
  }

  async listAll(): Promise<PRTypeConfig[]> {
    return await this.executor
      .select()
      .from(prTypeConfigs)
      .orderBy(desc(prTypeConfigs.updatedAt), prTypeConfigs.type);
  }

  async updateByType(
    type: string,
    data: Partial<Omit<NewPRTypeConfig, "type" | "createdAt" | "updatedAt">>,
  ): Promise<PRTypeConfig | null> {
    const result = await this.executor
      .update(prTypeConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prTypeConfigs.type, type))
      .returning();
    return result[0] ?? null;
  }
}
