import { asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  productSkus,
  type NewProductSku,
  type ProductSku,
  type ProductSkuId,
} from "../entities/product-sku";
import type { ProductSpuId } from "../entities/product-spu";
import type { RepositoryExecutor } from "./_executor";

export class ProductSkuRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewProductSku): Promise<ProductSku> {
    const result = await this.executor.insert(productSkus).values(data).returning();
    return result[0]!;
  }

  async findById(id: ProductSkuId): Promise<ProductSku | null> {
    const result = await this.executor.select().from(productSkus).where(eq(productSkus.id, id));
    return result[0] ?? null;
  }

  async listBySpuId(spuId: ProductSpuId): Promise<ProductSku[]> {
    return this.executor
      .select()
      .from(productSkus)
      .where(eq(productSkus.spuId, spuId))
      .orderBy(asc(productSkus.sortOrder), asc(productSkus.id));
  }

  async updateById(id: ProductSkuId, data: Partial<NewProductSku>): Promise<ProductSku | null> {
    const result = await this.executor
      .update(productSkus)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(productSkus.id, id))
      .returning();
    return result[0] ?? null;
  }
}
