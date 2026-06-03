import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  productSpus,
  type NewProductSpu,
  type ProductSpu,
  type ProductSpuId,
} from "../entities/product-spu";
import type { RepositoryExecutor } from "./_executor";

export class ProductSpuRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewProductSpu): Promise<ProductSpu> {
    const result = await this.executor
      .insert(productSpus)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(id: ProductSpuId): Promise<ProductSpu | null> {
    const result = await this.executor
      .select()
      .from(productSpus)
      .where(eq(productSpus.id, id));
    return result[0] ?? null;
  }

  async listAll(): Promise<ProductSpu[]> {
    return this.executor
      .select()
      .from(productSpus)
      .orderBy(desc(productSpus.createdAt));
  }

  async updateById(
    id: ProductSpuId,
    data: Partial<NewProductSpu>,
  ): Promise<ProductSpu | null> {
    const result = await this.executor
      .update(productSpus)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(productSpus.id, id))
      .returning();
    return result[0] ?? null;
  }
}
