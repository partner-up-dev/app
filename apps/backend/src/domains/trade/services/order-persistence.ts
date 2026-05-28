import type { TradeOrder as TradeOrderRecord } from "../../../entities/trade-order";
import type { TradeOrder } from "../model";

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
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
    selectedZoneCodes: record.selectedZoneCodes,
    serviceStartAt: toIsoString(record.serviceStartAt),
    serviceEndAt: toIsoString(record.serviceEndAt),
    participantCount: record.participantCount,
    contactPhone: record.contactPhone,
    registrants: record.registrants,
  };
}
