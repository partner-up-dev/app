import { asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  billLines,
  type BillId,
  type BillLine,
  type BillLineId,
  type NewBillLine,
} from "../entities/bill";
import type { RepositoryExecutor } from "./_executor";

export class BillLineRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async createMany(data: NewBillLine[]): Promise<BillLine[]> {
    if (data.length === 0) {
      return [];
    }

    return this.executor.insert(billLines).values(data).returning();
  }

  async listByBillId(billId: BillId): Promise<BillLine[]> {
    return this.executor
      .select()
      .from(billLines)
      .where(eq(billLines.billId, billId))
      .orderBy(asc(billLines.createdAt), asc(billLines.id));
  }

  async findById(id: BillLineId): Promise<BillLine | null> {
    const result = await this.executor
      .select()
      .from(billLines)
      .where(eq(billLines.id, id));
    return result[0] ?? null;
  }
}
