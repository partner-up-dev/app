import { randomUUID } from "node:crypto";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type {
  PaymentProviderCredentialSet,
  PaymentTx,
  PaymentTxId,
} from "../../../entities/payment";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { PaymentProviderCredentialSetRepository } from "../../../repositories/PaymentProviderCredentialSetRepository";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import {
  createPaymentProviderPort,
  resolveRefundNotifyUrl,
} from "../services";

const billLineRepo = new BillLineRepository();
const billRepo = new BillRepository();
const paymentTxRepo = new PaymentTxRepository();
const providerInstanceRepo = new PaymentProviderInstanceRepository();
const credentialSetRepo = new PaymentProviderCredentialSetRepository();

export type RefundPaymentTxResult =
  | {
      created: true;
      paymentTxId: string;
      status: PaymentTx["status"];
      providerStatus: string | null;
    }
  | {
      created: false;
      reason:
        | "REFUND_ALREADY_EXISTS"
        | "NO_SOURCE_CHARGE_LINE"
        | "NO_SUCCESSFUL_ORIGINAL_CHARGE";
      paymentTxId?: string;
    };

const buildMerchantRefundNo = (paymentTxId: string): string =>
  `PUR${paymentTxId.replaceAll("-", "").slice(0, 29)}`;

const mapNormalizedStatusToTxStatus = (
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CLOSED",
): PaymentTx["status"] => {
  if (status === "SUCCEEDED") return "SUCCEEDED";
  if (status === "FAILED") return "FAILED";
  if (status === "CLOSED") return "CLOSED";
  return "PROCESSING";
};

const findSuccessfulOriginalCharge = async (
  sourceLineId: BillLineId,
): Promise<PaymentTx | null> => {
  const sourceLineTxs = await paymentTxRepo.listByBillLineIds([sourceLineId]);
  return (
    sourceLineTxs.find(
      (tx) => tx.direction === "CHARGE" && tx.status === "SUCCEEDED",
    ) ?? null
  );
};

const resolveCredentialSet = async (
  originalCharge: PaymentTx,
): Promise<PaymentProviderCredentialSet> => {
  const providerInstance = await providerInstanceRepo.findById(
    originalCharge.providerInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "Original payment provider instance is not active",
    });
  }

  const credentialSet = providerInstance.activeCredentialSetId
    ? await credentialSetRepo.findById(providerInstance.activeCredentialSetId)
    : await credentialSetRepo.findActiveByProviderInstanceId(providerInstance.id);
  if (!credentialSet || credentialSet.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "Payment provider credential set is not active",
    });
  }

  return credentialSet;
};

const createRefundTxForLine = async (input: {
  refundLine: BillLine;
  billId: BillId;
  originalCharge: PaymentTx;
}): Promise<RefundPaymentTxResult> => {
  const providerInstance = await providerInstanceRepo.findById(
    input.originalCharge.providerInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "Original payment provider instance is not active",
    });
  }
  const credentialSet = await resolveCredentialSet(input.originalCharge);
  const port = createPaymentProviderPort({
    providerInstance,
    credentialSet,
  });

  const paymentTxId = randomUUID() as PaymentTxId;
  const merchantRefundNo = buildMerchantRefundNo(paymentTxId);
  const created = await paymentTxRepo.create({
    id: paymentTxId,
    billId: input.billId,
    billLineId: input.refundLine.id,
    direction: "REFUND",
    providerType: input.originalCharge.providerType,
    providerInstanceId: input.originalCharge.providerInstanceId,
    clientId: input.originalCharge.clientId,
    channel: "WECHAT_REFUND",
    status: "INITIATED",
    amountFen: input.refundLine.amountFen,
    currency: input.refundLine.currency,
    requestedBy: input.refundLine.userId as UserId,
    merchantRefundNo,
  });

  const refund = await port.createRefund({
    providerInstanceId: providerInstance.id,
    merchantRefundNo,
    originalMerchantOrderNo: input.originalCharge.merchantOrderNo ?? "",
    originalProviderTransactionId: input.originalCharge.providerTransactionId,
    originalAmountFen: input.originalCharge.amountFen,
    refundAmountFen: input.refundLine.amountFen,
    currency: input.refundLine.currency,
    reason: input.refundLine.description ?? input.refundLine.label,
    notifyUrl: resolveRefundNotifyUrl(providerInstance),
  });
  const nextStatus = mapNormalizedStatusToTxStatus(refund.status);
  const now = new Date();
  const updated = await paymentTxRepo.convergeRefundStatus({
    id: created.id,
    status: nextStatus,
    providerStatus: refund.providerStatus,
    providerRefundId: refund.providerRefundId ?? null,
    providerSnapshot: refund.providerSnapshot,
    failureCode: refund.failureCode ?? null,
    failureMessage: refund.failureMessage ?? null,
    succeededAt: nextStatus === "SUCCEEDED" ? now : null,
    closedAt: nextStatus === "CLOSED" ? now : null,
  });

  return {
    created: true,
    paymentTxId: (updated ?? created).id,
    status: (updated ?? created).status,
    providerStatus: (updated ?? created).providerStatus,
  };
};

export async function createRefundPaymentTxForRefundLine(input: {
  refundBillLineId: string;
}): Promise<RefundPaymentTxResult> {
  const refundLine = await billLineRepo.findById(input.refundBillLineId as BillLineId);
  if (!refundLine) {
    return throwHttpProblem({ status: 404, detail: "Refund BillLine not found" });
  }
  if (refundLine.kind !== "REFUND") {
    return throwHttpProblem({
      status: 409,
      detail: "Only REFUND BillLine can create refund PaymentTx",
    });
  }

  const existing = await paymentTxRepo.findLatestByBillLine({
    billLineId: refundLine.id,
    direction: "REFUND",
  });
  if (existing) {
    return {
      created: false,
      reason: "REFUND_ALREADY_EXISTS",
      paymentTxId: existing.id,
    };
  }

  if (!refundLine.sourceLineId) {
    return {
      created: false,
      reason: "NO_SOURCE_CHARGE_LINE",
    };
  }

  const originalCharge = await findSuccessfulOriginalCharge(refundLine.sourceLineId);
  if (!originalCharge) {
    return {
      created: false,
      reason: "NO_SUCCESSFUL_ORIGINAL_CHARGE",
    };
  }
  if (!originalCharge.merchantOrderNo && !originalCharge.providerTransactionId) {
    return throwHttpProblem({
      status: 409,
      detail: "Original charge has no provider reference for refund",
    });
  }

  const bill = await billRepo.findById(refundLine.billId as BillId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found for refund line" });
  }

  return createRefundTxForLine({
    refundLine,
    billId: bill.id,
    originalCharge,
  });
}
