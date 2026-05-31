import { desc, eq } from "drizzle-orm";
import {
  rideHailingFulfillments,
  type NewRideHailingFulfillment,
  type RideHailingFulfillment,
  type RideHailingFulfillmentId,
} from "../entities/ride-hailing-fulfillment";
import type { TradeOrderId } from "../entities/trade-order";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export class RideHailingFulfillmentRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(
    data: NewRideHailingFulfillment,
  ): Promise<RideHailingFulfillment> {
    const result = await this.executor
      .insert(rideHailingFulfillments)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(
    id: RideHailingFulfillmentId,
  ): Promise<RideHailingFulfillment | null> {
    const result = await this.executor
      .select()
      .from(rideHailingFulfillments)
      .where(eq(rideHailingFulfillments.id, id));
    return result[0] ?? null;
  }

  async findByOrderId(
    orderId: TradeOrderId,
  ): Promise<RideHailingFulfillment | null> {
    const result = await this.executor
      .select()
      .from(rideHailingFulfillments)
      .where(eq(rideHailingFulfillments.orderId, orderId));
    return result[0] ?? null;
  }

  async listAll(): Promise<RideHailingFulfillment[]> {
    return this.executor
      .select()
      .from(rideHailingFulfillments)
      .orderBy(desc(rideHailingFulfillments.createdAt));
  }

  async updateById(
    id: RideHailingFulfillmentId,
    data: Partial<NewRideHailingFulfillment>,
  ): Promise<RideHailingFulfillment | null> {
    const result = await this.executor
      .update(rideHailingFulfillments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(rideHailingFulfillments.id, id))
      .returning();
    return result[0] ?? null;
  }
}
