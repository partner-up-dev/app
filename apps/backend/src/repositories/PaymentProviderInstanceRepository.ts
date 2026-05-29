import { and, asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  paymentProviderInstances,
  type NewPaymentProviderInstance,
  type PaymentProviderInstance,
  type PaymentProviderInstanceId,
  type PaymentProviderCredentialSetId,
} from "../entities/payment";
import type { PaymentProviderType } from "../domains/payment";
import type { RepositoryExecutor } from "./_executor";

export class PaymentProviderInstanceRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewPaymentProviderInstance): Promise<PaymentProviderInstance> {
    const result = await this.executor
      .insert(paymentProviderInstances)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(
    id: PaymentProviderInstanceId,
  ): Promise<PaymentProviderInstance | null> {
    const result = await this.executor
      .select()
      .from(paymentProviderInstances)
      .where(eq(paymentProviderInstances.id, id));
    return result[0] ?? null;
  }

  async findByProviderTypeAndInstanceKey(input: {
    providerType: PaymentProviderType;
    instanceKey: string;
  }): Promise<PaymentProviderInstance | null> {
    const result = await this.executor
      .select()
      .from(paymentProviderInstances)
      .where(
        and(
          eq(paymentProviderInstances.providerType, input.providerType),
          eq(paymentProviderInstances.instanceKey, input.instanceKey),
        ),
      )
      .orderBy(asc(paymentProviderInstances.createdAt));
    return result[0] ?? null;
  }

  async setActiveCredentialSet(input: {
    providerInstanceId: PaymentProviderInstanceId;
    credentialSetId: PaymentProviderCredentialSetId;
  }): Promise<PaymentProviderInstance | null> {
    const result = await this.executor
      .update(paymentProviderInstances)
      .set({
        activeCredentialSetId: input.credentialSetId,
        updatedAt: new Date(),
      })
      .where(eq(paymentProviderInstances.id, input.providerInstanceId))
      .returning();
    return result[0] ?? null;
  }
}
