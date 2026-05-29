import { and, asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  paymentClientProviderBindings,
  type NewPaymentClientProviderBinding,
  type PaymentClientProviderBinding,
  type PaymentClientProviderBindingId,
  type PaymentProviderInstanceId,
} from "../entities/payment";
import type { PaymentChannel } from "../domains/payment";
import type { PaymentClientProviderBindingStatus } from "../domains/payment";
import type { RepositoryExecutor } from "./_executor";

export class PaymentClientProviderBindingRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(
    data: NewPaymentClientProviderBinding,
  ): Promise<PaymentClientProviderBinding> {
    const result = await this.executor
      .insert(paymentClientProviderBindings)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findActiveByClientId(
    clientId: string,
  ): Promise<PaymentClientProviderBinding | null> {
    const result = await this.executor
      .select()
      .from(paymentClientProviderBindings)
      .where(
        and(
          eq(paymentClientProviderBindings.clientId, clientId),
          eq(paymentClientProviderBindings.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(paymentClientProviderBindings.priority));
    return result[0] ?? null;
  }

  async findActiveByClientProviderChannel(input: {
    clientId: string;
    providerInstanceId: PaymentProviderInstanceId;
    channel: PaymentChannel;
  }): Promise<PaymentClientProviderBinding | null> {
    const result = await this.executor
      .select()
      .from(paymentClientProviderBindings)
      .where(
        and(
          eq(paymentClientProviderBindings.clientId, input.clientId),
          eq(
            paymentClientProviderBindings.providerInstanceId,
            input.providerInstanceId,
          ),
          eq(paymentClientProviderBindings.channel, input.channel),
          eq(paymentClientProviderBindings.status, "ACTIVE"),
        ),
      );
    return result[0] ?? null;
  }

  async updateStatus(input: {
    id: PaymentClientProviderBindingId;
    status: PaymentClientProviderBindingStatus;
  }): Promise<PaymentClientProviderBinding | null> {
    const result = await this.executor
      .update(paymentClientProviderBindings)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(paymentClientProviderBindings.id, input.id))
      .returning();
    return result[0] ?? null;
  }
}
