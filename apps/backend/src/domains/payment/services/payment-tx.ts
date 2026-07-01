import { throwHttpProblem } from "../../../lib/problem-details";
import type { ProviderPaymentReferenceKind } from "../model";

const paymentTxIdPrefix = "ptx1";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export type PaymentTxReference = {
  kind: ProviderPaymentReferenceKind;
  billLineId: string;
  paymentProviderInstanceId: string;
  attemptCount: number;
};

const isValidReference = (value: PaymentTxReference): boolean =>
  uuidPattern.test(value.billLineId) &&
  uuidPattern.test(value.paymentProviderInstanceId) &&
  (value.kind === "CHARGE" || value.kind === "REFUND") &&
  Number.isInteger(value.attemptCount) &&
  value.attemptCount > 0;

export const encodePaymentTxId = (reference: PaymentTxReference): string => {
  if (!isValidReference(reference)) {
    return throwHttpProblem({
      status: 500,
      detail: "PaymentTx reference is invalid",
    });
  }

  const payload = Buffer.from(JSON.stringify(reference), "utf8").toString("base64url");
  return `${paymentTxIdPrefix}_${payload}`;
};

export const decodePaymentTxId = (paymentTxId: string): PaymentTxReference => {
  const [prefix, encoded] = paymentTxId.split("_", 2);
  if (prefix !== paymentTxIdPrefix || !encoded) {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found",
    });
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      !isRecord(parsed) ||
      typeof parsed.kind !== "string" ||
      typeof parsed.billLineId !== "string" ||
      typeof parsed.paymentProviderInstanceId !== "string" ||
      typeof parsed.attemptCount !== "number"
    ) {
      throw new Error("Invalid PaymentTx payload");
    }

    const reference: PaymentTxReference = {
      kind: parsed.kind as ProviderPaymentReferenceKind,
      billLineId: parsed.billLineId,
      paymentProviderInstanceId: parsed.paymentProviderInstanceId,
      attemptCount: parsed.attemptCount,
    };

    if (!isValidReference(reference)) {
      throw new Error("Invalid PaymentTx reference");
    }

    return reference;
  } catch {
    return throwHttpProblem({
      status: 404,
      detail: "PaymentTx not found",
    });
  }
};
