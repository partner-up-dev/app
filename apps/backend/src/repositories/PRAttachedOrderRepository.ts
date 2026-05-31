import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  prAttachedOrders,
  type NewPRAttachedOrder,
  type PRAttachedOrder,
} from "../entities/pr-attached-order";
import type { PRId } from "../entities/partner-request";
import type { OfferId } from "../entities/offer";
import { tradeOrders, type TradeOrderId } from "../entities/trade-order";
import type { OrderStatus } from "../domains/trade/model";
import type { RepositoryExecutor } from "./_executor";

const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "CANCELLED",
  "FAILED",
  "EXPIRED",
  "COMPLETED",
];

export class PRAttachedOrderRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewPRAttachedOrder): Promise<PRAttachedOrder> {
    const result = await this.executor
      .insert(prAttachedOrders)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findByOrderId(orderId: TradeOrderId): Promise<PRAttachedOrder | null> {
    const result = await this.executor
      .select()
      .from(prAttachedOrders)
      .where(eq(prAttachedOrders.orderId, orderId));
    return result[0] ?? null;
  }

  async findActiveByPrAndOffer(
    prId: PRId,
    offerId: OfferId,
  ): Promise<PRAttachedOrder | null> {
    const result = await this.executor
      .select()
      .from(prAttachedOrders)
      .where(
        and(
          eq(prAttachedOrders.prId, prId),
          eq(prAttachedOrders.offerId, offerId),
          isNull(prAttachedOrders.detachedAt),
        ),
      );
    return result[0] ?? null;
  }

  async findCurrentNonTerminalByPrAndOffer(
    prId: PRId,
    offerId: OfferId,
  ): Promise<PRAttachedOrder | null> {
    const result = await this.executor
      .select({ attachment: prAttachedOrders })
      .from(prAttachedOrders)
      .innerJoin(tradeOrders, eq(tradeOrders.id, prAttachedOrders.orderId))
      .where(
        and(
          eq(prAttachedOrders.prId, prId),
          eq(prAttachedOrders.offerId, offerId),
          isNull(prAttachedOrders.detachedAt),
          notInArray(tradeOrders.status, TERMINAL_ORDER_STATUSES),
        ),
      )
      .orderBy(desc(prAttachedOrders.createdAt));
    return result[0]?.attachment ?? null;
  }

  async listAll(): Promise<PRAttachedOrder[]> {
    return this.executor
      .select()
      .from(prAttachedOrders)
      .orderBy(desc(prAttachedOrders.createdAt));
  }

  async detachByOrderId(orderId: TradeOrderId): Promise<PRAttachedOrder | null> {
    const result = await this.executor
      .update(prAttachedOrders)
      .set({
        detachedAt: new Date(),
      })
      .where(eq(prAttachedOrders.orderId, orderId))
      .returning();
    return result[0] ?? null;
  }
}
