import type { BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentProviderInstanceId } from "../../../entities/payment";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import type { NormalizedPaymentStatus } from "../model";
import {
  createPaymentProviderPort,
  ensureWeChatPayPlatformCertificates,
  resolveWeChatPayRefundNotifyUrl,
} from "../services";

const billLineRepo = new BillLineRepository();
const providerInstanceRepo = new PaymentProviderInstanceRepository();

export type RefundExecutionResult =
  | {
      created: true;
      billLineId: string;
      status: "PROCESSING" | "SUCCEEDED" | "FAILED" | "CLOSED";
      providerStatus: string | null;
    }
  | {
      created: false;
      reason:
        | "REFUND_ALREADY_SETTLED"
        | "REFUND_ALREADY_ACTIVE"
        | "NO_REFUND_OF_CHARGE_LINE"
        | "NO_SUCCESSFUL_ORIGINAL_CHARGE";
      billLineId?: string;
    };

const toRefundExecutionStatus = (
  status: NormalizedPaymentStatus,
): "PROCESSING" | "SUCCEEDED" | "FAILED" | "CLOSED" => {
  if (status === "SUCCEEDED") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  if (status === "CLOSED") return "CLOSED";
  return "PROCESSING";
};

const isTerminalUnsettledProviderStatus = (status: NormalizedPaymentStatus): boolean =>
  status === "FAILED" || status === "CLOSED";

const loadOriginalChargeLine = async (chargeBillLineId: BillLineId): Promise<BillLine | null> => {
  const chargeLine = await billLineRepo.findById(chargeBillLineId);
  if (!chargeLine || chargeLine.kind !== "CHARGE" || !chargeLine.settledAt) {
    return null;
  }
  return chargeLine;
};

const createRefundExecutionForLine = async (input: {
  refundLine: BillLine;
  originalCharge: BillLine;
}): Promise<RefundExecutionResult> => {
  if (!input.originalCharge.paymentProviderInstanceId) {
    return throwHttpProblem({
      status: 409,
      detail: "Original charge has no provider binding for refund",
    });
  }
  const providerInstance = await providerInstanceRepo.findById(
    input.originalCharge.paymentProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "Original payment provider instance is not active",
    });
  }
  const ensuredProviderInstance = await ensureWeChatPayPlatformCertificates(providerInstance);
  const port = createPaymentProviderPort({
    providerInstance: ensuredProviderInstance,
  });

  const openedRefundLine = await billLineRepo.openProviderExecutionSlot({
    id: input.refundLine.id,
    paymentProviderInstanceId: providerInstance.id as PaymentProviderInstanceId,
  });
  if (!openedRefundLine) {
    const current = await billLineRepo.findById(input.refundLine.id);
    if (current?.settledAt) {
      return {
        created: false,
        reason: "REFUND_ALREADY_SETTLED",
        billLineId: current.id,
      };
    }
    if (current?.paymentProviderInstanceId) {
      return {
        created: false,
        reason: "REFUND_ALREADY_ACTIVE",
        billLineId: current.id,
      };
    }
    return throwHttpProblem({
      status: 409,
      detail: "Refund execution could not be opened",
    });
  }

  const originalMerchantOrderNo = port.deriveChargeMerchantOrderNo({
    providerInstanceId: providerInstance.id,
    billLineId: input.originalCharge.id,
    kind: "CHARGE",
    attemptCount: input.originalCharge.attemptCount,
  });
  const merchantRefundNo = port.deriveRefundMerchantRefundNo({
    providerInstanceId: providerInstance.id,
    billLineId: openedRefundLine.id,
    kind: "REFUND",
    attemptCount: openedRefundLine.attemptCount,
  });

  const refund = await port.createRefund({
    providerInstanceId: providerInstance.id,
    merchantRefundNo,
    originalMerchantOrderNo,
    originalAmountFen: input.originalCharge.amountFen,
    refundAmountFen: openedRefundLine.amountFen,
    currency: openedRefundLine.currency,
    reason: openedRefundLine.description ?? openedRefundLine.label,
    notifyUrl: resolveWeChatPayRefundNotifyUrl(ensuredProviderInstance),
  });
  if (refund.status === "SUCCEEDED") {
    await billLineRepo.markSettledFromProvider({
      id: openedRefundLine.id,
      paymentProviderInstanceId: providerInstance.id,
      attemptCount: openedRefundLine.attemptCount,
      settledAt: new Date(),
    });
  } else if (isTerminalUnsettledProviderStatus(refund.status)) {
    await billLineRepo.clearProviderExecutionSlot({
      id: openedRefundLine.id,
      paymentProviderInstanceId: providerInstance.id,
      attemptCount: openedRefundLine.attemptCount,
    });
  }

  return {
    created: true,
    billLineId: openedRefundLine.id,
    status: toRefundExecutionStatus(refund.status),
    providerStatus: refund.providerStatus,
  };
};

export async function createRefundExecutionForRefundLine(input: {
  refundBillLineId: string;
}): Promise<RefundExecutionResult> {
  const refundLine = await billLineRepo.findById(input.refundBillLineId as BillLineId);
  if (!refundLine) {
    return throwHttpProblem({ status: 404, detail: "Refund BillLine not found" });
  }
  if (refundLine.kind !== "REFUND") {
    return throwHttpProblem({
      status: 409,
      detail: "Only REFUND BillLine can create refund execution",
    });
  }
  if (refundLine.settledAt) {
    return {
      created: false,
      reason: "REFUND_ALREADY_SETTLED",
      billLineId: refundLine.id,
    };
  }
  if (refundLine.paymentProviderInstanceId) {
    return {
      created: false,
      reason: "REFUND_ALREADY_ACTIVE",
      billLineId: refundLine.id,
    };
  }

  if (!refundLine.refundOfBillLineId) {
    return {
      created: false,
      reason: "NO_REFUND_OF_CHARGE_LINE",
    };
  }

  const originalCharge = await loadOriginalChargeLine(refundLine.refundOfBillLineId);
  if (!originalCharge) {
    return {
      created: false,
      reason: "NO_SUCCESSFUL_ORIGINAL_CHARGE",
    };
  }

  return createRefundExecutionForLine({
    refundLine,
    originalCharge,
  });
}
