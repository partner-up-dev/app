// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type App } from "vue";
import WeChatOAuthHandoffGate from "./WeChatOAuthHandoffGate.vue";

type HandoffResult =
  | { kind: "success"; traceId?: string }
  | { kind: "terminal-failure"; status: number; code?: string }
  | { kind: "retryable-failure"; status?: number }
  | { kind: "absent" };

const testState = vi.hoisted(() => ({
  handoffPending: true,
  route: {
    path: "/me",
    query: { wechatOAuthHandoff: "handoff-nonce", tab: "profile" },
    hash: "",
  },
  consume: vi.fn<(options?: { signal?: AbortSignal }) => Promise<HandoffResult>>(),
  clearAddressBar: vi.fn<() => void>(),
  clearLoginPending: vi.fn<() => void>(),
  clearTrace: vi.fn<() => void>(),
  trackTrace: vi.fn<(phase: string, options?: Record<string, unknown>) => void>(),
  requestLogin: vi.fn<(returnTo: string) => boolean>(),
  bootstrap: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  routerReplace: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock("vue-router", () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    replace: testState.routerReplace,
  }),
}));

vi.mock("@/processes/auth/useAuthSessionBootstrap", () => ({
  ensureAuthSessionBootstrapped: testState.bootstrap,
}));

vi.mock("@/processes/wechat/oauth-handoff", () => ({
  WECHAT_OAUTH_HANDOFF_QUERY_PARAM: "wechatOAuthHandoff",
  clearWeChatOAuthHandoffFromAddressBar: testState.clearAddressBar,
  consumeWeChatOAuthHandoff: testState.consume,
  hasPendingWeChatOAuthHandoff: () => testState.handoffPending,
}));

vi.mock("@/processes/wechat/oauth-login", () => ({
  requestWeChatOAuthLogin: testState.requestLogin,
}));

vi.mock("@/processes/wechat/oauth-login-pending", () => ({
  clearWeChatOAuthLoginPending: testState.clearLoginPending,
}));

vi.mock("@/processes/wechat/oauth-trace", () => ({
  clearWeChatOAuthTrace: testState.clearTrace,
  trackWeChatOAuthTrace: testState.trackTrace,
}));

vi.mock("@partner-up-dev/design-web", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  return {
    PuButton: defineComponent({
      inheritAttrs: false,
      emits: ["click"],
      setup(_, { attrs, emit, slots }) {
        return () =>
          h(
            "button",
            {
              ...attrs,
              onClick: () => emit("click"),
            },
            slots.default?.(),
          );
      },
    }),
  };
});

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  testState.handoffPending = true;
  testState.route = {
    path: "/me",
    query: { wechatOAuthHandoff: "handoff-nonce", tab: "profile" },
    hash: "",
  };
  testState.consume.mockReset();
  testState.bootstrap.mockReset().mockResolvedValue(undefined);
  testState.routerReplace.mockReset().mockResolvedValue(undefined);
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("WeChatOAuthHandoffGate", () => {
  test("releases protected content only after a successful handoff", async () => {
    testState.consume.mockResolvedValueOnce({ kind: "success", traceId: "trace-1" });

    const host = await mountGate();

    expect(host.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    expect(testState.clearAddressBar).toHaveBeenCalledTimes(1);
    expect(testState.routerReplace).toHaveBeenCalledWith({
      path: "/me",
      query: { tab: "profile" },
      hash: "",
    });
    expect(testState.clearTrace).toHaveBeenCalledTimes(1);
    expect(testState.bootstrap).toHaveBeenCalledTimes(1);
  });

  test("keeps an uncertain handoff retryable without discarding its nonce", async () => {
    testState.consume
      .mockResolvedValueOnce({ kind: "retryable-failure", status: 503 })
      .mockResolvedValueOnce({ kind: "success" });

    const host = await mountGate();

    expect(host.querySelector('[data-testid="protected-content"]')).toBeNull();
    expect(getByTestId(host, "wechat-oauth-handoff.retry")).not.toBeNull();
    expect(testState.clearAddressBar).not.toHaveBeenCalled();

    getByTestId(host, "wechat-oauth-handoff.retry")?.click();
    await flushVue();
    await flushVue();

    expect(testState.consume).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    expect(testState.clearAddressBar).toHaveBeenCalledTimes(1);
  });

  test("keeps a thrown transport error retryable without clearing the nonce", async () => {
    testState.consume.mockRejectedValueOnce(new Error("network unavailable"));

    const host = await mountGate();

    expect(host.querySelector('[data-testid="protected-content"]')).toBeNull();
    expect(getByTestId(host, "wechat-oauth-handoff.retry")).not.toBeNull();
    expect(testState.clearAddressBar).not.toHaveBeenCalled();
    expect(testState.clearTrace).not.toHaveBeenCalled();
  });

  test("turns a consumed terminal failure into a fresh-login recovery path", async () => {
    testState.consume.mockResolvedValueOnce({
      kind: "terminal-failure",
      status: 403,
      code: "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED",
    });

    const host = await mountGate();

    expect(host.querySelector('[data-testid="protected-content"]')).toBeNull();
    expect(getByTestId(host, "wechat-oauth-handoff.retry")).toBeNull();
    expect(getByTestId(host, "wechat-oauth-handoff.restart")).not.toBeNull();
    expect(testState.clearLoginPending).toHaveBeenCalledTimes(1);
    expect(testState.clearAddressBar).toHaveBeenCalledTimes(1);
    expect(testState.clearTrace).toHaveBeenCalledTimes(1);

    getByTestId(host, "wechat-oauth-handoff.restart")?.click();
    expect(testState.requestLogin).toHaveBeenCalledTimes(1);
  });
});

const mountGate = async (): Promise<HTMLElement> => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(WeChatOAuthHandoffGate, null, {
            default: () => h("div", { "data-testid": "protected-content" }),
          });
      },
    }),
  );
  app.mount(host);
  mountedApps.push({ app, host });
  await flushVue();
  return host;
};

const getByTestId = (host: HTMLElement, testId: string): HTMLButtonElement | null =>
  host.querySelector(`[data-testid="${testId}"]`);

const flushVue = async (): Promise<void> => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};
