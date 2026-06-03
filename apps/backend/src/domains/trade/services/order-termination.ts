import type {
  OrderTerminationAttempt,
  OrderTerminationEffectKind,
  OrderTerminationResolutionPath,
  TradeOrder,
} from "../model";

type TerminationAttemptIdentity = Pick<
  OrderTerminationAttempt,
  "attemptId" | "requestedAt" | "requestedBy"
>;

type ApprovalInput = {
  attemptId: string;
  decidedAt: string;
  reason?: string | null;
  effectKind?: OrderTerminationEffectKind | null;
  effectAmountFen?: number | null;
};

type DenialInput = {
  attemptId: string;
  decidedAt: string;
  reason?: string | null;
};

const hasPendingTerminationAttempt = (
  order: Pick<TradeOrder, "terminationAttempts">,
): boolean =>
  order.terminationAttempts.some((attempt) => attempt.status === "PENDING");

const hasApprovedTerminationAttempt = (
  order: Pick<TradeOrder, "terminationAttempts">,
): boolean =>
  order.terminationAttempts.some((attempt) => attempt.status === "APPROVED");

export const canRequestOrderTermination = (
  order: Pick<TradeOrder, "status" | "terminationAttempts">,
): boolean =>
  order.status === "OPEN" &&
  !hasPendingTerminationAttempt(order) &&
  !hasApprovedTerminationAttempt(order);

export function appendTerminationAttempt(
  order: TradeOrder,
  identity: TerminationAttemptIdentity,
): TradeOrder {
  if (!canRequestOrderTermination(order)) {
    throw new Error("Order does not accept a new termination attempt");
  }

  return {
    ...order,
    terminationAttempts: [
      ...order.terminationAttempts,
      {
        ...identity,
        status: "PENDING",
        resolutionPath: null,
        reason: null,
        effectKind: null,
        effectAmountFen: null,
        decidedAt: null,
      },
    ],
  };
}

export function markTerminationAttemptResolving(
  order: TradeOrder,
  attemptId: string,
  resolutionPath: OrderTerminationResolutionPath,
): TradeOrder {
  const matched = order.terminationAttempts.some(
    (attempt) => attempt.attemptId === attemptId && attempt.status === "PENDING",
  );
  if (!matched) {
    throw new Error("Pending termination attempt not found");
  }

  return {
    ...order,
    terminationAttempts: order.terminationAttempts.map((attempt) =>
      attempt.attemptId === attemptId
        ? {
            ...attempt,
            resolutionPath,
          }
        : attempt,
    ),
  };
}

export function approveTerminationAttempt(
  order: TradeOrder,
  input: ApprovalInput,
): TradeOrder {
  const matched = order.terminationAttempts.some(
    (attempt) => attempt.attemptId === input.attemptId && attempt.status === "PENDING",
  );
  if (!matched) {
    throw new Error("Pending termination attempt not found");
  }

  return {
    ...order,
    status: "CANCELLED",
    terminationAttempts: order.terminationAttempts.map((attempt) =>
      attempt.attemptId === input.attemptId
        ? {
            ...attempt,
            status: "APPROVED",
            reason: input.reason ?? null,
            effectKind: input.effectKind ?? "NONE",
            effectAmountFen: input.effectAmountFen ?? null,
            decidedAt: input.decidedAt,
          }
        : attempt,
    ),
  };
}

export function denyTerminationAttempt(
  order: TradeOrder,
  input: DenialInput,
): TradeOrder {
  const matched = order.terminationAttempts.some(
    (attempt) => attempt.attemptId === input.attemptId && attempt.status === "PENDING",
  );
  if (!matched) {
    throw new Error("Pending termination attempt not found");
  }

  return {
    ...order,
    terminationAttempts: order.terminationAttempts.map((attempt) =>
      attempt.attemptId === input.attemptId
        ? {
            ...attempt,
            status: "DENIED",
            reason: input.reason ?? null,
            decidedAt: input.decidedAt,
          }
        : attempt,
    ),
  };
}
