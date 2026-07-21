import type { Bill } from "../../../entities/bill";
import type { RideHailingOrder } from "../../../entities/ride-hailing-order";
import type { RideHailingProviderInstance } from "../../../entities/ride-hailing-provider";
import type { TradeOrder } from "../../../entities/trade-order";
import type { RideHailingDispatchBindingSnapshot } from "../../trade/contracts";

export type AdminRideHailingProviderInstanceSummaryView = Pick<
  RideHailingProviderInstance,
  "id" | "providerType" | "instanceKey" | "status" | "displayName"
>;

export type AdminRideHailingBillSummaryView = Pick<
  Bill,
  "id" | "status" | "currency" | "closedAt" | "createdAt" | "updatedAt"
>;

export type AdminRideHailingOrderRecordView = {
  order: TradeOrder;
  rideHailingOrder: RideHailingOrder;
  providerBinding: RideHailingDispatchBindingSnapshot | null;
  providerInstance: AdminRideHailingProviderInstanceSummaryView | null;
  bill: AdminRideHailingBillSummaryView | null;
};

export function toAdminRideHailingOrderRecordView(input: {
  order: TradeOrder;
  rideHailingOrder: RideHailingOrder;
  providerBinding: RideHailingDispatchBindingSnapshot | null;
  providerInstance: RideHailingProviderInstance | null;
  bill: Bill | null;
}): AdminRideHailingOrderRecordView {
  return {
    order: input.order,
    rideHailingOrder: input.rideHailingOrder,
    providerBinding: input.providerBinding,
    providerInstance: input.providerInstance
      ? {
          id: input.providerInstance.id,
          providerType: input.providerInstance.providerType,
          instanceKey: input.providerInstance.instanceKey,
          status: input.providerInstance.status,
          displayName: input.providerInstance.displayName,
        }
      : null,
    bill: input.bill
      ? {
          id: input.bill.id,
          status: input.bill.status,
          currency: input.bill.currency,
          closedAt: input.bill.closedAt,
          createdAt: input.bill.createdAt,
          updatedAt: input.bill.updatedAt,
        }
      : null,
  };
}
