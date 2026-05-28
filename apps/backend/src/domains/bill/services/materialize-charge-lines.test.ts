import { describe, expect, it } from "vitest";
import { materializeChargeLinesFromSplitRule } from "./materialize-charge-lines";

describe("materializeChargeLinesFromSplitRule", () => {
  it("materializes relative splits with deterministic remainder handling", () => {
    const result = materializeChargeLinesFromSplitRule({
      totalFen: 1000,
      splitRule: {
        type: "RELATIVE",
        shares: [
          { userId: "u1", percentBps: 3334 },
          { userId: "u2", percentBps: 3333 },
          { userId: "u3", percentBps: 3333 },
        ],
      },
    });

    expect(result).toEqual([
      { userId: "u1", amountFen: 334 },
      { userId: "u2", amountFen: 333 },
      { userId: "u3", amountFen: 333 },
    ]);
  });

  it("materializes absolute splits only when they sum to the total", () => {
    expect(
      materializeChargeLinesFromSplitRule({
        totalFen: 800,
        splitRule: {
          type: "ABSOLUTE",
          shares: [
            { userId: "u1", amountFen: 300 },
            { userId: "u2", amountFen: 500 },
          ],
        },
      }),
    ).toEqual([
      { userId: "u1", amountFen: 300 },
      { userId: "u2", amountFen: 500 },
    ]);
  });

  it("rejects invalid absolute totals", () => {
    expect(() =>
      materializeChargeLinesFromSplitRule({
        totalFen: 801,
        splitRule: {
          type: "ABSOLUTE",
          shares: [
            { userId: "u1", amountFen: 300 },
            { userId: "u2", amountFen: 500 },
          ],
        },
      }),
    ).toThrow("Absolute split rule does not match bill total");
  });

  it("rejects empty split rules", () => {
    expect(() =>
      materializeChargeLinesFromSplitRule({
        totalFen: 100,
        splitRule: {
          type: "RELATIVE",
          shares: [],
        },
      }),
    ).toThrow("Bill split rule requires at least one share");
  });
});
