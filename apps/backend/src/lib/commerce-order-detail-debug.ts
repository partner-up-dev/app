export type CommerceOrderDetailDebugContext = {
  enabled: boolean;
  sessionId: string | null;
  requestId: string | null;
  channel: string | null;
  source: string | null;
  trigger: string | null;
  routeOrderId: string | null;
  orderId: string | null;
  billId: string | null;
};

const normalizeHeaderValue = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const readCommerceOrderDetailDebugContext = (
  headers: Headers,
): CommerceOrderDetailDebugContext => {
  const sessionId = normalizeHeaderValue(headers.get("x-commerce-order-debug-session"));
  const requestId = normalizeHeaderValue(headers.get("x-commerce-order-debug-request"));
  const enabledHeader = normalizeHeaderValue(headers.get("x-commerce-order-debug"));

  return {
    enabled: enabledHeader === "1" || sessionId !== null || requestId !== null,
    sessionId,
    requestId,
    channel: normalizeHeaderValue(headers.get("x-commerce-order-debug-channel")),
    source: normalizeHeaderValue(headers.get("x-commerce-order-debug-source")),
    trigger: normalizeHeaderValue(headers.get("x-commerce-order-debug-trigger")),
    routeOrderId: normalizeHeaderValue(headers.get("x-commerce-order-debug-route-order-id")),
    orderId: normalizeHeaderValue(headers.get("x-commerce-order-debug-order-id")),
    billId: normalizeHeaderValue(headers.get("x-commerce-order-debug-bill-id")),
  };
};

export const withCommerceOrderDetailDebugContext = (
  context: CommerceOrderDetailDebugContext,
  patch: Partial<Omit<CommerceOrderDetailDebugContext, "enabled">>,
): CommerceOrderDetailDebugContext => ({
  ...context,
  ...patch,
});

export const logCommerceOrderDetailDebug = (
  context: CommerceOrderDetailDebugContext | null | undefined,
  event: string,
  payload: Record<string, unknown> = {},
): void => {
  if (!context?.enabled) return;

  console.info("[CommerceOrderDetailDebug]", {
    at: new Date().toISOString(),
    event,
    sessionId: context.sessionId,
    requestId: context.requestId,
    channel: context.channel,
    source: context.source,
    trigger: context.trigger,
    routeOrderId: context.routeOrderId,
    orderId: context.orderId,
    billId: context.billId,
    ...payload,
  });
};
