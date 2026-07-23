import { describe, expect, test } from "vitest";
import { resolveCommerceOrderDetailPollAction, shouldPollCommerceOrderDetail } from "./useCommerce";

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

  test("reconciles only a bound active Ride and otherwise refreshes the pure Detail projection", () => {
    expect(
      resolveCommerceOrderDetailPollAction({
        rideHailing: {
          executionPhase: "INITIATING",
          provider: { providerOrderId: null },
        },
      }),
    ).toBe("REFRESH_DETAIL");
    expect(
      resolveCommerceOrderDetailPollAction({
        rideHailing: {
          executionPhase: "ACCEPTED",
          provider: { providerOrderId: "provider-order-1" },
        },
      }),
    ).toBe("RECONCILE");
    expect(
      resolveCommerceOrderDetailPollAction({
        rideHailing: {
          executionPhase: "FINISHED",
          provider: { providerOrderId: "provider-order-1" },
        },
      }),
    ).toBe("STOP");
  });
});
