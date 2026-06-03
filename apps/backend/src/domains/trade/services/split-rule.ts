import type { SplitRuleSnapshot } from "../model";

const TOTAL_PERCENT_BPS = 10_000;

export function buildEqualRelativeSplitRule(
  userIds: string[],
): SplitRuleSnapshot {
  if (userIds.length === 0) {
    throw new Error("Equal split requires at least one user");
  }

  const basePercentBps = Math.floor(TOTAL_PERCENT_BPS / userIds.length);
  let remainderBps = TOTAL_PERCENT_BPS - basePercentBps * userIds.length;

  return {
    type: "RELATIVE",
    shares: userIds.map((userId) => {
      const extra = remainderBps > 0 ? 1 : 0;
      remainderBps -= extra;
      return {
        userId,
        percentBps: basePercentBps + extra,
      };
    }),
  };
}
