import { describe, expect, it } from "vitest";
import { buildEqualRelativeSplitRule } from "./split-rule";

describe("buildEqualRelativeSplitRule", () => {
  it("builds a relative split whose sum is 10000 bps", () => {
    const result = buildEqualRelativeSplitRule(["u1", "u2", "u3"]);
    if (result.type !== "RELATIVE") {
      throw new Error("Expected RELATIVE split rule");
    }

    expect(result).toEqual({
      type: "RELATIVE",
      shares: [
        { userId: "u1", percentBps: 3334 },
        { userId: "u2", percentBps: 3333 },
        { userId: "u3", percentBps: 3333 },
      ],
    });
    expect(
      result.shares.reduce((sum, share) => sum + share.percentBps, 0),
    ).toBe(10_000);
  });

  it("rejects an empty user list", () => {
    expect(() => buildEqualRelativeSplitRule([])).toThrow(
      "Equal split requires at least one user",
    );
  });
});
