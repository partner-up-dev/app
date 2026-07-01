import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { TradeOrder } from "../model";
import {
  appendTerminationAttempt,
  approveTerminationAttempt,
  canRequestOrderTermination,
  closeRideHailingOrderFromProviderCancellation,
  denyTerminationAttempt,
  markTerminationAttemptResolving,
} from "./order-termination";

const createOpenOrder = (): TradeOrder => ({
  id: "order-1",
  family: "RENTAL",
  offerId: 1,
  createdBy: "user-1",
  status: "OPEN",
  participants: [],
  splitRuleSnapshot: { type: "RELATIVE", shares: [] },
  items: [],
  timeout: {
    unpaidExpiresAt: "2026-05-28T10:30:00.000Z",
    defaultWindowMinutes: 30,
  },
  terminationAttempts: [],
});

describe("order termination workflow", () => {
  it("allows one pending attempt on an open order", () => {
    const order = createOpenOrder();

    assert.equal(canRequestOrderTermination(order), true);

    const next = appendTerminationAttempt(order, {
      attemptId: "attempt-1",
      requestedAt: "2026-05-28T10:00:00.000Z",
      requestedBy: "user-1",
    });

    assert.equal(next.terminationAttempts.length, 1);
    assert.equal(canRequestOrderTermination(next), false);
  });

  it("marks a pending attempt as resolving before fulfillment returns", () => {
    const order = appendTerminationAttempt(createOpenOrder(), {
      attemptId: "attempt-1",
      requestedAt: "2026-05-28T10:00:00.000Z",
      requestedBy: "user-1",
    });

    const next = markTerminationAttemptResolving(order, "attempt-1", "RENTAL_FULFILLMENT");

    assert.equal(next.terminationAttempts[0]?.resolutionPath, "RENTAL_FULFILLMENT");
  });

  it("approves a pending attempt and closes the contract", () => {
    const order = appendTerminationAttempt(createOpenOrder(), {
      attemptId: "attempt-1",
      requestedAt: "2026-05-28T10:00:00.000Z",
      requestedBy: "user-1",
    });

    const next = approveTerminationAttempt(order, {
      attemptId: "attempt-1",
      decidedAt: "2026-05-28T10:01:00.000Z",
      reason: "6C 已取消预订",
      effectKind: "POLICY_REFUND",
    });

    assert.equal(next.status, "CANCELLED");
    assert.equal(next.terminationAttempts[0]?.status, "APPROVED");
    assert.equal(next.terminationAttempts[0]?.reason, "6C 已取消预订");
  });

  it("denies a pending attempt but keeps the order open", () => {
    const order = appendTerminationAttempt(createOpenOrder(), {
      attemptId: "attempt-1",
      requestedAt: "2026-05-28T10:00:00.000Z",
      requestedBy: "user-1",
    });

    const next = denyTerminationAttempt(order, {
      attemptId: "attempt-1",
      decidedAt: "2026-05-28T10:01:00.000Z",
      reason: "供应商保留预订",
    });

    assert.equal(next.status, "OPEN");
    assert.equal(next.terminationAttempts[0]?.status, "DENIED");
    assert.equal(next.terminationAttempts[0]?.reason, "供应商保留预订");
  });

  it("closes an open order from provider-observed ride hailing cancellation", () => {
    const order = {
      ...createOpenOrder(),
      family: "RIDE_HAILING" as const,
    };

    const next = closeRideHailingOrderFromProviderCancellation(order, {
      attemptId: "attempt-provider-cancel",
      decidedAt: "2026-05-28T10:01:00.000Z",
      reason: "Provider dispatch timed out",
    });

    assert.equal(next.status, "CANCELLED");
    assert.equal(next.terminationAttempts.length, 1);
    assert.equal(next.terminationAttempts[0]?.attemptId, "attempt-provider-cancel");
    assert.equal(next.terminationAttempts[0]?.requestedBy, "system:ride-hailing-provider");
    assert.equal(next.terminationAttempts[0]?.status, "APPROVED");
    assert.equal(next.terminationAttempts[0]?.resolutionPath, "RIDE_HAILING_FULFILLMENT");
    assert.equal(next.terminationAttempts[0]?.reason, "Provider dispatch timed out");
  });

  it("approves an existing pending attempt on provider-observed ride hailing cancellation", () => {
    const order = appendTerminationAttempt(
      {
        ...createOpenOrder(),
        family: "RIDE_HAILING" as const,
      },
      {
        attemptId: "attempt-user-cancel",
        requestedAt: "2026-05-28T10:00:00.000Z",
        requestedBy: "user-1",
      },
    );

    const next = closeRideHailingOrderFromProviderCancellation(order, {
      attemptId: "attempt-provider-cancel",
      decidedAt: "2026-05-28T10:01:00.000Z",
      reason: "Provider dispatch timed out",
    });

    assert.equal(next.status, "CANCELLED");
    assert.equal(next.terminationAttempts.length, 1);
    assert.equal(next.terminationAttempts[0]?.attemptId, "attempt-user-cancel");
    assert.equal(next.terminationAttempts[0]?.requestedBy, "user-1");
    assert.equal(next.terminationAttempts[0]?.status, "APPROVED");
    assert.equal(next.terminationAttempts[0]?.resolutionPath, "RIDE_HAILING_FULFILLMENT");
    assert.equal(next.terminationAttempts[0]?.reason, "Provider dispatch timed out");
  });
});
