import { computed, ref } from "vue";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { isWeChatMiniProgramWebView } from "@/shared/browser/isWeChatMiniProgramWebView";
import { trackEvent } from "@/shared/telemetry/track";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

type WeChatSignatureResponse = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

type ShareCardPhase = "FALLBACK" | "BASE" | "ENRICHED";

type ShareCardTelemetryMeta = {
  routeSessionId?: string;
  entityKey?: string | null;
  revision?: string;
  phase?: ShareCardPhase;
};

type ShareCardTelemetryPayload = {
  routeSessionId?: string;
  entityKey?: string | null;
  revision?: string;
  prId?: number;
  phase?: ShareCardPhase;
};

type ShareCardData = Pick<
  WeChatShareToChatPayload,
  "title" | "desc" | "link" | "imgUrl"
> & {
  signatureUrl: string;
} & ShareCardTelemetryMeta;

type InitWeChatSdkOptions = {
  jsApiList?: ReadonlyArray<WeChatJsApiName>;
  openTagList?: ReadonlyArray<WeChatOpenTagName>;
  signatureUrl?: string;
  replayShareCard?: boolean;
};

type WeChatSdkRequest = {
  url: string;
  configKey: string;
  jsApiList: WeChatJsApiName[];
  openTagList: WeChatOpenTagName[];
};

type WeChatSdkConfigState = {
  epoch: number;
  url: string;
  configKey: string;
  jsApiList: WeChatJsApiName[];
  openTagList: WeChatOpenTagName[];
};

const stripHash = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.split("#")[0] ?? rawUrl;
  }
};

const WECHAT_SDK_URL = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
const DEFAULT_JS_API_LIST: ReadonlyArray<WeChatJsApiName> = [
  "updateAppMessageShareData",
  "updateTimelineShareData",
  "startRecord",
  "stopRecord",
  "onVoiceRecordEnd",
  "translateVoice",
];

const isWeChatSdkAvailable = (): boolean =>
  typeof window !== "undefined" && typeof wx !== "undefined";

let sdkLoadPromise: Promise<void> | null = null;
let currentInitAttemptId = 0;
let runtimeOperationQueue: Promise<void> = Promise.resolve();

const isInitializingRef = ref(false);
const isReadyRef = ref(false);
const initErrorRef = ref<string | null>(null);
const configuredUrlRef = ref<string | null>(null);
const configuredConfigKeyRef = ref<string | null>(null);
const configuredEpochRef = ref(0);
const lastShareCardRef = ref<ShareCardData | null>(null);

const desiredJsApiSet = new Set<WeChatJsApiName>(DEFAULT_JS_API_LIST);
const desiredOpenTagSet = new Set<WeChatOpenTagName>();

const normalizeJsApiList = (
  jsApiList: ReadonlyArray<WeChatJsApiName> | undefined,
): WeChatJsApiName[] =>
  Array.from(new Set([...(jsApiList ?? DEFAULT_JS_API_LIST)])).sort();

const normalizeOpenTagList = (
  openTagList: ReadonlyArray<WeChatOpenTagName> | undefined,
): WeChatOpenTagName[] => Array.from(new Set(openTagList ?? [])).sort();

const isRequestConfigured = (request: WeChatSdkRequest): boolean =>
  isReadyRef.value &&
  configuredUrlRef.value === request.url &&
  configuredConfigKeyRef.value === request.configKey;

const registerDesiredCapabilities = (
  options: InitWeChatSdkOptions,
): Pick<WeChatSdkRequest, "jsApiList" | "openTagList"> => {
  for (const apiName of normalizeJsApiList(options.jsApiList)) {
    desiredJsApiSet.add(apiName);
  }

  for (const tagName of normalizeOpenTagList(options.openTagList)) {
    desiredOpenTagSet.add(tagName);
  }

  return {
    jsApiList: Array.from(desiredJsApiSet).sort(),
    openTagList: Array.from(desiredOpenTagSet).sort(),
  };
};

const buildWeChatSdkRequest = (
  options: InitWeChatSdkOptions,
): WeChatSdkRequest => {
  const currentUrl = stripHash(options.signatureUrl ?? window.location.href);
  const desiredCapabilities = registerDesiredCapabilities(options);
  const configKey = JSON.stringify({
    jsApiList: desiredCapabilities.jsApiList,
    openTagList: desiredCapabilities.openTagList,
  });

  return {
    url: currentUrl,
    configKey,
    jsApiList: desiredCapabilities.jsApiList,
    openTagList: desiredCapabilities.openTagList,
  };
};

