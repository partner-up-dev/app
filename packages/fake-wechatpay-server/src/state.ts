import { z } from "zod";

export const fakeAmountSchema = z.object({
  total: z.number().int().nonnegative(),
  currency: z.literal("CNY").default("CNY"),
});

export const fakeTransactionStateSchema = z.object({
  appid: z.string().min(1),
  mchid: z.string().min(1),
  description: z.string().min(1),
  outTradeNo: z.string().min(1),
  notifyUrl: z.string().url(),
  amount: fakeAmountSchema,
  payerOpenid: z.string().min(1).nullable(),
  prepayId: z.string().min(1),
  h5Url: z.string().url().nullable(),
  tradeState: z.enum(["NOTPAY", "SUCCESS", "PAYERROR", "CLOSED"]),
  transactionId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const fakeRefundStateSchema = z.object({
  outRefundNo: z.string().min(1),
  outTradeNo: z.string().min(1),
  transactionId: z.string().min(1).nullable(),
  notifyUrl: z.string().url().nullable(),
  reason: z.string().nullable(),
  amount: z.object({
    refund: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    currency: z.literal("CNY").default("CNY"),
  }),
  status: z.enum(["PROCESSING", "SUCCESS", "CLOSED", "ABNORMAL"]),
  refundId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FakeTransactionState = z.infer<typeof fakeTransactionStateSchema>;
export type FakeRefundState = z.infer<typeof fakeRefundStateSchema>;

export type FakeWeChatPayStateSnapshot = {
  readonly transactions: readonly FakeTransactionState[];
  readonly refunds: readonly FakeRefundState[];
};

const nowIso = (): string => new Date().toISOString();

const createProviderId = (prefix: string, id: string): string =>
  `${prefix}_${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`;

export class FakeWeChatPayState {
  private readonly transactions = new Map<string, FakeTransactionState>();
  private readonly refunds = new Map<string, FakeRefundState>();

  reset(): void {
    this.transactions.clear();
    this.refunds.clear();
  }

  snapshot(): FakeWeChatPayStateSnapshot {
    return {
      refunds: [...this.refunds.values()],
      transactions: [...this.transactions.values()],
    };
  }

  createTransaction(input: {
    appid: string;
    mchid: string;
    description: string;
    outTradeNo: string;
    notifyUrl: string;
    amount: { total: number; currency: "CNY" };
    payerOpenid: string | null;
    h5Url: string | null;
  }): FakeTransactionState {
    const existing = this.transactions.get(input.outTradeNo);
    if (existing) return existing;

    const timestamp = nowIso();
    const transaction = fakeTransactionStateSchema.parse({
      ...input,
      createdAt: timestamp,
      prepayId: createProviderId("fake_prepay", input.outTradeNo),
      tradeState: "NOTPAY",
      transactionId: null,
      updatedAt: timestamp,
    });
    this.transactions.set(transaction.outTradeNo, transaction);
    return transaction;
  }

  findTransactionByOutTradeNo(
    outTradeNo: string,
  ): FakeTransactionState | null {
    return this.transactions.get(outTradeNo) ?? null;
  }

  findTransactionByPrepayId(prepayId: string): FakeTransactionState | null {
    return (
      [...this.transactions.values()].find(
        (transaction) => transaction.prepayId === prepayId,
      ) ?? null
    );
  }

  markTransaction(input: {
    outTradeNo: string;
    tradeState: "SUCCESS" | "PAYERROR" | "CLOSED";
  }): FakeTransactionState | null {
    const transaction = this.transactions.get(input.outTradeNo);
    if (!transaction) return null;

    const updated = fakeTransactionStateSchema.parse({
      ...transaction,
      tradeState: input.tradeState,
      transactionId:
        input.tradeState === "SUCCESS"
          ? (transaction.transactionId ??
            createProviderId("fake_tx", transaction.outTradeNo))
          : transaction.transactionId,
      updatedAt: nowIso(),
    });
    this.transactions.set(updated.outTradeNo, updated);
    return updated;
  }

  createRefund(input: {
    outRefundNo: string;
    outTradeNo: string;
    transactionId: string | null;
    notifyUrl: string | null;
    reason: string | null;
    amount: { refund: number; total: number; currency: "CNY" };
  }): FakeRefundState {
    const existing = this.refunds.get(input.outRefundNo);
    if (existing) return existing;

    const timestamp = nowIso();
    const refund = fakeRefundStateSchema.parse({
      ...input,
      createdAt: timestamp,
      refundId: createProviderId("fake_refund", input.outRefundNo),
      status: "SUCCESS",
      updatedAt: timestamp,
    });
    this.refunds.set(refund.outRefundNo, refund);
    return refund;
  }

  findRefundByOutRefundNo(outRefundNo: string): FakeRefundState | null {
    return this.refunds.get(outRefundNo) ?? null;
  }

  markRefund(input: {
    outRefundNo: string;
    status: "SUCCESS" | "CLOSED" | "ABNORMAL";
  }): FakeRefundState | null {
    const refund = this.refunds.get(input.outRefundNo);
    if (!refund) return null;

    const updated = fakeRefundStateSchema.parse({
      ...refund,
      status: input.status,
      updatedAt: nowIso(),
    });
    this.refunds.set(updated.outRefundNo, updated);
    return updated;
  }
}
