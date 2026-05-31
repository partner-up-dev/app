import type { RentalOrder as RentalOrderRecord } from "../../../entities/rental-order";
import type { TradeOrder as TradeOrderRecord } from "../../../entities/trade-order";
import type { RentalOrder, TradeOrder } from "../model";

function toIsoString(value: Date): string {
  return value.toISOString();
}

export function toTradeOrderModel(record: TradeOrderRecord): TradeOrder {
  return {
    id: record.id,
    family: record.family,
    createdBy: record.createdBy,
    status: record.status,
    participants: record.participants,
    splitRuleSnapshot: record.splitRuleSnapshot,
    offerSnapshot: record.offerSnapshot,
    items: record.items,
    pricingSnapshot: record.pricingSnapshot,
    timeout: record.timeout,
    terminationAttempts: record.terminationAttempts,
  };
}

export function toRentalOrderModel(
  orderRecord: TradeOrderRecord,
  rentalRecord: RentalOrderRecord,
): RentalOrder {
  if (orderRecord.family !== "RENTAL") {
    throw new Error("Rental order model requires a Rental base order");
  }
  if (orderRecord.id !== rentalRecord.orderId) {
    throw new Error("Rental order facts do not match base order");
  }

  return {
    ...toTradeOrderModel(orderRecord),
    family: "RENTAL",
    selectedZoneCodes: rentalRecord.selectedZoneCodes,
    serviceStartAt: toIsoString(rentalRecord.serviceStartAt),
    serviceEndAt: toIsoString(rentalRecord.serviceEndAt),
    participantCount: rentalRecord.participantCount,
    contactPhone: rentalRecord.contactPhone,
    registrants: rentalRecord.registrants,
  };
}
