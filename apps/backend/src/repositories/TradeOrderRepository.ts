import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  tradeOrders,
  type NewTradeOrder,
  type TradeOrder,
  type TradeOrderId,
} from "../entities/trade-order";
import type { OfferId } from "../entities/offer";
import type {
  OrderStatus,
  OrderTerminationAttempt,
} from "../domains/trade/model";
import type { RepositoryExecutor } from "./_executor";

export class TradeOrderRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewTradeOrder): Promise<TradeOrder> {
    const result = await this.executor
      .insert(tradeOrders)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(id: TradeOrderId): Promise<TradeOrder | null> {
    const result = await this.executor
      .select()
      .from(tradeOrders)
      .where(eq(tradeOrders.id, id));
    return result[0] ?? null;
  }

  async listAll(): Promise<TradeOrder[]> {
    return this.executor
      .select()
      .from(tradeOrders)
      .orderBy(desc(tradeOrders.createdAt));
  }

  async listByIds(ids: TradeOrderId[]): Promise<TradeOrder[]> {
    if (ids.length === 0) return [];
    return this.executor
      .select()
      .from(tradeOrders)
      .where(inArray(tradeOrders.id, ids))
      .orderBy(desc(tradeOrders.createdAt));
  }

  async listByIdsOfferAndStatuses(input: {
    ids: TradeOrderId[];
    offerId: OfferId;
    statuses: OrderStatus[];
  }): Promise<TradeOrder[]> {
    if (input.ids.length === 0 || input.statuses.length === 0) return [];
    return this.executor
      .select()
      .from(tradeOrders)
      .where(
        and(
          inArray(tradeOrders.id, input.ids),
          eq(tradeOrders.offerId, input.offerId),
          inArray(tradeOrders.status, input.statuses),
        ),
      )
      .orderBy(desc(tradeOrders.createdAt));
  }

  async updateStatus(
    id: TradeOrderId,
    status: OrderStatus,
    closedAt: Date | null = null,
  ): Promise<TradeOrder | null> {
    const result = await this.executor
      .update(tradeOrders)
      .set({
        status,
        closedAt,
        updatedAt: new Date(),
      })
      .where(eq(tradeOrders.id, id))
      .returning();
    return result[0] ?? null;
  }

  async replaceTerminationAttempts(
    id: TradeOrderId,
    terminationAttempts: OrderTerminationAttempt[],
  ): Promise<TradeOrder | null> {
    const result = await this.executor
      .update(tradeOrders)
      .set({
        terminationAttempts,
        updatedAt: new Date(),
      })
      .where(eq(tradeOrders.id, id))
      .returning();
    return result[0] ?? null;
  }

  async applyTerminationState(input: {
    id: TradeOrderId;
    status: OrderStatus;
    terminationAttempts: OrderTerminationAttempt[];
  }): Promise<TradeOrder | null> {
    const result = await this.executor
      .update(tradeOrders)
      .set({
        status: input.status,
        terminationAttempts: input.terminationAttempts,
        updatedAt: new Date(),
      })
      .where(eq(tradeOrders.id, input.id))
      .returning();
    return result[0] ?? null;
  }
}
