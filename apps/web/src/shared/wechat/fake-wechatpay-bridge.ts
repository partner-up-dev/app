type WeixinJSBridgeApi = NonNullable<Window["WeixinJSBridge"]>;

type BridgeWindow = Pick<Window, "WeixinJSBridge">;
type BridgeDocument = Pick<Document, "dispatchEvent">;
type BridgeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type FakeWeChatPayClientDecision = "SUCCESS" | "CANCEL" | "FAIL";

type FakeWeChatPayBridgeDependencies = {
  bridgeWindow: BridgeWindow;
  bridgeDocument: BridgeDocument;
  fetchImpl: BridgeFetch;
  fakeWeChatPayOrigin: string;
  presentPaymentClient?: (input: {
    packageValue: string;
  }) => Promise<FakeWeChatPayClientDecision>;
  scheduleTask?: (task: () => void) => void;
};

const supportedBridgeMethod = "getBrandWCPayRequest";
const supportedBridgeCallbackName = "get_brand_wcpay_request";
const fakeClientOverlayAttribute = "data-partnerup-fake-wechatpay-client";
const fakeClientTitle = "模拟微信支付";
const fakeClientDescription = "开发环境支付面板，仅用于本地 checkout 调试。";

const normalizeFakeWeChatPayOrigin = (origin: string | null | undefined): string | null => {
  const normalized = origin?.trim() ?? "";
  if (normalized.length === 0) {
    return null;
  }

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
};

const buildBridgeFailureMessage = (detail: string | null = null): string =>
  detail ? `${supportedBridgeCallbackName}:fail ${detail}` : `${supportedBridgeCallbackName}:fail`;

const extractPrepayId = (packageValue: string): string => {
  const prefix = "prepay_id=";
  if (!packageValue.startsWith(prefix)) {
    throw new Error("Fake WeChatPay bridge missing prepay_id package");
  }

  const prepayId = packageValue.slice(prefix.length).trim();
  if (prepayId.length === 0) {
    throw new Error("Fake WeChatPay bridge missing prepay_id package");
  }

  return prepayId;
};

const updateFakeWeChatPayState = async (input: {
  decision: FakeWeChatPayClientDecision;
  fakeWeChatPayOrigin: string;
  packageValue: string;
  fetchImpl: BridgeFetch;
}): Promise<WeixinJsBridgeCallbackPayload> => {
  const prepayId = extractPrepayId(input.packageValue);
  const actionPath =
    input.decision === "SUCCESS"
      ? "succeed"
      : input.decision === "CANCEL"
        ? "close"
        : "fail";
  const url = new URL(
    `/__fake_wechatpay/prepays/${encodeURIComponent(prepayId)}/${actionPath}`,
    input.fakeWeChatPayOrigin,
  );
  const response = await input.fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body:
      input.decision === "SUCCESS"
        ? JSON.stringify({})
        : JSON.stringify({
            reason: input.decision === "CANCEL" ? "client cancel" : "client fail",
          }),
  });

  if (!response.ok) {
    throw new Error(`Fake WeChatPay bridge failed: ${response.status}`);
  }

  if (input.decision === "SUCCESS") {
    return {
      err_msg: `${supportedBridgeCallbackName}:ok`,
    };
  }

  if (input.decision === "CANCEL") {
    return {
      err_msg: `${supportedBridgeCallbackName}:cancel`,
    };
  }

  return {
    err_msg: `${supportedBridgeCallbackName}:fail mock payment failed`,
  };
};

const cleanupExistingFakeClientOverlay = (): void => {
  if (typeof document === "undefined") return;
  document.querySelector(`[${fakeClientOverlayAttribute}]`)?.remove();
};

