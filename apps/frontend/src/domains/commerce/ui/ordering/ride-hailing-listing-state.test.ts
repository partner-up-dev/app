import { describe, expect, it } from "vitest";
import {
  isRideHailingContactPhoneComplete,
  resolveRideHailingListingBlocker,
  resolveRideHailingListingSurfaceState,
} from "./ride-hailing-listing-state";

describe("RideHailing listing state", () => {
  it("requires a complete mainland China mobile phone before commit", () => {
    expect(isRideHailingContactPhoneComplete("1380013800")).toBe(false);
    expect(isRideHailingContactPhoneComplete("13800138000")).toBe(true);
  });

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

  it("keeps listing waiting while a typed phone has not been committed", () => {
    const committedPhone = "";
    const blocker = resolveRideHailingListingBlocker({
      hasRideOffer: true,
      hasRoute: true,
      contactPhone: committedPhone,
      riderCount: 2,
    });

    expect(isRideHailingContactPhoneComplete("13800138000")).toBe(true);
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
