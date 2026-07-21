export type PaymentCheckoutAttemptHint = {
  billLineId: string;
  paymentTxId: string;
};

export type SessionStorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const storageKeyPrefix = "partner-up:payment-checkout-attempt:v1:";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const storageKeyFor = (billLineId: string): string => `${storageKeyPrefix}${billLineId}`;

const getBrowserSessionStorage = (): SessionStorageLike | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const readPaymentCheckoutAttemptHint = (input: {
  billLineId: string;
  storage?: SessionStorageLike | null;
}): PaymentCheckoutAttemptHint | null => {
  const storage = input.storage === undefined ? getBrowserSessionStorage() : input.storage;
  if (!storage || !isNonEmptyString(input.billLineId)) return null;

  const key = storageKeyFor(input.billLineId);
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      !isNonEmptyString(parsed.billLineId) ||
      !isNonEmptyString(parsed.paymentTxId) ||
      parsed.billLineId !== input.billLineId
    ) {
      storage.removeItem(key);
      return null;
    }
    return {
      billLineId: parsed.billLineId,
      paymentTxId: parsed.paymentTxId,
    };
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const rememberPaymentCheckoutAttemptHint = (input: {
  billLineId: string;
  paymentTxId: string;
  storage?: SessionStorageLike | null;
}): void => {
  const storage = input.storage === undefined ? getBrowserSessionStorage() : input.storage;
  if (!storage || !isNonEmptyString(input.billLineId) || !isNonEmptyString(input.paymentTxId)) {
    return;
  }

  storage.setItem(
    storageKeyFor(input.billLineId),
    JSON.stringify({
      billLineId: input.billLineId,
      paymentTxId: input.paymentTxId,
    }),
  );
};

export const clearPaymentCheckoutAttemptHint = (input: {
  billLineId: string;
  storage?: SessionStorageLike | null;
}): void => {
  const storage = input.storage === undefined ? getBrowserSessionStorage() : input.storage;
  if (!storage || !isNonEmptyString(input.billLineId)) return;
  storage.removeItem(storageKeyFor(input.billLineId));
};
