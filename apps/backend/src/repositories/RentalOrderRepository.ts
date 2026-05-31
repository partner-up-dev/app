import { eq, inArray } from "drizzle-orm";
import {
  rentalOrders,
  type NewRentalOrder,
  type RentalOrder,
} from "../entities/rental-order";
import { db } from "../lib/db";
import type { TradeOrderId } from "../entities/trade-order";
import type { RepositoryExecutor } from "./_executor";

export class RentalOrderRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewRentalOrder): Promise<RentalOrder> {
    const result = await this.executor.insert(rentalOrders).values(data).returning();
    return result[0]!;
  }

  async findByOrderId(orderId: TradeOrderId): Promise<RentalOrder | null> {
    const result = await this.executor
      .select()
      .from(rentalOrders)
      .where(eq(rentalOrders.orderId, orderId));
    return result[0] ?? null;
  }

  async listByOrderIds(orderIds: TradeOrderId[]): Promise<RentalOrder[]> {
    if (orderIds.length === 0) return [];
    return this.executor
      .select()
      .from(rentalOrders)
      .where(inArray(rentalOrders.orderId, orderIds));
  }
}
