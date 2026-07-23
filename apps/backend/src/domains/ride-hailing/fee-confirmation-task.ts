import { z } from "zod";

export const rideHailingFeeConfirmationJobIdentity = {
  type: "ride-hailing.fee-confirm.v1",
  version: 1,
} as const;

export const rideHailingFeeConfirmationTaskPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    orderId: z.string().uuid(),
  })
  .strict();

export type RideHailingFeeConfirmationTaskPayload = z.infer<
  typeof rideHailingFeeConfirmationTaskPayloadSchema
>;

export const buildRideHailingFeeConfirmationCreationKey = (billId: string): string =>
  `ride-hailing:fee-confirm:${billId}`;
