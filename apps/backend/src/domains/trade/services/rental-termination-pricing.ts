import type {
  BillTargetAmountSeed,
  CancellationPolicySnapshot,
  CancellationTierSnapshot,
  OrderTerminationAttempt,
  RentalOrder,
} from "../model";
import {
  getOrderItemCancellationPolicy,
  getOrderItemPricingAmountFen,
  getOrderItemsTotalFen,
} from "./order-items";

type RentalTerminationPolicyResolution = {
  targetChargeTotalFen: number;
  refundDeltaFen: number;
  selectedTiers: Array<{
    itemId: string;
    tier: CancellationTierSnapshot;
  }>;
  requiresOperatorHandling: boolean;
};

function getMinutesBeforeStart(
  requestedAt: string,
  serviceStartAt: string,
): number {
  return Math.floor(
    (new Date(serviceStartAt).getTime() - new Date(requestedAt).getTime()) /
      60_000,
  );
}

function selectCancellationTier(
  policy: CancellationPolicySnapshot,
  minutesBeforeStart: number,
): CancellationTierSnapshot {
  const matched = policy.tiers.find((tier) => {
    const fromOk =
      tier.fromMinutesBeforeStart === null ||
      minutesBeforeStart >= tier.fromMinutesBeforeStart;
    const untilOk =
      tier.untilMinutesBeforeStart === null ||
      minutesBeforeStart < tier.untilMinutesBeforeStart;
    return fromOk && untilOk;
  });

  if (!matched) {
    throw new Error("No cancellation tier matched the requested time");
  }

  return matched;
}

export function resolveRentalTerminationPolicy(
  order: RentalOrder,
  attempt: Pick<OrderTerminationAttempt, "attemptId" | "requestedAt">,
): RentalTerminationPolicyResolution {
  const minutesBeforeStart = getMinutesBeforeStart(
    attempt.requestedAt,
    order.serviceStartAt,
  );

  const selectedTiers = order.items.map((item) => {
    const policy = getOrderItemCancellationPolicy(item);
    return {
      itemId: item.itemId,
      tier: selectCancellationTier(policy, minutesBeforeStart),
    };
  });

  const targetChargeTotalFen = order.items.reduce((sum, item) => {
    const tier = selectedTiers.find((selected) => selected.itemId === item.itemId);
    if (!tier) {
      throw new Error(`Selected tier missing for item ${item.itemId}`);
    }
    const retainedRatio = 100 - tier.tier.refundPercent;
    return sum + Math.round((getOrderItemPricingAmountFen(item) * retainedRatio) / 100);
  }, 0);

  return {
    targetChargeTotalFen,
    refundDeltaFen: getOrderItemsTotalFen(order.items) - targetChargeTotalFen,
    selectedTiers,
    requiresOperatorHandling: selectedTiers.some(
      (selected) => selected.tier.requiresOperatorHandling,
    ),
  };
}

export function buildRentalBillTargetAmountSeed(input: {
  order: RentalOrder;
  attempt: Pick<OrderTerminationAttempt, "attemptId" | "requestedAt">;
}): BillTargetAmountSeed {
  const resolution = resolveRentalTerminationPolicy(input.order, input.attempt);

  return {
    sourceOrderId: input.order.id,
    sourceAttemptId: input.attempt.attemptId,
    currency: "CNY",
    targetChargeTotalFen: resolution.targetChargeTotalFen,
  };
}
