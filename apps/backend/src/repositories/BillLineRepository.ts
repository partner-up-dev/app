import { and, asc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  type BillId,
  type BillLine,
  type BillLineId,
  billLines,
  type NewBillLine,
} from "../entities/bill";
import type { PaymentProviderInstanceId } from "../entities/payment";
import type { UserId } from "../entities/user";
import { db } from "../lib/db";
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

  async listByBillIds(billIds: BillId[]): Promise<BillLine[]> {
    if (billIds.length === 0) {
      return [];
    }

    return this.executor
      .select()
      .from(billLines)
      .where(inArray(billLines.billId, billIds))
      .orderBy(asc(billLines.createdAt), asc(billLines.id));
  }

  async listUnsettledChargeLinesByUserIds(userIds: UserId[]): Promise<BillLine[]> {
    const uniqueUserIds = Array.from(new Set(userIds));
    if (uniqueUserIds.length === 0) {
      return [];
    }

    return this.executor
      .select()
      .from(billLines)
      .where(
        and(
          inArray(billLines.userId, uniqueUserIds),
          eq(billLines.kind, "CHARGE"),
          isNull(billLines.settledAt),
        ),
      )
      .orderBy(asc(billLines.createdAt), asc(billLines.id));
  }

  async findById(id: BillLineId): Promise<BillLine | null> {
    const result = await this.executor.select().from(billLines).where(eq(billLines.id, id));
    return result[0] ?? null;
  }

  async openProviderExecutionSlot(input: {
    id: BillLineId;
    paymentProviderInstanceId: PaymentProviderInstanceId;
  }): Promise<BillLine | null> {
    const result = await this.executor
      .update(billLines)
      .set({
        paymentProviderInstanceId: input.paymentProviderInstanceId,
        attemptCount: sql`${billLines.attemptCount} + 1`,
      })
      .where(
        and(
          eq(billLines.id, input.id),
          isNull(billLines.paymentProviderInstanceId),
          isNull(billLines.settledAt),
        ),
      )
      .returning();
    return result[0] ?? null;
  }

  async clearProviderExecutionSlot(input: {
    id: BillLineId;
    paymentProviderInstanceId: PaymentProviderInstanceId;
    attemptCount: number;
  }): Promise<BillLine | null> {
    const result = await this.executor
      .update(billLines)
      .set({
        paymentProviderInstanceId: null,
      })
      .where(
        and(
          eq(billLines.id, input.id),
          eq(billLines.paymentProviderInstanceId, input.paymentProviderInstanceId),
          eq(billLines.attemptCount, input.attemptCount),
          isNull(billLines.settledAt),
        ),
      )
      .returning();
    return result[0] ?? null;
  }

  async markSettledFromProvider(input: {
    id: BillLineId;
    paymentProviderInstanceId: PaymentProviderInstanceId;
    attemptCount: number;
    settledAt: Date;
  }): Promise<BillLine | null> {
    const result = await this.executor
      .update(billLines)
      .set({
        paymentProviderInstanceId: input.paymentProviderInstanceId,
        settledAt: input.settledAt,
      })
      .where(
        and(
          eq(billLines.id, input.id),
          gte(billLines.attemptCount, input.attemptCount),
          isNull(billLines.settledAt),
        ),
      )
      .returning();
    return result[0] ?? null;
  }
}
