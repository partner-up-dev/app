import type { BillLine } from "../../../entities/bill";
import type { PaymentProviderInstance, PaymentProviderInstanceId } from "../../../entities/payment";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { createPaymentProviderPort, ensureWeChatPayPlatformCertificates } from "../services";
import { applyPaymentSettlementConsequence } from "./payment-settlement-consequence";

const billLineRepo = new BillLineRepository();
const providerInstanceRepo = new PaymentProviderInstanceRepository();

async function loadProviderInstanceForQuery(
  providerInstanceId: PaymentProviderInstanceId,
): Promise<PaymentProviderInstance> {
  const providerInstance = await providerInstanceRepo.findById(providerInstanceId);
  if (!providerInstance) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found",
    });
  }

  return ensureWeChatPayPlatformCertificates(providerInstance);
}

async function reconcileChargePaymentExecution(line: BillLine): Promise<BillLine> {
  if (line.settledAt || !line.paymentProviderInstanceId) {
    return line;
  }

  const providerInstance = await loadProviderInstanceForQuery(
    line.paymentProviderInstanceId as PaymentProviderInstanceId,
  );
  const port = createPaymentProviderPort({ providerInstance });
  const merchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: providerInstance.id,
    billLineId: line.id,
    kind: "CHARGE",
    attemptCount: line.attemptCount,
  });
  const normalized = await port.queryCharge({
    providerInstanceId: providerInstance.id,
    merchantOrderNo,
  });

  if (normalized.status === "SUCCEEDED") {
    const settledLine =
      (await billLineRepo.markSettledFromProvider({
        id: line.id,
        paymentProviderInstanceId: providerInstance.id,
        attemptCount: line.attemptCount,
        settledAt: new Date(),
      })) ??
      (await billLineRepo.findById(line.id)) ??
      line;
    await applyPaymentSettlementConsequence({ billLineId: settledLine.id });
    return settledLine;
  }

  if (normalized.status === "FAILED" || normalized.status === "CLOSED") {
    return (
      (await billLineRepo.clearProviderExecutionSlot({
        id: line.id,
        paymentProviderInstanceId: providerInstance.id,
        attemptCount: line.attemptCount,
      })) ?? line
    );
  }

  return line;
}

export async function openOrLoadChargeExecution(input: {
  line: BillLine;
  providerInstance: PaymentProviderInstance;
}): Promise<BillLine> {
  if (!input.line.paymentProviderInstanceId) {
    const opened = await billLineRepo.openProviderExecutionSlot({
      id: input.line.id,
      paymentProviderInstanceId: input.providerInstance.id,
    });
    if (opened) return opened;

    const current = await billLineRepo.findById(input.line.id);
    if (!current) {
      return throwHttpProblem({ status: 404, detail: "BillLine not found" });
    }
    if (current.settledAt) {
      return throwHttpProblem({ status: 409, detail: "该账单行已支付" });
    }
    if (
      current.paymentProviderInstanceId &&
      current.paymentProviderInstanceId !== input.providerInstance.id
    ) {
      return throwHttpProblem({
        status: 409,
        detail: "BillLine is already bound to another payment provider execution",
        code: "PAYMENT_PROVIDER_CONFLICT",
      });
    }
    if (current.paymentProviderInstanceId) {
      return current;
    }

    return throwHttpProblem({
      status: 409,
      detail: "Payment execution could not be opened",
    });
  }

  if (input.line.paymentProviderInstanceId !== input.providerInstance.id) {
    return throwHttpProblem({
      status: 409,
      detail: "BillLine is already bound to another payment provider execution",
      code: "PAYMENT_PROVIDER_CONFLICT",
    });
  }

  return input.line;
}

export const queryChargePaymentForLineAndReload = async (line: BillLine): Promise<BillLine> => {
  const reconciled = await reconcileChargePaymentExecution(line);
  return (await billLineRepo.findById(reconciled.id)) ?? reconciled;
};