const readCurrentConfigState = (): WeChatSdkConfigState | null => {
  if (
    !configuredUrlRef.value ||
    !configuredConfigKeyRef.value ||
    configuredEpochRef.value === 0
  ) {
    return null;
  }

  const configSnapshot = JSON.parse(configuredConfigKeyRef.value) as {
    jsApiList?: WeChatJsApiName[];
    openTagList?: WeChatOpenTagName[];
  };

  return {
    epoch: configuredEpochRef.value,
    url: configuredUrlRef.value,
    configKey: configuredConfigKeyRef.value,
    jsApiList: configSnapshot.jsApiList ?? [],
    openTagList: configSnapshot.openTagList ?? [],
  };
};

const formatWeChatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Ignore serialization errors and use fallback text.
  }

  return i18n.global.t("common.operationFailed");
};

const toShareCardTelemetryPayload = (
  data: ShareCardData,
): ShareCardTelemetryPayload => {
  const payload: ShareCardTelemetryPayload = {};

  if (data.routeSessionId) {
    payload.routeSessionId = data.routeSessionId;
  }

  if (data.entityKey) {
    payload.entityKey = data.entityKey;
    const [, rawPrId] = data.entityKey.split(":");
    const prId = Number(rawPrId);
    if (Number.isInteger(prId) && prId > 0) {
      payload.prId = prId;
    }
  }

  if (data.revision) {
    payload.revision = data.revision;
  }

  if (data.phase) {
    payload.phase = data.phase;
  }

  return payload;
};

const invokeWeChatShareApi = async (
  apiName: "updateAppMessageShareData" | "updateTimelineShareData",
  invoke: (callbacks: {
    success?: () => void;
    fail?: (error: unknown) => void;
  }) => void,
): Promise<void> => {
  if (typeof window === "undefined") return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve();
    }, 2000);

    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };

    const toError = (error: unknown): Error =>
      new Error(`${apiName} failed: ${formatWeChatError(error)}`);

    try {
      invoke({
        success: () => settle(resolve),
        fail: (error) => settle(() => reject(toError(error))),
      });
    } catch (error) {
      settle(() => reject(toError(error)));
    }
  });
};

