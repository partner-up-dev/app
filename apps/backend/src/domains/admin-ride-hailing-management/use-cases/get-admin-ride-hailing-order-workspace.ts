import { BillRepository } from "../../../repositories/BillRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import {
  toAdminRideHailingOrderRecordView,
  type AdminRideHailingOrderRecordView,
} from "./order-workspace-view";

const tradeOrderRepo = new TradeOrderRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const billRepo = new BillRepository();

export type AdminRideHailingOrderWorkspace = {
  orders: AdminRideHailingOrderRecordView[];
};

export async function getAdminRideHailingOrderWorkspace(): Promise<AdminRideHailingOrderWorkspace> {
  const rideHailingOrders = (await tradeOrderRepo.listAll()).filter(
    (order) => order.family === "RIDE_HAILING",
  );
  const rideHailingOrderIds = rideHailingOrders.map((order) => order.id);

  const [typedOrders, providerInstances, bills] = await Promise.all([
    rideOrderRepo.listByOrderIds(rideHailingOrderIds),
    providerRepo.listAll(),
    billRepo.listAll(),
  ]);

  const typedOrderByOrderId = new Map(
    typedOrders.map((rideHailingOrder) => [rideHailingOrder.orderId, rideHailingOrder]),
  );
  const providerInstanceById = new Map(
    providerInstances.map((providerInstance) => [providerInstance.id, providerInstance]),
  );
  const billByOrderId = new Map(
    bills
      .filter((bill) => rideHailingOrderIds.includes(bill.sourceOrderId))
      .map((bill) => [bill.sourceOrderId, bill]),
  );

  return {
    orders: rideHailingOrders.flatMap((order) => {
      const rideHailingOrder = typedOrderByOrderId.get(order.id);
      if (!rideHailingOrder) return [];

      const providerBinding = rideHailingOrder.dispatchBinding ?? null;

      return [
        toAdminRideHailingOrderRecordView({
          order,
          rideHailingOrder,
          providerBinding,
          providerInstance: providerBinding
            ? (providerInstanceById.get(
                providerBinding.providerInstanceId as RideHailingProviderInstanceId,
              ) ?? null)
            : null,
          bill: billByOrderId.get(order.id) ?? null,
        }),
      ];
    }),
  };
}
