import type {
  BillTargetAmountSeed,
  CancellationPolicySnapshot,
  CancellationTierSnapshot,
  OrderItemPricingSnapshot,
  OrderItemSnapshot,
  OrderTerminationAttempt,
  TradeOrder,
} from "../model";

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

function getItemPricingBreakdown(
  order: TradeOrder,
  itemId: string,
): OrderItemPricingSnapshot {
  const breakdown = order.pricingSnapshot.itemBreakdowns.find(
    (item) => item.itemId === itemId,
  );
  if (!breakdown) {
    throw new Error(`Pricing breakdown missing for item ${itemId}`);
  }
  return breakdown;
}

function getCancellationPolicySnapshot(
  item: OrderItemSnapshot,
): CancellationPolicySnapshot {
  if (!item.cancellationPolicySnapshot) {
    throw new Error(`Cancellation policy snapshot missing for item ${item.itemId}`);
  }
  return item.cancellationPolicySnapshot;
}

export function resolveRentalTerminationPolicy(
  order: TradeOrder,
  attempt: Pick<OrderTerminationAttempt, "attemptId" | "requestedAt">,
): RentalTerminationPolicyResolution {
  if (order.family !== "RENTAL") {
    throw new Error("Rental termination pricing requires a Rental order");
  }

  if (!order.serviceStartAt) {
    throw new Error("Rental order requires serviceStartAt");
  }

  const minutesBeforeStart = getMinutesBeforeStart(
    attempt.requestedAt,
    order.serviceStartAt,
  );

  const selectedTiers = order.items.map((item) => {
    const policy = getCancellationPolicySnapshot(item);
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
    const breakdown = getItemPricingBreakdown(order, item.itemId);
    const retainedRatio = 100 - tier.tier.refundPercent;
    return sum + Math.round((breakdown.resolvedAmountFen * retainedRatio) / 100);
  }, 0);

  return {
    targetChargeTotalFen,
    refundDeltaFen: order.pricingSnapshot.totalFen - targetChargeTotalFen,
    selectedTiers,
    requiresOperatorHandling: selectedTiers.some(
      (selected) => selected.tier.requiresOperatorHandling,
    ),
  };
}

export function buildRentalBillTargetAmountSeed(input: {
  order: TradeOrder;
  attempt: Pick<OrderTerminationAttempt, "attemptId" | "requestedAt">;
}): BillTargetAmountSeed {
  const resolution = resolveRentalTerminationPolicy(input.order, input.attempt);

  return {
    sourceOrderId: input.order.id,
    sourceAttemptId: input.attempt.attemptId,
    currency: input.order.pricingSnapshot.currency,
    targetChargeTotalFen: resolution.targetChargeTotalFen,
  };
}
