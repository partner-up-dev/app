import { eq, inArray } from "drizzle-orm";
import {
  rideHailingOrders,
  type NewRideHailingOrder,
  type RideHailingOrder,
} from "../entities/ride-hailing-order";
import type { TradeOrderId } from "../entities/trade-order";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export class RideHailingOrderRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewRideHailingOrder): Promise<RideHailingOrder> {
    const result = await this.executor.insert(rideHailingOrders).values(data).returning();
    return result[0]!;
  }

  async findByOrderId(orderId: TradeOrderId): Promise<RideHailingOrder | null> {
    const result = await this.executor
      .select()
      .from(rideHailingOrders)
      .where(eq(rideHailingOrders.orderId, orderId));
    return result[0] ?? null;
  }

  async findByOrderIdForUpdate(orderId: TradeOrderId): Promise<RideHailingOrder | null> {
    const result = await this.executor
      .select()
      .from(rideHailingOrders)
      .where(eq(rideHailingOrders.orderId, orderId))
      .for("update");
    return result[0] ?? null;
  }

  async listByOrderIds(orderIds: TradeOrderId[]): Promise<RideHailingOrder[]> {
    if (orderIds.length === 0) return [];
    return this.executor
      .select()
      .from(rideHailingOrders)
      .where(inArray(rideHailingOrders.orderId, orderIds));
  }

  async updateByOrderId(
    orderId: TradeOrderId,
    data: Partial<NewRideHailingOrder>,
  ): Promise<RideHailingOrder | null> {
    const result = await this.executor
      .update(rideHailingOrders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(rideHailingOrders.orderId, orderId))
      .returning();
    return result[0] ?? null;
  }
}
