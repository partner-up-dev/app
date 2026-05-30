import type { Page } from "playwright";

export async function installFakeWeChatPayBridge(
  page: Page,
  fakeWeChatPayOrigin: string,
): Promise<void> {
  await page.addInitScript((origin) => {
    type BridgePayload = {
      package: string;
    };
    type BridgeCallback = (response: { err_msg?: string }) => void;
    type BridgeWindow = Window & {
      WeixinJSBridge: {
        invoke(
          method: string,
          payload: BridgePayload,
          callback: BridgeCallback,
        ): void;
      };
    };

    const completePrepay = async (packageValue: string): Promise<void> => {
      const prepayId = packageValue.startsWith("prepay_id=")
        ? packageValue.slice("prepay_id=".length)
        : "";
      if (!prepayId) {
        throw new Error("Fake WeChatPay bridge missing prepay_id package");
      }
      const response = await fetch(
        `${origin}/__fake_wechatpay/prepays/${encodeURIComponent(
          prepayId,
        )}/succeed`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(`Fake WeChatPay bridge failed: ${response.status}`);
      }
    };

    (window as BridgeWindow).WeixinJSBridge = {
      invoke(method, payload, callback) {
        if (method !== "getBrandWCPayRequest") {
          callback({ err_msg: `${method}:fail` });
          return;
        }
        void completePrepay(payload.package)
          .then(() => {
            callback({ err_msg: "get_brand_wcpay_request:ok" });
          })
          .catch((error: unknown) => {
            callback({
              err_msg:
                error instanceof Error
                  ? `get_brand_wcpay_request:fail ${error.message}`
                  : "get_brand_wcpay_request:fail",
            });
          });
      },
    };
  }, fakeWeChatPayOrigin);
}
