import type { LocationQuery, LocationQueryValue, RouteLocationRaw } from "vue-router";

const PAYMENT_CHECKOUT_PATH = "/payment/checkout";
const PAYMENT_CHECKOUT_BILL_LINE_QUERY_KEY = "bill-line";

const readSingleQueryValue = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null => {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  if (typeof normalizedValue !== "string" || normalizedValue.length === 0) {
    return null;
  }
  return normalizedValue;
};

export const buildPaymentCheckoutRouteLocation = (input: {
  billLineId: string;
}): RouteLocationRaw => ({
  path: PAYMENT_CHECKOUT_PATH,
  query: {
    [PAYMENT_CHECKOUT_BILL_LINE_QUERY_KEY]: input.billLineId,
  },
});

export const readPaymentCheckoutBillLineId = (query: LocationQuery): string | null =>
  readSingleQueryValue(query[PAYMENT_CHECKOUT_BILL_LINE_QUERY_KEY]);
