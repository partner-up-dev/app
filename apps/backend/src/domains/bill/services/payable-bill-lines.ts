import type { BillLine } from "../../../entities/bill";
import type { OrderStatus, OrderTimeout } from "../../trade/model";
import type { BillStatus } from "../model";

export type UnpaidPayableBillLineCandidate = {
  line: Pick<BillLine, "kind" | "amountFen" | "settledAt">;
  bill?: {
    status: BillStatus;
  } | null;
  order?: {
    status: OrderStatus;
    timeout: Pick<OrderTimeout, "unpaidExpiresAt">;
  } | null;
};

export const isOrderUnpaidWindowOpen = (
  unpaidExpiresAt: string,
  now: Date = new Date(),
): boolean => {
  const expiresAt = new Date(unpaidExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt > now;
};

export const isBillLinePayable = (
  candidate: UnpaidPayableBillLineCandidate,
  now: Date = new Date(),
): boolean => {
  if (candidate.line.kind !== "CHARGE") {
    return false;
  }
  if (candidate.line.amountFen <= 0) {
    return false;
  }
  if (candidate.line.settledAt) {
    return false;
  }
  if (candidate.bill && candidate.bill.status !== "ACTIVE") {
    return false;
  }
  if (candidate.order && candidate.order.status !== "OPEN") {
    return false;
  }
  if (
    candidate.order &&
    !isOrderUnpaidWindowOpen(candidate.order.timeout.unpaidExpiresAt, now)
  ) {
    return false;
  }

  return true;
};

export const areThereAnyUnpaidPayableBillLines = (
  candidates: UnpaidPayableBillLineCandidate[],
  now: Date = new Date(),
): boolean => candidates.some((candidate) => isBillLinePayable(candidate, now));
