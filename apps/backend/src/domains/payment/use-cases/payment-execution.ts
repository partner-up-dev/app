import type { PaymentProviderInstance, PaymentProviderInstanceId } from "../../../entities/payment";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { clearBillLinePaymentExecution, openBillLinePaymentExecution } from "../../bill/commands";
import { settleBillLinePaymentAndApplyOrderConsequence } from "../../trade/commands";
import type { BillLinePaymentExecutionSnapshot } from "../../bill/contracts";
import { throwHttpProblem } from "../../../lib/problem-details";
import { createPaymentProviderPort, ensureWeChatPayPlatformCertificates } from "../services";

export type ChargePaymentReconciliation = {
  line: BillLinePaymentExecutionSnapshot;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED";
  providerStatus: string | null;
  settlementTransition: "SETTLED" | "ALREADY_SETTLED" | "NOT_APPLICABLE";
};

async function loadProviderInstanceForQuery(
  providerInstanceId: PaymentProviderInstanceId,
): Promise<PaymentProviderInstance> {
  const providerInstance = await new PaymentProviderInstanceRepository().findById(
    providerInstanceId,
  );
  if (!providerInstance) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
}

/**
 * Reconcile an active Bill-owned attempt against the provider. The browser and
 * transport callers consume this result, but the Bill command decides whether
 * an observed success is a real settlement transition or stale history.
 */
export async function reconcileChargePaymentExecution(input: {
  line: BillLinePaymentExecutionSnapshot;
  paymentProviderInstance?: PaymentProviderInstance;
  reference?: {
    paymentProviderInstanceId: string;
    attemptCount: number;
  };
}): Promise<ChargePaymentReconciliation> {
  const reference =
    input.reference ??
    (input.line.paymentProviderInstanceId
      ? {
          paymentProviderInstanceId: input.line.paymentProviderInstanceId,
          attemptCount: input.line.attemptCount,
        }
      : null);
  if (!reference) {
    return {
      line: input.line,
      status: "PENDING",
      providerStatus: null,
      settlementTransition: "NOT_APPLICABLE",
    };
  }

  const referenceIsSuperseded =
    input.line.attemptCount > reference.attemptCount ||
    (input.line.paymentProviderInstanceId !== null &&
      (input.line.paymentProviderInstanceId !== reference.paymentProviderInstanceId ||
        input.line.attemptCount !== reference.attemptCount));
  if (referenceIsSuperseded) {
    return throwHttpProblem({
      status: 409,
      code: "PAYMENT_ATTEMPT_SUPERSEDED",
      detail: "Payment attempt was superseded before it could be reconciled",
    });
  }

  const isExactSettledAttempt =
    input.line.settledAt !== null &&
    input.line.paymentProviderInstanceId === reference.paymentProviderInstanceId &&
    input.line.attemptCount === reference.attemptCount;
  if (isExactSettledAttempt) {
    return {
      line: input.line,
      status: "SUCCEEDED",
      providerStatus: "SETTLED",
      settlementTransition: "ALREADY_SETTLED",
    };
  }

  const providerInstance =
    input.paymentProviderInstance ??
    (await loadProviderInstanceForQuery(
      reference.paymentProviderInstanceId as PaymentProviderInstanceId,
    ));
  const port = createPaymentProviderPort({ providerInstance });
  const merchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: reference.paymentProviderInstanceId,
    billLineId: input.line.id,
    kind: "CHARGE",
    attemptCount: reference.attemptCount,
  });
  const normalized = await port.queryCharge({
    providerInstanceId: reference.paymentProviderInstanceId,
    merchantOrderNo,
  });

  if (normalized.status === "SUCCEEDED") {
    const settlement = await settleBillLinePaymentAndApplyOrderConsequence({
      billLineId: input.line.id,
      paymentProviderInstanceId: reference.paymentProviderInstanceId,
      attemptCount: reference.attemptCount,
      settledAt: new Date(),
    });
    if (settlement.status === "STALE") {
      return throwHttpProblem({
        status: 409,
        code: "PAYMENT_ATTEMPT_SUPERSEDED",
        detail: "Payment attempt was superseded before provider settlement could be applied",
      });
    }
    return {
      line: settlement.line,
      status: "SUCCEEDED",
      providerStatus: normalized.providerStatus,
      settlementTransition: settlement.status,
    };
  }

  if (normalized.status === "FAILED" || normalized.status === "CLOSED") {
    const line = await clearBillLinePaymentExecution({
      billLineId: input.line.id,
      paymentProviderInstanceId: reference.paymentProviderInstanceId,
      attemptCount: reference.attemptCount,
    });
    return {
      line,
      status: normalized.status,
      providerStatus: normalized.providerStatus,
      settlementTransition: "NOT_APPLICABLE",
    };
  }

  return {
    line: input.line,
    status: "PENDING",
    providerStatus: normalized.providerStatus,
    settlementTransition: "NOT_APPLICABLE",
  };
}

export async function openOrLoadChargeExecution(input: {
  billLineId: string;
  providerInstance: PaymentProviderInstance;
}): Promise<BillLinePaymentExecutionSnapshot> {
  const execution = await openBillLinePaymentExecution({
    billLineId: input.billLineId,
    paymentProviderInstanceId: input.providerInstance.id,
  });
  if (execution.status === "SETTLED") {
    return throwHttpProblem({ status: 409, detail: "该账单行已支付" });
  }
  if (execution.status === "BOUND_TO_ANOTHER_PROVIDER") {
    return throwHttpProblem({
      status: 409,
      detail: "BillLine is already bound to another payment provider execution",
      code: "PAYMENT_PROVIDER_CONFLICT",
    });
  }
  return execution.line;
}

export const queryChargePaymentForLineAndReload = async (
  line: BillLinePaymentExecutionSnapshot,
): Promise<BillLinePaymentExecutionSnapshot> =>
  (await reconcileChargePaymentExecution({ line })).line;
