import { createHash } from "node:crypto";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { CreateOrderAttempt } from "../../../entities/create-order-attempt";
import type { CreateOrderCommandResult } from "../model";

type FingerprintOrderItem =
  | { kind: "FIXED"; quoteId: string; quantity?: number | null }
  | { kind: "CHOICE_SET"; candidateQuoteIds: string[]; quantity?: 1 | null };

export const buildCreateOrderCommandFingerprint = (input: {
  prId?: number | null;
  items: FingerprintOrderItem[];
}): string => {
  const normalized = {
    version: 1,
    prId: input.prId ?? null,
    items: input.items.map((item) =>
      item.kind === "FIXED"
        ? {
            kind: item.kind,
            quantity: item.quantity ?? 1,
            quoteId: item.quoteId,
          }
        : {
            candidateQuoteIds: [...new Set(item.candidateQuoteIds)].sort(),
            kind: item.kind,
            quantity: item.quantity ?? 1,
          },
    ),
  };
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
};

export const replayCreateOrderAttempt = (input: {
  attempt: CreateOrderAttempt;
  commandFingerprint: string;
  now?: Date;
}): CreateOrderCommandResult => {
  if (input.attempt.commandFingerprint !== input.commandFingerprint) {
    return throwHttpProblem({
      status: 409,
      code: "IDEMPOTENCY_KEY_REUSED",
      detail: "Idempotency-Key was already used with a different create-order command",
    });
  }

  const now = input.now ?? new Date();
  if (
    input.attempt.replayExpiresAt !== null &&
    input.attempt.replayExpiresAt.getTime() <= now.getTime()
  ) {
    return throwHttpProblem({
      status: 409,
      code: "IDEMPOTENCY_KEY_EXPIRED",
      detail: "The completed create-order idempotency replay window has expired",
    });
  }

  if (input.attempt.resultSnapshot) return input.attempt.resultSnapshot;
  return {
    outcome: "PROCESSING",
    attemptId: input.attempt.id,
    orderId: input.attempt.orderId,
  };
};
