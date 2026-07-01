import { describe, expect, test } from "vitest";
import { shouldPollCommerceOrderDetail } from "./useCommerce";

describe("commerce order detail polling", () => {
  test("polls active ride-hailing phases", () => {
    expect(
      shouldPollCommerceOrderDetail({
        rideHailing: { executionPhase: "ACCEPTED" },
      }),
    ).toBe(true);
    expect(
      shouldPollCommerceOrderDetail({
        rideHailing: { executionPhase: "IN_TRIP" },
      }),
    ).toBe(true);
  });

  test("does not poll terminal or non ride-hailing order details", () => {
    expect(
      shouldPollCommerceOrderDetail({
        rideHailing: { executionPhase: "FINISHED" },
      }),
    ).toBe(false);
    expect(
      shouldPollCommerceOrderDetail({
        rideHailing: { executionPhase: "CANCELLED" },
      }),
    ).toBe(false);
    expect(shouldPollCommerceOrderDetail({ rideHailing: null })).toBe(false);
    expect(shouldPollCommerceOrderDetail(null)).toBe(false);
  });
});
