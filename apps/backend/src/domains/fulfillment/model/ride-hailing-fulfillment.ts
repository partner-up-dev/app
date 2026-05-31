import type { RideHailingProviderType } from "../../ride-hailing/model";

export type RideHailingFulfillment = {
  providerInstanceId: string;
  providerType: RideHailingProviderType;
  externalOrderId?: string | null;
  providerOrderId?: string | null;
  providerExecutionRef?: RideHailingProviderExecutionRef | null;
};

export type RideHailingProviderExecutionRef = {
  providerOrderId?: string | null;
  providerTripRef?: string | null;
};

export const hasRideHailingProviderOrderReference = (
  fulfillment: Pick<RideHailingFulfillment, "providerOrderId">,
): boolean => Boolean(fulfillment.providerOrderId);
