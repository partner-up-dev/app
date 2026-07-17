import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";

const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();

export async function getAdminCommerceOrderBillWorkspace() {
  const [orders, bills] = await Promise.all([tradeOrderRepo.listAll(), billRepo.listAll()]);
  const rentalOrders = await rentalOrderRepo.listByOrderIds(
    orders.filter((order) => order.family === "RENTAL").map((order) => order.id),
  );

  const rentalOrderByOrderId = new Map(
    rentalOrders.map((rentalOrder) => [rentalOrder.orderId, rentalOrder]),
  );
  const billByOrderId = new Map(bills.map((bill) => [bill.sourceOrderId, bill]));
  const billLines = await billLineRepo.listByBillIds(bills.map((bill) => bill.id));
  const billLinesByBillId = new Map<string, typeof billLines>();
  for (const billLine of billLines) {
    const current = billLinesByBillId.get(billLine.billId) ?? [];
    current.push(billLine);
    billLinesByBillId.set(billLine.billId, current);
  }

  return {
    orders: orders.map((order) => {
      const bill = billByOrderId.get(order.id) ?? null;
      return {
        order,
        rentalOrder: rentalOrderByOrderId.get(order.id) ?? null,
        bill,
        billLines: bill ? (billLinesByBillId.get(bill.id) ?? []) : [],
      };
    }),
  };
}
