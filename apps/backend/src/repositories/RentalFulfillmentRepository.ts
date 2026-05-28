import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  rentalFulfillments,
  type NewRentalFulfillment,
  type RentalFulfillment,
  type RentalFulfillmentId,
} from "../entities/rental-fulfillment";
import type { TradeOrderId } from "../entities/trade-order";
import type { RepositoryExecutor } from "./_executor";

export class RentalFulfillmentRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewRentalFulfillment): Promise<RentalFulfillment> {
    const result = await this.executor
      .insert(rentalFulfillments)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(id: RentalFulfillmentId): Promise<RentalFulfillment | null> {
    const result = await this.executor
      .select()
      .from(rentalFulfillments)
      .where(eq(rentalFulfillments.id, id));
    return result[0] ?? null;
  }

  async findByOrderId(
    orderId: TradeOrderId,
  ): Promise<RentalFulfillment | null> {
    const result = await this.executor
      .select()
      .from(rentalFulfillments)
      .where(eq(rentalFulfillments.orderId, orderId));
    return result[0] ?? null;
  }

  async listAll(): Promise<RentalFulfillment[]> {
    return this.executor
      .select()
      .from(rentalFulfillments)
      .orderBy(desc(rentalFulfillments.createdAt));
  }

  async updateById(
    id: RentalFulfillmentId,
    data: Partial<NewRentalFulfillment>,
  ): Promise<RentalFulfillment | null> {
    const result = await this.executor
      .update(rentalFulfillments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(rentalFulfillments.id, id))
      .returning();
    return result[0] ?? null;
  }
}