const presentFakePaymentClient = async (input: {
  packageValue: string;
}): Promise<FakeWeChatPayClientDecision> => {
  if (typeof document === "undefined") {
    throw new Error("Fake WeChatPay payment client requires document");
  }
  const body = document.body;
  if (!body) {
    throw new Error("Fake WeChatPay payment client requires document.body");
  }

  cleanupExistingFakeClientOverlay();

  return new Promise<FakeWeChatPayClientDecision>((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute(fakeClientOverlayAttribute, "true");
    overlay.setAttribute("role", "presentation");
    overlay.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:24px",
        "background:rgba(15, 23, 42, 0.56)",
      ].join(";"),
    );

    const panel = document.createElement("div");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", fakeClientTitle);
    panel.setAttribute(
      "style",
      [
        "width:min(100%, 360px)",
        "border-radius:20px",
        "background:#ffffff",
        "box-shadow:0 24px 80px rgba(15, 23, 42, 0.24)",
        "padding:20px",
        "display:flex",
        "flex-direction:column",
        "gap:12px",
        "font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      ].join(";"),
    );

    const title = document.createElement("h2");
    title.textContent = fakeClientTitle;
    title.setAttribute(
      "style",
      "margin:0;font-size:18px;line-height:1.4;font-weight:700;color:#111827",
    );

    const description = document.createElement("p");
    description.textContent = fakeClientDescription;
    description.setAttribute(
      "style",
      "margin:0;font-size:14px;line-height:1.5;color:#4b5563",
    );

    const reference = document.createElement("p");
    reference.textContent = `prepay_id=${extractPrepayId(input.packageValue)}`;
    reference.setAttribute(
      "style",
      "margin:0;font-size:12px;line-height:1.5;color:#6b7280;word-break:break-all",
    );

    const actionGroup = document.createElement("div");
    actionGroup.setAttribute(
      "style",
      "display:flex;flex-direction:column;gap:8px;margin-top:4px",
    );

    const finish = (decision: FakeWeChatPayClientDecision): void => {
      cleanupExistingFakeClientOverlay();
      window.removeEventListener("keydown", handleKeyDown);
      resolve(decision);
    };

    const buildActionButton = (
      label: string,
      decision: FakeWeChatPayClientDecision,
      background: string,
      foreground: string,
    ): HTMLButtonElement => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute(
        "style",
        [
          "appearance:none",
          "border:none",
          "border-radius:999px",
          "padding:12px 16px",
          "font-size:14px",
          "font-weight:600",
          "cursor:pointer",
          `background:${background}`,
          `color:${foreground}`,
        ].join(";"),
      );
      button.addEventListener("click", () => finish(decision));
      return button;
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish("CANCEL");
      }
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        finish("CANCEL");
      }
    });
    window.addEventListener("keydown", handleKeyDown);

    actionGroup.append(
      buildActionButton("支付成功", "SUCCESS", "#16a34a", "#ffffff"),
      buildActionButton("取消支付", "CANCEL", "#e5e7eb", "#111827"),
      buildActionButton("模拟失败", "FAIL", "#dc2626", "#ffffff"),
    );

    panel.append(title, description, reference, actionGroup);
    overlay.append(panel);
    body.append(overlay);
  });
};

const buildFakeWeChatPayBridge = (deps: FakeWeChatPayBridgeDependencies): WeixinJSBridgeApi => ({
  invoke(method, payload, callback) {
    if (method !== supportedBridgeMethod) {
      callback({
        err_msg: `${method}:fail`,
      });
      return;
    }

    const presentPaymentClient = deps.presentPaymentClient ?? presentFakePaymentClient;

    void presentPaymentClient({
      packageValue: payload.package,
    })
      .then((decision) =>
        updateFakeWeChatPayState({
          decision,
          fakeWeChatPayOrigin: deps.fakeWeChatPayOrigin,
          packageValue: payload.package,
          fetchImpl: deps.fetchImpl,
        }),
      )
      .then((response) => {
        callback(response);
      })
      .catch((error: unknown) => {
        callback({
          err_msg:
            error instanceof Error
              ? buildBridgeFailureMessage(error.message)
              : buildBridgeFailureMessage(),
        });
      });
  },
});

export const installFakeWeChatPayBridgeForTesting = (
  deps: FakeWeChatPayBridgeDependencies,
): boolean => {
  if (typeof deps.bridgeWindow.WeixinJSBridge?.invoke === "function") {
    return false;
  }

  deps.bridgeWindow.WeixinJSBridge = buildFakeWeChatPayBridge(deps);
  const scheduleTask = deps.scheduleTask ?? ((task: () => void) => window.setTimeout(task, 0));
  scheduleTask(() => {
    deps.bridgeDocument.dispatchEvent(new Event("WeixinJSBridgeReady"));
  });
  return true;
};

export const isFakeWeChatPayBridgeEnabled = (): boolean =>
  import.meta.env.DEV &&
  import.meta.env.VITE_FAKE_WECHATPAY_BRIDGE_ENABLED === "true" &&
  normalizeFakeWeChatPayOrigin(import.meta.env.VITE_FAKE_WECHATPAY_ORIGIN) !== null;

export const installFakeWeChatPayBridge = (): boolean => {
  if (
    !isFakeWeChatPayBridgeEnabled() ||
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof fetch !== "function"
  ) {
    return false;
  }

  const fakeWeChatPayOrigin = normalizeFakeWeChatPayOrigin(
    import.meta.env.VITE_FAKE_WECHATPAY_ORIGIN,
  );
  if (fakeWeChatPayOrigin === null) {
    return false;
  }

  return installFakeWeChatPayBridgeForTesting({
    bridgeWindow: window,
    bridgeDocument: document,
    fetchImpl: window.fetch.bind(window),
    fakeWeChatPayOrigin,
  });
};
