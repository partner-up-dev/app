import type { CreatePaymentChargeResponse } from "../queries/usePayment";

type PaymentClientAction = CreatePaymentChargeResponse["clientAction"];
export type PaymentClientActionResult =
  | {
      clientKind: "PAYMENT_REDIRECT";
      clientStatus: "REDIRECTED";
      rawMessage: null;
    }
  | {
      clientKind: "WECHAT_BRIDGE";
      clientStatus: "SUCCEEDED" | "CANCELLED" | "FAILED";
      rawMessage: string | null;
    };

const WECHAT_BRIDGE_READY_EVENT = "WeixinJSBridgeReady";
const WECHAT_BRIDGE_METHOD = "getBrandWCPayRequest";
const WECHAT_BRIDGE_TIMEOUT_MS = 5_000;

const waitForWeixinJsBridge = async (): Promise<NonNullable<Window["WeixinJSBridge"]>> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Current runtime cannot launch payment client actions");
  }

  const existingBridge = window.WeixinJSBridge;
  if (typeof existingBridge?.invoke === "function") {
    return existingBridge;
  }

  return new Promise((resolve, reject) => {
    let timeoutId: number | null = null;

    const cleanup = (): void => {
      document.removeEventListener(WECHAT_BRIDGE_READY_EVENT, handleReady);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };

    const handleReady = (): void => {
      const readyBridge = window.WeixinJSBridge;
      cleanup();
      if (typeof readyBridge?.invoke === "function") {
        resolve(readyBridge);
        return;
      }
      reject(new Error("WeixinJSBridge is unavailable"));
    };

    document.addEventListener(WECHAT_BRIDGE_READY_EVENT, handleReady);
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("WeixinJSBridge is unavailable"));
    }, WECHAT_BRIDGE_TIMEOUT_MS);
  });
};

const invokeWeChatBridge = async (
  action: Extract<PaymentClientAction, { type: "WECHAT_BRIDGE" }>,
): Promise<Extract<PaymentClientActionResult, { clientKind: "WECHAT_BRIDGE" }>> => {
  const bridge = await waitForWeixinJsBridge();
  const response = await new Promise<WeixinJsBridgeCallbackPayload>((resolve) => {
    bridge.invoke(
      WECHAT_BRIDGE_METHOD,
      {
        appId: action.appId,
        timeStamp: action.timeStamp,
        nonceStr: action.nonceStr,
        package: action.package,
        signType: action.signType,
        paySign: action.paySign,
      },
      (payload) => {
        resolve(payload);
      },
    );
  });

  const rawMessage = response.err_msg?.trim() ?? null;
  if (rawMessage?.includes(":ok")) {
    return {
      clientKind: "WECHAT_BRIDGE",
      clientStatus: "SUCCEEDED",
      rawMessage,
    };
  }

  if (rawMessage?.includes(":cancel")) {
    return {
      clientKind: "WECHAT_BRIDGE",
      clientStatus: "CANCELLED",
      rawMessage,
    };
  }

  return {
    clientKind: "WECHAT_BRIDGE",
    clientStatus: "FAILED",
    rawMessage,
  };
};

export async function launchPaymentClientAction(
  action: PaymentClientAction,
): Promise<PaymentClientActionResult> {
  if (action.type === "PAYMENT_REDIRECT") {
    if (typeof window === "undefined") {
      throw new Error("Current runtime cannot launch payment redirects");
    }
    window.location.assign(action.url);
    return {
      clientKind: "PAYMENT_REDIRECT",
      clientStatus: "REDIRECTED",
      rawMessage: null,
    };
  }

  return invokeWeChatBridge(action);
}
