import { BillRepository } from "../../../repositories/BillRepository";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";

const rentalFulfillmentRepo = new RentalFulfillmentRepository();
const rentalOrderRepo = new RentalOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const billRepo = new BillRepository();

export async function getAdminCommerceFulfillmentWorkspace() {
  const [fulfillments, orders, bills] = await Promise.all([
    rentalFulfillmentRepo.listAll(),
    tradeOrderRepo.listAll(),
    billRepo.listAll(),
  ]);
  const rentalOrders = await rentalOrderRepo.listByOrderIds(
    fulfillments.map((fulfillment) => fulfillment.orderId),
  );

  const orderById = new Map(orders.map((order) => [order.id, order]));
  const rentalOrderByOrderId = new Map(
    rentalOrders.map((rentalOrder) => [rentalOrder.orderId, rentalOrder]),
  );
  const billByOrderId = new Map(bills.map((bill) => [bill.sourceOrderId, bill]));

  return {
    fulfillments: fulfillments.map((fulfillment) => ({
      fulfillment,
      order: orderById.get(fulfillment.orderId) ?? null,
      rentalOrder: rentalOrderByOrderId.get(fulfillment.orderId) ?? null,
      bill: billByOrderId.get(fulfillment.orderId) ?? null,
    })),
  };
}
