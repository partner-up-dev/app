import { eq, inArray } from "drizzle-orm";
import {
  commerceQuotes,
  type CommerceQuote,
  type NewCommerceQuote,
  type OfferQuoteId,
} from "../entities/commerce-quote";
import { db } from "../lib/db";
import type { RepositoryExecutor } from "./_executor";

export class CommerceQuoteRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewCommerceQuote): Promise<CommerceQuote> {
    const result = await this.executor.insert(commerceQuotes).values(data).returning();
    return result[0]!;
  }

  async createMany(data: NewCommerceQuote[]): Promise<CommerceQuote[]> {
    if (data.length === 0) return [];
    return this.executor.insert(commerceQuotes).values(data).returning();
  }

  async findById(id: OfferQuoteId): Promise<CommerceQuote | null> {
    const result = await this.executor
      .select()
      .from(commerceQuotes)
      .where(eq(commerceQuotes.id, id));
    return result[0] ?? null;
  }

  async listByIds(ids: OfferQuoteId[]): Promise<CommerceQuote[]> {
    if (ids.length === 0) return [];
    return this.executor.select().from(commerceQuotes).where(inArray(commerceQuotes.id, ids));
  }
}
