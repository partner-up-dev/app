import { describe, expect, it } from "vitest";
import {
  resolveRideHailingListingBlocker,
  resolveRideHailingListingSurfaceState,
} from "./ride-hailing-listing-state";

describe("RideHailing listing state", () => {
  it("treats missing contact phone as waiting for input", () => {
    const blocker = resolveRideHailingListingBlocker({
      hasRideOffer: true,
      hasRoute: true,
      contactPhone: "",
      riderCount: 2,
    });

    expect(blocker?.reason).toBe("missing-contact-phone");
    expect(
      resolveRideHailingListingSurfaceState({
        blocker,
        hasListingInput: false,
        isPending: true,
        isError: false,
        isSuccess: false,
        visibleOptionCount: 0,
      }),
    ).toBe("waiting-for-input");
  });

  it("shows loading only when listing input exists and the request is pending", () => {
    expect(
      resolveRideHailingListingSurfaceState({
        blocker: null,
        hasListingInput: true,
        isPending: true,
        isError: false,
        isSuccess: false,
        visibleOptionCount: 0,
      }),
    ).toBe("loading");
  });

  it("treats successful listing without visible options as empty", () => {
    expect(
      resolveRideHailingListingSurfaceState({
        blocker: null,
        hasListingInput: true,
        isPending: false,
        isError: false,
        isSuccess: true,
        visibleOptionCount: 0,
      }),
    ).toBe("empty");
  });

  it("treats listed vehicle candidates as ready", () => {
    expect(
      resolveRideHailingListingSurfaceState({
        blocker: null,
        hasListingInput: true,
        isPending: false,
        isError: false,
        isSuccess: true,
        visibleOptionCount: 1,
      }),
    ).toBe("ready");
  });
});
