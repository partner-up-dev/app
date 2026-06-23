import { describe, expect, test } from "vitest";
import { FakeCaocaoState } from "./state";

describe("FakeCaocaoState", () => {
  test("creates idempotent orders and advances them explicitly to finished", () => {
    const state = new FakeCaocaoState();

    const created = state.createOrder({
      carType: "PREMIER",
      externalOrderId: "external-order-1",
    });
    const duplicate = state.createOrder({
      carType: "EXPRESS",
      externalOrderId: "external-order-1",
    });

    expect(duplicate).toEqual(created);
    expect(created.phase).toBe("CREATED");
    expect(created.finalAmountFen).toBe(5600);

    expect(state.findOrder(created.providerOrderId)?.phase).toBe("CREATED");

    const accepted = state.advanceOrderPhase(created.providerOrderId);
    const inTrip = state.advanceOrderPhase(created.providerOrderId);
    const finished = state.advanceOrderPhase(created.providerOrderId);

    expect(accepted?.phase).toBe("ACCEPTED");
    expect(inTrip?.phase).toBe("IN_TRIP");
    expect(finished?.phase).toBe("FINISHED");
  });

  test("advances the latest non-terminal order", () => {
    const state = new FakeCaocaoState();

    const older = state.createOrder({
      carType: "EXPRESS",
      externalOrderId: "external-order-older",
    });
    const newer = state.createOrder({
      carType: "PREMIER",
      externalOrderId: "external-order-newer",
    });

    const advanced = state.advanceLatestNonTerminalOrder();

    expect(advanced?.providerOrderId).toBe(newer.providerOrderId);
    expect(advanced?.phase).toBe("ACCEPTED");
    expect(state.findOrder(older.providerOrderId)?.phase).toBe("CREATED");
  });

  test("updates estimates for later quotes and orders", () => {
    const state = new FakeCaocaoState();

    const updated = state.updateEstimate({
      carType: "PREMIER",
      estimateAmountFen: 6100,
    });
    const created = state.createOrder({
      carType: "PREMIER",
      externalOrderId: "external-order-price-change",
    });

    expect(updated.estimateAmountFen).toBe(6100);
    expect(state.findEstimate("PREMIER").estimateAmountFen).toBe(6100);
    expect(created.finalAmountFen).toBe(6500);

    state.reset();
    expect(state.findEstimate("PREMIER").estimateAmountFen).toBe(5200);
  });

  test("supports next-create failure, cancellation, and fee confirmation", () => {
    const state = new FakeCaocaoState();

    state.configureNextCreateFailure();
    expect(state.consumeNextCreateFailure()).toBe(true);
    expect(state.consumeNextCreateFailure()).toBe(false);

    const created = state.createOrder({
      callbackUrl: "http://127.0.0.1:4000/callback",
      carType: "EXPRESS",
      externalOrderId: "external-order-2",
    });
    state.advanceOrderPhase(created.providerOrderId);
    const cancelled = state.cancelOrder(created.providerOrderId);
    const feeConfirm = state.confirmFee({
      allowanceAmountFen: 120,
      caocaoAllowanceAmountFen: 80,
      providerOrderId: created.providerOrderId,
    });

    expect(cancelled?.phase).toBe("CANCELLED");
    expect(cancelled?.cancelFeeFen).toBe(800);
    expect(feeConfirm.providerOrderId).toBe(created.providerOrderId);
    expect(state.snapshot().feeConfirms).toHaveLength(1);
  });
});
