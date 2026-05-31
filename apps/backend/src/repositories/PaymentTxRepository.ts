import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  paymentTxs,
  type NewPaymentTx,
  type PaymentTx,
  type PaymentTxId,
  type PaymentProviderInstanceId,
} from "../entities/payment";
import type { BillLineId } from "../entities/bill";
import type { PaymentTxStatus, PaymentTxType } from "../domains/payment/model";
import type { RepositoryExecutor } from "./_executor";

const ACTIVE_PAYMENT_STATUSES: PaymentTxStatus[] = [
  "INITIATED",
  "ACTION_REQUIRED",
  "PROCESSING",
];

export class PaymentTxRepository {
  constructor(private readonly executor: RepositoryExecutor = db) {}

  async create(data: NewPaymentTx): Promise<PaymentTx> {
    const result = await this.executor.insert(paymentTxs).values(data).returning();
    return result[0]!;
  }

  async findById(id: PaymentTxId): Promise<PaymentTx | null> {
    const result = await this.executor
      .select()
      .from(paymentTxs)
      .where(eq(paymentTxs.id, id));
    return result[0] ?? null;
  }

  async findByProviderMerchantOrder(input: {
    providerInstanceId: PaymentProviderInstanceId;
    merchantOrderNo: string;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .select()
      .from(paymentTxs)
      .where(
        and(
          eq(paymentTxs.providerInstanceId, input.providerInstanceId),
          eq(paymentTxs.merchantOrderNo, input.merchantOrderNo),
        ),
      );
    return result[0] ?? null;
  }

  async findByProviderMerchantRefund(input: {
    providerInstanceId: PaymentProviderInstanceId;
    merchantRefundNo: string;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .select()
      .from(paymentTxs)
      .where(
        and(
          eq(paymentTxs.providerInstanceId, input.providerInstanceId),
          eq(paymentTxs.merchantRefundNo, input.merchantRefundNo),
        ),
      );
    return result[0] ?? null;
  }

  async listByBillLineIds(billLineIds: BillLineId[]): Promise<PaymentTx[]> {
    if (billLineIds.length === 0) return [];
    return this.executor
      .select()
      .from(paymentTxs)
      .where(inArray(paymentTxs.billLineId, billLineIds))
      .orderBy(desc(paymentTxs.createdAt));
  }

  async findActiveByBillLine(input: {
    billLineId: BillLineId;
    type: PaymentTxType;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .select()
      .from(paymentTxs)
      .where(
        and(
          eq(paymentTxs.billLineId, input.billLineId),
          eq(paymentTxs.type, input.type),
          inArray(paymentTxs.status, ACTIVE_PAYMENT_STATUSES),
        ),
      )
      .orderBy(desc(paymentTxs.createdAt));
    return result[0] ?? null;
  }

  async findLatestByBillLine(input: {
    billLineId: BillLineId;
    type: PaymentTxType;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .select()
      .from(paymentTxs)
      .where(
        and(
          eq(paymentTxs.billLineId, input.billLineId),
          eq(paymentTxs.type, input.type),
        ),
      )
      .orderBy(desc(paymentTxs.createdAt));
    return result[0] ?? null;
  }

  async updateProviderStart(input: {
    id: PaymentTxId;
    status: PaymentTxStatus;
    providerPrepayId: string | null;
    providerStatus: string | null;
    clientAction: unknown;
    providerSnapshot: unknown;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .update(paymentTxs)
      .set({
        status: input.status,
        providerPrepayId: input.providerPrepayId,
        providerStatus: input.providerStatus,
        clientAction: input.clientAction,
        providerSnapshot: input.providerSnapshot,
        updatedAt: new Date(),
      })
      .where(eq(paymentTxs.id, input.id))
      .returning();
    return result[0] ?? null;
  }

  async convergeChargeStatus(input: {
    id: PaymentTxId;
    status: PaymentTxStatus;
    providerStatus: string;
    providerTransactionId?: string | null;
    providerSnapshot?: unknown;
    failureCode?: string | null;
    failureMessage?: string | null;
    succeededAt?: Date | null;
    closedAt?: Date | null;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .update(paymentTxs)
      .set({
        status: input.status,
        providerStatus: input.providerStatus,
        providerTransactionId: input.providerTransactionId ?? null,
        providerSnapshot: input.providerSnapshot,
        failureCode: input.failureCode ?? null,
        failureMessage: input.failureMessage ?? null,
        succeededAt: input.succeededAt ?? null,
        closedAt: input.closedAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(paymentTxs.id, input.id))
      .returning();
    return result[0] ?? null;
  }

  async convergeRefundStatus(input: {
    id: PaymentTxId;
    status: PaymentTxStatus;
    providerStatus: string;
    providerRefundId?: string | null;
    providerSnapshot?: unknown;
    failureCode?: string | null;
    failureMessage?: string | null;
    succeededAt?: Date | null;
    closedAt?: Date | null;
  }): Promise<PaymentTx | null> {
    const result = await this.executor
      .update(paymentTxs)
      .set({
        status: input.status,
        providerStatus: input.providerStatus,
        providerRefundId: input.providerRefundId ?? null,
        providerSnapshot: input.providerSnapshot,
        failureCode: input.failureCode ?? null,
        failureMessage: input.failureMessage ?? null,
        succeededAt: input.succeededAt ?? null,
        closedAt: input.closedAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(paymentTxs.id, input.id))
      .returning();
    return result[0] ?? null;
  }
}
