import type { BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentProviderInstanceId } from "../../../entities/payment";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import type {
  BillLinePaymentExecutionClaim,
  BillLinePaymentExecutionSettlement,
  BillLinePaymentExecutionSnapshot,
} from "../contracts";

const billLineRepo = new BillLineRepository();

const toPaymentExecutionSnapshot = (line: BillLine): BillLinePaymentExecutionSnapshot => ({
  id: line.id,
  billId: line.billId,
  userId: line.userId,
  kind: line.kind,
  amountFen: line.amountFen,
  currency: line.currency,
  label: line.label,
  description: line.description,
  paymentProviderInstanceId: line.paymentProviderInstanceId,
  attemptCount: line.attemptCount,
  settledAt: line.settledAt,
});

const loadBillLine = async (billLineId: string): Promise<BillLine> => {
  const line = await billLineRepo.findById(billLineId as BillLineId);
  if (!line) {
    return throwHttpProblem({ status: 404, detail: "BillLine not found" });
  }
  return line;
};

export async function getBillLinePaymentExecution(input: {
  billLineId: string;
}): Promise<BillLinePaymentExecutionSnapshot> {
  return toPaymentExecutionSnapshot(await loadBillLine(input.billLineId));
}

/**
 * Claim or resume a BillLine-local provider execution slot. Payment chooses a
 * provider, while Bill owns the compare-and-set state transition itself.
 */
export async function openBillLinePaymentExecution(input: {
  billLineId: string;
  paymentProviderInstanceId: string;
}): Promise<BillLinePaymentExecutionClaim> {
  const initial = await loadBillLine(input.billLineId);
  if (initial.settledAt) {
    return {
      status: "SETTLED",
      line: toPaymentExecutionSnapshot(initial),
    };
  }

  if (initial.paymentProviderInstanceId === input.paymentProviderInstanceId) {
    return {
      status: "RESUMED",
      line: toPaymentExecutionSnapshot(initial),
    };
  }

  if (initial.paymentProviderInstanceId) {
    return {
      status: "BOUND_TO_ANOTHER_PROVIDER",
      line: toPaymentExecutionSnapshot(initial),
    };
  }

  const opened = await billLineRepo.openProviderExecutionSlot({
    id: initial.id,
    paymentProviderInstanceId: input.paymentProviderInstanceId as PaymentProviderInstanceId,
  });
  if (opened) {
    return {
      status: "OPENED",
      line: toPaymentExecutionSnapshot(opened),
    };
  }

  const current = await loadBillLine(input.billLineId);
  if (current.settledAt) {
    return {
      status: "SETTLED",
      line: toPaymentExecutionSnapshot(current),
    };
  }
  if (current.paymentProviderInstanceId === input.paymentProviderInstanceId) {
    return {
      status: "RESUMED",
      line: toPaymentExecutionSnapshot(current),
    };
  }
  if (current.paymentProviderInstanceId) {
    return {
      status: "BOUND_TO_ANOTHER_PROVIDER",
      line: toPaymentExecutionSnapshot(current),
    };
  }

  return throwHttpProblem({ status: 409, detail: "Payment execution could not be opened" });
}

/**
 * Release only the exact provider attempt that Payment observed as terminal.
 * A late observation of an earlier attempt must not clear a newer slot.
 */
export async function clearBillLinePaymentExecution(input: {
  billLineId: string;
  paymentProviderInstanceId: string;
  attemptCount: number;
}): Promise<BillLinePaymentExecutionSnapshot> {
  const cleared = await billLineRepo.clearProviderExecutionSlot({
    id: input.billLineId as BillLineId,
    paymentProviderInstanceId: input.paymentProviderInstanceId as PaymentProviderInstanceId,
    attemptCount: input.attemptCount,
  });
  return toPaymentExecutionSnapshot(cleared ?? (await loadBillLine(input.billLineId)));
}

/**
 * Settle only the exact active provider attempt. The returned outcome lets
 * Payment distinguish a new Bill transition from a replay or stale provider
 * observation without inspecting persistence state itself.
 */
export async function settleBillLinePaymentExecution(input: {
  billLineId: string;
  paymentProviderInstanceId: string;
  attemptCount: number;
  settledAt: Date;
}): Promise<BillLinePaymentExecutionSettlement> {
  const settled = await billLineRepo.markSettledFromProvider({
    id: input.billLineId as BillLineId,
    paymentProviderInstanceId: input.paymentProviderInstanceId as PaymentProviderInstanceId,
    attemptCount: input.attemptCount,
    settledAt: input.settledAt,
  });
  if (settled) {
    return {
      status: "SETTLED",
      line: toPaymentExecutionSnapshot(settled),
    };
  }

  const current = await loadBillLine(input.billLineId);
  const isSameAttempt =
    current.paymentProviderInstanceId === input.paymentProviderInstanceId &&
    current.attemptCount === input.attemptCount;
  if (isSameAttempt && current.settledAt) {
    return {
      status: "ALREADY_SETTLED",
      line: toPaymentExecutionSnapshot(current),
    };
  }

  return {
    status: "STALE",
    line: toPaymentExecutionSnapshot(current),
  };
}
