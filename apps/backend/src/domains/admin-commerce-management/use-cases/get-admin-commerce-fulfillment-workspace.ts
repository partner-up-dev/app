import { BillRepository } from "../../../repositories/BillRepository";
import { PRAttachedOrderRepository } from "../../../repositories/PRAttachedOrderRepository";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";

const rentalFulfillmentRepo = new RentalFulfillmentRepository();
const rentalOrderRepo = new RentalOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const prAttachedOrderRepo = new PRAttachedOrderRepository();
const billRepo = new BillRepository();

export async function getAdminCommerceFulfillmentWorkspace() {
  const [fulfillments, orders, attachments, bills] = await Promise.all([
    rentalFulfillmentRepo.listAll(),
    tradeOrderRepo.listAll(),
    prAttachedOrderRepo.listAll(),
    billRepo.listAll(),
  ]);
  const rentalOrders = await rentalOrderRepo.listByOrderIds(
    fulfillments.map((fulfillment) => fulfillment.orderId),
  );

  const orderById = new Map(orders.map((order) => [order.id, order]));
  const rentalOrderByOrderId = new Map(
    rentalOrders.map((rentalOrder) => [rentalOrder.orderId, rentalOrder]),
  );
  const attachmentByOrderId = new Map(
    attachments.map((attachment) => [attachment.orderId, attachment]),
  );
  const billByOrderId = new Map(bills.map((bill) => [bill.sourceOrderId, bill]));

  return {
    fulfillments: fulfillments.map((fulfillment) => ({
      fulfillment,
      order: orderById.get(fulfillment.orderId) ?? null,
      rentalOrder: rentalOrderByOrderId.get(fulfillment.orderId) ?? null,
      attachment: attachmentByOrderId.get(fulfillment.orderId) ?? null,
      bill: billByOrderId.get(fulfillment.orderId) ?? null,
    })),
  };
}
