import type { SplitRuleSnapshot } from "../../trade";

export type BillChargeLineSeed = {
  userId: string;
  amountFen: number;
};

export function materializeChargeLinesFromSplitRule(input: {
  totalFen: number;
  splitRule: SplitRuleSnapshot;
}): BillChargeLineSeed[] {
  if (input.totalFen < 0) {
    throw new Error("Bill charge total must not be negative");
  }

  if (input.splitRule.shares.length === 0) {
    throw new Error("Bill split rule requires at least one share");
  }

  if (input.splitRule.type === "ABSOLUTE") {
    const total = input.splitRule.shares.reduce(
      (sum, share) => sum + share.amountFen,
      0,
    );
    if (total !== input.totalFen) {
      throw new Error("Absolute split rule does not match bill total");
    }

    return input.splitRule.shares.map((share) => ({
      userId: share.userId,
      amountFen: share.amountFen,
    }));
  }

  const provisional = input.splitRule.shares.map((share) => {
    const raw = input.totalFen * share.percentBps;
    const amountFen = Math.floor(raw / 10_000);
    const remainder = raw % 10_000;
    return {
      userId: share.userId,
      amountFen,
      remainder,
    };
  });

  const distributedTotal = provisional.reduce(
    (sum, share) => sum + share.amountFen,
    0,
  );
  let remainderFen = input.totalFen - distributedTotal;

  const prioritized = [...provisional].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }
    return left.userId.localeCompare(right.userId);
  });

  while (remainderFen > 0) {
    const share = prioritized[(input.totalFen - distributedTotal - remainderFen) % prioritized.length];
    share.amountFen += 1;
    remainderFen -= 1;
  }

  const amountsByUserId = new Map(
    prioritized.map((share) => [share.userId, share.amountFen]),
  );

  return input.splitRule.shares.map((share) => ({
    userId: share.userId,
    amountFen: amountsByUserId.get(share.userId) ?? 0,
  }));
}
