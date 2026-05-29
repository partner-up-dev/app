import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  paymentProviderCredentialSets,
  type NewPaymentProviderCredentialSet,
  type PaymentProviderCredentialSet,
  type PaymentProviderCredentialSetId,
  type PaymentProviderInstanceId,
} from "../entities/payment";
import type { PaymentProviderCredentialSetStatus } from "../domains/payment";
import type { RepositoryExecutor } from "./_executor";

export class PaymentProviderCredentialSetRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(
    data: NewPaymentProviderCredentialSet,
  ): Promise<PaymentProviderCredentialSet> {
    const result = await this.executor
      .insert(paymentProviderCredentialSets)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(
    id: PaymentProviderCredentialSetId,
  ): Promise<PaymentProviderCredentialSet | null> {
    const result = await this.executor
      .select()
      .from(paymentProviderCredentialSets)
      .where(eq(paymentProviderCredentialSets.id, id));
    return result[0] ?? null;
  }

  async findActiveByProviderInstanceId(
    providerInstanceId: PaymentProviderInstanceId,
  ): Promise<PaymentProviderCredentialSet | null> {
    const result = await this.executor
      .select()
      .from(paymentProviderCredentialSets)
      .where(
        and(
          eq(paymentProviderCredentialSets.providerInstanceId, providerInstanceId),
          eq(paymentProviderCredentialSets.status, "ACTIVE"),
        ),
      )
      .orderBy(desc(paymentProviderCredentialSets.effectiveFrom));
    return result[0] ?? null;
  }

  async listVerifierUsableByProviderInstanceId(
    providerInstanceId: PaymentProviderInstanceId,
  ): Promise<PaymentProviderCredentialSet[]> {
    return this.executor
      .select()
      .from(paymentProviderCredentialSets)
      .where(
        and(
          eq(paymentProviderCredentialSets.providerInstanceId, providerInstanceId),
          inArray(paymentProviderCredentialSets.status, ["ACTIVE", "ROTATED_OUT"]),
        ),
      )
      .orderBy(desc(paymentProviderCredentialSets.effectiveFrom));
  }

  async updateStatus(input: {
    id: PaymentProviderCredentialSetId;
    status: PaymentProviderCredentialSetStatus;
    effectiveTo?: Date | null;
  }): Promise<PaymentProviderCredentialSet | null> {
    const result = await this.executor
      .update(paymentProviderCredentialSets)
      .set({
        status: input.status,
        effectiveTo: input.effectiveTo ?? null,
        updatedAt: new Date(),
      })
      .where(eq(paymentProviderCredentialSets.id, input.id))
      .returning();
    return result[0] ?? null;
  }
}
