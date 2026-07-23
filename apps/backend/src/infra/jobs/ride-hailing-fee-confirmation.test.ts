import { describe, expect, it, vi } from "vitest";
import type { JobHandlerContext } from "./contracts";
import { createHttpProblem } from "../../lib/problem-details";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://unit:unit@localhost:5432/unit";

const { createRideHailingFeeConfirmationJobDefinition } =
  await import("./ride-hailing-fee-confirmation");

const orderId = "123e4567-e89b-12d3-a456-426614174000";
const jobContext: JobHandlerContext = {
  jobId: 1,
  jobVersion: 1,
  attempts: 1,
  runAt: new Date("2031-01-01T00:00:00.000Z"),
  windowStartCursor: null,
  source: "manual",
  leaseToken: "lease-token",
  isCreationReservationHeld: async () => false,
};

describe("RideHailing fee-confirmation Job", () => {
  it("reloads the current binding and confirms by provider order id only", async () => {
    const confirmFee = vi.fn<(input: { providerOrderId: string }) => Promise<void>>(
      async () => undefined,
    );
    const loadExecutionContext = vi.fn<
      (loadedOrderId: string) => Promise<{
        providerOrderId: string;
        confirmFee(input: { providerOrderId: string }): Promise<void>;
      }>
    >(async () => ({
      providerOrderId: "CC-FEE-123",
      confirmFee,
    }));
    const definition = createRideHailingFeeConfirmationJobDefinition({
      loadExecutionContext,
    });

    await expect(definition.execute({ schemaVersion: 1, orderId }, jobContext)).resolves.toEqual({
      disposition: "SUCCEEDED",
      reason: "FEE_CONFIRMATION_CONFIRMED",
    });
    expect(loadExecutionContext).toHaveBeenCalledWith(orderId);
    expect(confirmFee).toHaveBeenCalledWith({ providerOrderId: "CC-FEE-123" });
  });

  it("maps a deleted source order to a generic skipped disposition", async () => {
    const definition = createRideHailingFeeConfirmationJobDefinition({
      loadExecutionContext: async () => {
        throw createHttpProblem({
          status: 404,
          code: "RIDE_HAILING_ORDER_NOT_FOUND",
          detail: "RideHailing order not found",
        });
      },
    });

    await expect(definition.execute({ schemaVersion: 1, orderId }, jobContext)).resolves.toEqual({
      disposition: "SKIPPED",
      reason: "RIDE_HAILING_ORDER_MISSING",
    });
  });

  it.each([
    {
      error: createHttpProblem({
        status: 409,
        code: "RIDE_HAILING_PROVIDER_BINDING_MISSING",
        detail: "Binding missing",
      }),
      expected: {
        disposition: "PERMANENT_FAILURE",
        reason: "FEE_CONFIRMATION_CONTEXT_INVALID",
      },
    },
    {
      error: createHttpProblem({
        status: 502,
        detail: "Provider unavailable",
      }),
      expected: {
        disposition: "RETRYABLE_FAILURE",
        reason: "FEE_CONFIRMATION_PROVIDER_FAILURE",
      },
    },
    {
      error: new TypeError("socket closed"),
      expected: {
        disposition: "RETRYABLE_FAILURE",
        reason: "FEE_CONFIRMATION_PROVIDER_FAILURE",
      },
    },
  ])(
    "maps execution failures without exposing business state to Job",
    async ({ error, expected }) => {
      const definition = createRideHailingFeeConfirmationJobDefinition({
        loadExecutionContext: async () => ({
          providerOrderId: "CC-FEE-FAIL",
          confirmFee: async () => {
            throw error;
          },
        }),
      });

      await expect(definition.execute({ schemaVersion: 1, orderId }, jobContext)).resolves.toEqual(
        expected,
      );
    },
  );
});
