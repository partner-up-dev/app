import { desc, eq } from "drizzle-orm";
import { type NewPRTypeConfig, type PRTypeConfig, prTypeConfigs } from "../entities/pr-type-config";
import { db } from "../lib/db";

export class PRTypeConfigRepository {
  async create(data: NewPRTypeConfig): Promise<PRTypeConfig> {
    const result = await db.insert(prTypeConfigs).values(data).returning();
    return result[0];
  }

  async findByType(type: string): Promise<PRTypeConfig | null> {
    const result = await db
      .select()
      .from(prTypeConfigs)
      .where(eq(prTypeConfigs.type, type))
      .limit(1);
    return result[0] ?? null;
  }

  async listAll(): Promise<PRTypeConfig[]> {
    return await db
      .select()
      .from(prTypeConfigs)
      .orderBy(desc(prTypeConfigs.updatedAt), prTypeConfigs.type);
  }

  async updateByType(
    type: string,
    data: Partial<Omit<NewPRTypeConfig, "type" | "createdAt" | "updatedAt">>,
  ): Promise<PRTypeConfig | null> {
    const result = await db
      .update(prTypeConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prTypeConfigs.type, type))
      .returning();
    return result[0] ?? null;
  }
}
