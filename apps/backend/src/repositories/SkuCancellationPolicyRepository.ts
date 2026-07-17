import { and, desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  skuCancellationPolicies,
  type NewSkuCancellationPolicy,
  type SkuCancellationPolicy,
} from "../entities/sku-cancellation-policy";
import type { ProductSkuId } from "../entities/product-sku";
import type { RepositoryExecutor } from "./_executor";

export class SkuCancellationPolicyRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewSkuCancellationPolicy): Promise<SkuCancellationPolicy> {
    const result = await this.executor.insert(skuCancellationPolicies).values(data).returning();
    return result[0]!;
  }

  async findByRef(policyId: string, policyVersion: number): Promise<SkuCancellationPolicy | null> {
    const result = await this.executor
      .select()
      .from(skuCancellationPolicies)
      .where(
        and(
          eq(skuCancellationPolicies.policyId, policyId),
          eq(skuCancellationPolicies.policyVersion, policyVersion),
        ),
      );
    return result[0] ?? null;
  }

  async findLatestBySkuId(skuId: ProductSkuId): Promise<SkuCancellationPolicy | null> {
    const result = await this.executor
      .select()
      .from(skuCancellationPolicies)
      .where(eq(skuCancellationPolicies.skuId, skuId))
      .orderBy(desc(skuCancellationPolicies.policyVersion))
      .limit(1);
    return result[0] ?? null;
  }
}
