import type { TradeOrderId } from "../../entities/trade-order";
import { ProblemDetailsError } from "../../lib/problem-details";
import {
  rideHailingFeeConfirmationJobIdentity,
  rideHailingFeeConfirmationTaskPayloadSchema,
  type RideHailingFeeConfirmationTaskPayload,
} from "../../domains/ride-hailing/fee-confirmation-task";
import { loadRideHailingProviderExecutionContext } from "../../domains/ride-hailing/use-cases/provider-execution-context";
import type { JobDefinition, JobExecutionResult } from "./contracts";
import { jobRunner } from "./index";

type FeeConfirmationExecutionContext = {
  providerOrderId: string;
  confirmFee(input: { providerOrderId: string }): Promise<void>;
};

type FeeConfirmationJobDependencies = {
  loadExecutionContext(orderId: string): Promise<FeeConfirmationExecutionContext>;
};

const defaultDependencies: FeeConfirmationJobDependencies = {
  async loadExecutionContext(orderId) {
    const context = await loadRideHailingProviderExecutionContext({
      orderId: orderId as TradeOrderId,
    });
    return {
      providerOrderId: context.providerOrderId,
      confirmFee: (input) => context.port.confirmFee(input),
    };
  },
};

const classifyFeeConfirmationError = (error: unknown): JobExecutionResult => {
  if (!(error instanceof ProblemDetailsError)) {
    return {
      disposition: "RETRYABLE_FAILURE",
      reason: "FEE_CONFIRMATION_PROVIDER_FAILURE",
    };
  }

  if (error.code === "RIDE_HAILING_ORDER_NOT_FOUND") {
    return {
      disposition: "SKIPPED",
      reason: "RIDE_HAILING_ORDER_MISSING",
    };
  }

  if (error.status === 408 || error.status === 429 || error.status >= 500) {
    return {
      disposition: "RETRYABLE_FAILURE",
      reason: "FEE_CONFIRMATION_PROVIDER_FAILURE",
    };
  }

  return {
    disposition: "PERMANENT_FAILURE",
    reason: "FEE_CONFIRMATION_CONTEXT_INVALID",
  };
};

export const createRideHailingFeeConfirmationJobDefinition = (
  dependencies: FeeConfirmationJobDependencies = defaultDependencies,
): JobDefinition<RideHailingFeeConfirmationTaskPayload> => ({
  jobType: rideHailingFeeConfirmationJobIdentity.type,
  version: rideHailingFeeConfirmationJobIdentity.version,
  payloadSchema: rideHailingFeeConfirmationTaskPayloadSchema,
  async execute(payload) {
    try {
      const context = await dependencies.loadExecutionContext(payload.orderId);
      await context.confirmFee({
        providerOrderId: context.providerOrderId,
      });
      return {
        disposition: "SUCCEEDED",
        reason: "FEE_CONFIRMATION_CONFIRMED",
      };
    } catch (error) {
      return classifyFeeConfirmationError(error);
    }
  },
});

let registered = false;

export const registerRideHailingFeeConfirmationJobs = (): void => {
  if (registered) return;
  jobRunner.registerDefinition(createRideHailingFeeConfirmationJobDefinition());
  registered = true;
};
