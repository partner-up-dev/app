import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { bills, type Bill, type BillId, type NewBill } from "../entities/bill";
import type { TradeOrderId } from "../entities/trade-order";
import type { BillStatus } from "../domains/bill/model";
import type { RepositoryExecutor } from "./_executor";

export class BillRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewBill): Promise<Bill> {
    const result = await this.executor.insert(bills).values(data).returning();
    return result[0]!;
  }

  async findById(id: BillId): Promise<Bill | null> {
    const result = await this.executor.select().from(bills).where(eq(bills.id, id));
    return result[0] ?? null;
  }

  async findBySourceOrderId(sourceOrderId: TradeOrderId): Promise<Bill | null> {
    const result = await this.executor
      .select()
      .from(bills)
      .where(eq(bills.sourceOrderId, sourceOrderId));
    return result[0] ?? null;
  }

  async findByIds(ids: BillId[]): Promise<Bill[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.executor.select().from(bills).where(inArray(bills.id, ids));
  }

  async listAll(): Promise<Bill[]> {
    return this.executor.select().from(bills).orderBy(desc(bills.createdAt));
  }

  async updateStatus(
    id: BillId,
    status: BillStatus,
    closedAt: Date | null = null,
  ): Promise<Bill | null> {
    const result = await this.executor
      .update(bills)
      .set({
        status,
        closedAt,
        updatedAt: new Date(),
      })
      .where(eq(bills.id, id))
      .returning();
    return result[0] ?? null;
  }
}
