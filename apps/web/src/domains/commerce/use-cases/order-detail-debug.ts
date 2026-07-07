import type { Ref } from "vue";

const ORDER_DETAIL_DEBUG_ENABLE_STORAGE_KEY = "__partner_up_order_detail_debug__";
const ORDER_DETAIL_DEBUG_SESSION_STORAGE_KEY = "__partner_up_order_detail_debug_session__";

const pendingOrderDetailTriggers = new Map<string, string[]>();
let fallbackSessionId: string | null = null;

const readWindow = (): Window | null => {
  if (typeof window === "undefined") return null;
  return window;
};

const createRandomPart = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
};

const resolveStorageFlag = (): boolean => {
  const currentWindow = readWindow();
  if (!currentWindow) return false;
  try {
    return currentWindow.localStorage.getItem(ORDER_DETAIL_DEBUG_ENABLE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const readStoredSessionId = (): string | null => {
  const currentWindow = readWindow();
  if (!currentWindow) return null;
  try {
    const stored = currentWindow.sessionStorage.getItem(ORDER_DETAIL_DEBUG_SESSION_STORAGE_KEY);
    return stored?.trim() || null;
  } catch {
    return null;
  }
};

const writeStoredSessionId = (sessionId: string): void => {
  const currentWindow = readWindow();
  if (!currentWindow) return;
  try {
    currentWindow.sessionStorage.setItem(ORDER_DETAIL_DEBUG_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Ignore storage failures and keep the in-memory session id.
  }
};

export const isCommerceOrderDetailDebugEnabled = (): boolean =>
  import.meta.env.DEV || resolveStorageFlag();

export const createCommerceOrderDetailDebugId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${createRandomPart()}`;

export const resolveCommerceOrderDetailDebugSessionId = (): string | null => {
  if (!isCommerceOrderDetailDebugEnabled()) return null;
  const stored = readStoredSessionId();
  if (stored) return stored;
  if (fallbackSessionId) return fallbackSessionId;

  fallbackSessionId = createCommerceOrderDetailDebugId("session");
  writeStoredSessionId(fallbackSessionId);
  return fallbackSessionId;
};

const normalizeString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const readCommerceOrderDetailDebugValue = (
  value: Ref<string | null> | string | null | undefined,
): string | null =>
  typeof value === "string" || value === null || typeof value === "undefined"
    ? normalizeString(value)
    : normalizeString(value.value);

export const markNextCommerceOrderDetailTrigger = (
  orderId: string | null | undefined,
  trigger: string,
): void => {
  const normalizedOrderId = normalizeString(orderId);
  if (!normalizedOrderId || !trigger) return;
  const current = pendingOrderDetailTriggers.get(normalizedOrderId) ?? [];
  current.push(trigger);
  pendingOrderDetailTriggers.set(normalizedOrderId, current);
};

export const consumeNextCommerceOrderDetailTrigger = (
  orderId: string | null | undefined,
): string | null => {
  const normalizedOrderId = normalizeString(orderId);
  if (!normalizedOrderId) return null;

  const current = pendingOrderDetailTriggers.get(normalizedOrderId) ?? [];
  const next = current.shift() ?? null;
  if (current.length > 0) {
    pendingOrderDetailTriggers.set(normalizedOrderId, current);
  } else {
    pendingOrderDetailTriggers.delete(normalizedOrderId);
  }
  return next;
};

export const createCommerceOrderDetailDebugHeaders = (input: {
  channel: string;
  source: string;
  requestId: string;
  orderId?: string | null;
  routeOrderId?: string | null;
  billId?: string | null;
  trigger?: string | null;
}): HeadersInit | undefined => {
  const sessionId = resolveCommerceOrderDetailDebugSessionId();
  if (!sessionId) return undefined;

  const headers = new Headers();
  headers.set("x-commerce-order-debug", "1");
  headers.set("x-commerce-order-debug-session", sessionId);
  headers.set("x-commerce-order-debug-request", input.requestId);
  headers.set("x-commerce-order-debug-channel", input.channel);
  headers.set("x-commerce-order-debug-source", input.source);

  const orderId = normalizeString(input.orderId);
  if (orderId) headers.set("x-commerce-order-debug-order-id", orderId);

  const routeOrderId = normalizeString(input.routeOrderId);
  if (routeOrderId) headers.set("x-commerce-order-debug-route-order-id", routeOrderId);

  const billId = normalizeString(input.billId);
  if (billId) headers.set("x-commerce-order-debug-bill-id", billId);

  const trigger = normalizeString(input.trigger);
  if (trigger) headers.set("x-commerce-order-debug-trigger", trigger);

  return headers;
};

export const describeCommerceOrderDetailDebugError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown error";
};

export const logCommerceOrderDetailDebug = (
  event: string,
  payload: Record<string, unknown> = {},
): void => {
  const sessionId = resolveCommerceOrderDetailDebugSessionId();
  if (!sessionId) return;

  console.info("[CommerceOrderDetailDebug]", {
    at: new Date().toISOString(),
    event,
    sessionId,
    ...payload,
  });
};
