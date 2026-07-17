import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { offers, type NewOffer, type Offer, type OfferId } from "../entities/offer";
import type { RepositoryExecutor } from "./_executor";

export class OfferRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewOffer): Promise<Offer> {
    const result = await this.executor.insert(offers).values(data).returning();
    return result[0]!;
  }

  async findById(id: OfferId): Promise<Offer | null> {
    const result = await this.executor.select().from(offers).where(eq(offers.id, id));
    return result[0] ?? null;
  }

  async listAll(): Promise<Offer[]> {
    return this.executor.select().from(offers).orderBy(desc(offers.createdAt));
  }

  async updateById(id: OfferId, data: Partial<NewOffer>): Promise<Offer | null> {
    const result = await this.executor
      .update(offers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, id))
      .returning();
    return result[0] ?? null;
  }
}
