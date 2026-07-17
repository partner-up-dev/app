import { describe, expect, test } from "vitest";
import { FakeWeChatPayState } from "./state";

const transactionInput = {
  amount: {
    currency: "CNY" as const,
    total: 2000,
  },
  appid: "wx_fake_partnerup_web",
  description: "Rental reservation",
  h5Url: null,
  mchid: "1900000001",
  notifyUrl: "http://127.0.0.1:4000/api/payment/wechat-pay/pi/notify/charge",
  outTradeNo: "payment_tx_1",
  payerOpenid: "openid_fake_user",
};

describe("FakeWeChatPayState", () => {
  test("creates idempotent transactions and converges to success", () => {
    const state = new FakeWeChatPayState();

    const created = state.createTransaction(transactionInput);
    const duplicate = state.createTransaction(transactionInput);

    expect(duplicate).toEqual(created);
    expect(created.tradeState).toBe("NOTPAY");
    expect(created.prepayId).toBe("fake_prepay_paymenttx1");

    const succeeded = state.markTransaction({
      outTradeNo: created.outTradeNo,
      tradeState: "SUCCESS",
    });

    expect(succeeded?.tradeState).toBe("SUCCESS");
    expect(succeeded?.transactionId).toBe("fake_tx_paymenttx1");
    expect(state.findTransactionByPrepayId(created.prepayId)?.tradeState).toBe("SUCCESS");
  });

  test("creates idempotent refunds and keeps refund-to-charge lookup data", () => {
    const state = new FakeWeChatPayState();
    state.createTransaction(transactionInput);
    state.markTransaction({
      outTradeNo: transactionInput.outTradeNo,
      tradeState: "SUCCESS",
    });

    const refund = state.createRefund({
      amount: {
        currency: "CNY" as const,
        refund: 1200,
        total: 2000,
      },
      notifyUrl: "http://127.0.0.1:4000/api/payment/wechat-pay/pi/notify/refund",
      outRefundNo: "refund_tx_1",
      outTradeNo: transactionInput.outTradeNo,
      reason: "Customer cancellation",
      transactionId: "fake_tx_paymenttx1",
    });
    const duplicate = state.createRefund({
      amount: refund.amount,
      notifyUrl: refund.notifyUrl,
      outRefundNo: refund.outRefundNo,
      outTradeNo: "different_trade_no",
      reason: null,
      transactionId: null,
    });

    expect(duplicate).toEqual(refund);
    expect(refund.status).toBe("SUCCESS");
    expect(refund.refundId).toBe("fake_refund_refundtx1");
    expect(state.findRefundByOutRefundNo(refund.outRefundNo)?.outTradeNo).toBe(
      transactionInput.outTradeNo,
    );
  });
});
