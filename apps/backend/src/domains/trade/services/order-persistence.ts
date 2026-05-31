import type { RentalOrder as RentalOrderRecord } from "../../../entities/rental-order";
import type { RideHailingOrder as RideHailingOrderRecord } from "../../../entities/ride-hailing-order";
import type { TradeOrder as TradeOrderRecord } from "../../../entities/trade-order";
import type { RentalOrder, RideHailingOrder, TradeOrder } from "../model";

function toIsoString(value: Date): string {
  return value.toISOString();
}

export function toTradeOrderModel(record: TradeOrderRecord): TradeOrder {
  return {
    id: record.id,
    family: record.family,
    offerId: record.offerId,
    createdBy: record.createdBy,
    status: record.status,
    participants: record.participants,
    splitRuleSnapshot: record.splitRuleSnapshot,
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

export function toRideHailingOrderModel(
  orderRecord: TradeOrderRecord,
  rideRecord: RideHailingOrderRecord,
): RideHailingOrder {
  if (orderRecord.family !== "RIDE_HAILING") {
    throw new Error("RideHailing order model requires a RideHailing base order");
  }
  if (orderRecord.id !== rideRecord.orderId) {
    throw new Error("RideHailing order facts do not match base order");
  }

  return {
    ...toTradeOrderModel(orderRecord),
    family: "RIDE_HAILING",
    routeSnapshot: rideRecord.routeSnapshot,
    departureAt: rideRecord.departureAt?.toISOString() ?? null,
    riders: rideRecord.riders,
    contactPhone: rideRecord.contactPhone,
    providerCreationStatus: rideRecord.providerCreationStatus,
  };
}
