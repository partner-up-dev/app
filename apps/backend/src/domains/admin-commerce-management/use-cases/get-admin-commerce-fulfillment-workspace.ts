import { BillRepository } from "../../../repositories/BillRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";

const rentalOrderRepo = new RentalOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const billRepo = new BillRepository();

export async function getAdminCommerceFulfillmentWorkspace() {
  const [rentalOrders, orders, bills] = await Promise.all([
    rentalOrderRepo.listAll(),
    tradeOrderRepo.listAll(),
    billRepo.listAll(),
  ]);

  const orderById = new Map(orders.map((order) => [order.id, order]));
  const billByOrderId = new Map(bills.map((bill) => [bill.sourceOrderId, bill]));

  return {
    fulfillments: rentalOrders.map((rentalOrder) => ({
      fulfillment: {
        ...rentalOrder,
        id: rentalOrder.orderId,
      },
      order: orderById.get(rentalOrder.orderId) ?? null,
      rentalOrder,
      bill: billByOrderId.get(rentalOrder.orderId) ?? null,
    })),
  };
}