const loadWeChatSdk = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  if (isWeChatSdkAvailable()) return;
  if (sdkLoadPromise) return await sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[data-wechat-sdk="true"]`,
    );
    if (existingScript) {
      if (isWeChatSdkAvailable()) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
      }, 8000);

      existingScript.addEventListener(
        "load",
        () => {
          window.clearTimeout(timeoutId);
          resolve();
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => {
          window.clearTimeout(timeoutId);
          reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WECHAT_SDK_URL;
    script.async = true;
    script.dataset.wechatSdk = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
    document.head.appendChild(script);
  });

  try {
    await sdkLoadPromise;
  } catch (error) {
    sdkLoadPromise = null;
    throw error;
  }
};

export const useWeChatShare = () => {
  const enqueueRuntimeOperation = async <T>(
    operation: () => Promise<T>,
  ): Promise<T> => {
    const result = runtimeOperationQueue.then(operation);
    runtimeOperationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return await result;
  };

  const applyWeChatShareCardData = async (data: ShareCardData): Promise<void> => {
    const link = stripHash(data.link);

    await Promise.all([
      invokeWeChatShareApi("updateAppMessageShareData", (callbacks) => {
        wx?.updateAppMessageShareData({
          title: data.title,
          desc: data.desc,
          link,
          imgUrl: data.imgUrl,
          ...callbacks,
        });
      }),
      invokeWeChatShareApi("updateTimelineShareData", (callbacks) => {
        wx?.updateTimelineShareData({
          title: data.title,
          link,
          imgUrl: data.imgUrl,
          ...callbacks,
        });
      }),
    ]);
  };

  const replayWeChatShareCardInternal = async (
    requestedSignatureUrl?: string,
    trigger: "manual" | "sdk_ready" = "manual",
  ): Promise<void> => {
    if (!isWeChatBrowser() || isWeChatMiniProgramWebView()) return;

    const current = lastShareCardRef.value;
    if (!current) return;

    if (
      requestedSignatureUrl &&
      stripHash(current.signatureUrl) !== stripHash(requestedSignatureUrl)
    ) {
      return;
    }

    if (trigger === "sdk_ready" && current.phase) {
      trackEvent("share_replay_triggered", {
        ...toShareCardTelemetryPayload(current),
        routeSessionId: current.routeSessionId ?? "unknown",
        phase: current.phase,
        trigger: "sdk_ready",
      });
    }

    await applyWeChatShareCardData(current);
  };

  const ensureWeChatSdkConfigured = async (
    options: InitWeChatSdkOptions = {},
  ): Promise<WeChatSdkConfigState | null> => {
    if (!isWeChatBrowser() || isWeChatMiniProgramWebView()) return null;

    const request = buildWeChatSdkRequest(options);

    if (isRequestConfigured(request)) {
      return readCurrentConfigState();
    }

    const initAttemptId = ++currentInitAttemptId;
    isInitializingRef.value = true;
    initErrorRef.value = null;

    try {
      await loadWeChatSdk();

      if (!isWeChatSdkAvailable()) {
        throw new Error(i18n.global.t("errors.wechatSdkNotLoaded"));
      }

      const res = await client.api.wechat["jssdk-signature"].$get({
        query: { url: request.url },
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? i18n.global.t("errors.wechatInitFailed"));
      }

      const signature = (await res.json()) as WeChatSignatureResponse;

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const settle = (callback: () => void): void => {
          if (settled) return;
          settled = true;
          callback();
        };

        const timeoutId = window.setTimeout(() => {
          if (currentInitAttemptId !== initAttemptId) return;
          settle(() =>
            reject(new Error(i18n.global.t("errors.wechatInitTimeout"))),
          );
        }, 8000);

        wx?.config({
          debug: false,
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          jsApiList: request.jsApiList,
          openTagList: request.openTagList,
        });

        wx?.ready(() => {
          if (currentInitAttemptId !== initAttemptId) return;
          settle(() => {
            window.clearTimeout(timeoutId);
            resolve();
          });
        });

        wx?.error((error) => {
          if (currentInitAttemptId !== initAttemptId) return;
          settle(() => {
            window.clearTimeout(timeoutId);
            reject(
              new Error(
                i18n.global.t("errors.wechatInitError", {
                  message:
                    error instanceof Error
                      ? error.message
                      : i18n.global.t("common.operationFailed"),
                }),
              ),
            );
          });
        });
      });

      isReadyRef.value = true;
      configuredEpochRef.value += 1;
      configuredUrlRef.value = request.url;
      configuredConfigKeyRef.value = request.configKey;

      const configState = readCurrentConfigState();
      if (!configState) {
        throw new Error(i18n.global.t("errors.wechatInitFailed"));
      }

      if (options.replayShareCard !== false) {
        await replayWeChatShareCardInternal(request.url, "sdk_ready");
      }

      return configState;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : i18n.global.t("errors.initializeFailed");
      initErrorRef.value = message;
      isReadyRef.value = false;
      configuredUrlRef.value = null;
      configuredConfigKeyRef.value = null;
      throw new Error(message);
    } finally {
      isInitializingRef.value = false;
    }
  };

  const initWeChatSdk = async (
    options: InitWeChatSdkOptions = {},
  ): Promise<void> => {
    await enqueueRuntimeOperation(async () => {
      await ensureWeChatSdkConfigured(options);
    });
  };

  const replayWeChatShareCard = async (
    requestedSignatureUrl?: string,
    trigger: "manual" | "sdk_ready" = "manual",
  ): Promise<void> => {
    await enqueueRuntimeOperation(async () => {
      await replayWeChatShareCardInternal(requestedSignatureUrl, trigger);
    });
  };

  const setWeChatShareCard = async (data: ShareCardData): Promise<void> => {
    if (!isWeChatBrowser() || isWeChatMiniProgramWebView()) return;
    await enqueueRuntimeOperation(async () => {
      lastShareCardRef.value = data;
      await ensureWeChatSdkConfigured({
        signatureUrl: data.signatureUrl,
        replayShareCard: false,
      });
      await applyWeChatShareCardData(data);
    });
  };

  return {
    isWeChatBrowser: computed(() => isWeChatBrowser()),
    isInitializing: computed(() => isInitializingRef.value),
    isReady: computed(() => isReadyRef.value),
    initError: computed(() => initErrorRef.value),
    initWeChatSdk,
    replayWeChatShareCard,
    setWeChatShareCard,
  };
};
