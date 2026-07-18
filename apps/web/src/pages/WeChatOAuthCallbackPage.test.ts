// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import WeChatOAuthCallbackPage from "./WeChatOAuthCallbackPage.vue";

type CallbackGet = (
  input: { query: { code: string; state: string } },
  options: { init: { credentials: "include" } },
) => Promise<Response>;

const testState = vi.hoisted(() => ({
  callbackGet: vi.fn<CallbackGet>(),
  applyAuthSession: vi.fn<(payload: unknown) => void>(),
  clearLoginPending: vi.fn<() => void>(),
  clearTrace: vi.fn<() => void>(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, options?: { message?: string }) =>
      options?.message ? `${key}: ${options.message}` : key,
  }),
}));

vi.mock("@partner-up-dev/design-web", async () => {
  const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue");
  const Container = defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h("section", attrs, [slots.header?.(), slots.default?.()]);
    },
  });

  return {
    PuCard: Container,
    PuPageScaffold: Container,
    PuLoadingState: defineComponent({
      props: { message: { type: String, required: true } },
      setup: (props) => () => h("p", props.message),
    }),
  };
});

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      wechat: {
        oauth: {
          callback: {
            $get: testState.callbackGet,
          },
        },
      },
    },
  },
}));

vi.mock("@/shared/auth/useUserSessionStore", () => ({
  useUserSessionStore: () => ({
    applyAuthSession: testState.applyAuthSession,
  }),
}));

vi.mock("@/processes/wechat/oauth-login-pending", () => ({
  clearWeChatOAuthLoginPending: testState.clearLoginPending,
}));

vi.mock("@/processes/wechat/oauth-trace", () => ({
  clearWeChatOAuthTrace: testState.clearTrace,
}));

const mountedApps: Array<{ app: App<Element>; host: HTMLElement }> = [];

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  testState.callbackGet.mockReset();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
});

describe("WeChatOAuthCallbackPage", () => {
  test("fails locally and scrubs callback credentials when callback parameters are incomplete", async () => {
    const host = await mountCallbackPage(
      "/wechat/oauth/callback?code=provider-code&token=legacy-token",
    );

    expect(testState.callbackGet).not.toHaveBeenCalled();
    expect(testState.clearLoginPending).toHaveBeenCalledTimes(1);
    expect(testState.clearTrace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(host.textContent).toContain("wechatOAuthCallbackPage.missingParams");
  });

  test("renders a Problem Details failure without applying or redirecting auth", async () => {
    const replace = vi.spyOn(window.location, "replace").mockImplementation(() => undefined);
    testState.callbackGet.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED",
          detail: "OAuth identity is not eligible for a public session",
          status: 403,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    );

    const host = await mountCallbackPage(
      "/wechat/oauth/callback?code=provider-code&state=provider-state&tab=profile",
    );

    expect(testState.callbackGet).toHaveBeenCalledWith(
      { query: { code: "provider-code", state: "provider-state" } },
      { init: { credentials: "include" } },
    );
    expect(testState.applyAuthSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(testState.clearLoginPending).toHaveBeenCalledTimes(1);
    expect(testState.clearTrace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?tab=profile");
    expect(host.textContent).toContain("OAuth identity is not eligible for a public session");
  });

  test("keeps the legacy JSON callback failure shape compatible", async () => {
    const replace = vi.spyOn(window.location, "replace").mockImplementation(() => undefined);
    testState.callbackGet.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: "Legacy callback failed" }), { status: 200 }),
    );

    const host = await mountCallbackPage("/wechat/oauth/callback?code=code&state=state");

    expect(testState.applyAuthSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Legacy callback failed");
    expect(testState.clearLoginPending).toHaveBeenCalledTimes(1);
    expect(testState.clearTrace).toHaveBeenCalledTimes(1);
  });

  test("applies the legacy JSON auth payload only on a successful callback", async () => {
    const replace = vi.spyOn(window.location, "replace").mockImplementation(() => undefined);
    testState.callbackGet.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          returnTo: "https://app.partner-up.test/me?tab=profile",
          auth: {
            accessToken: "authenticated-token",
            role: "authenticated",
            userId: "11111111-1111-4111-8111-111111111111",
          },
        }),
        { status: 200 },
      ),
    );

    await mountCallbackPage("/wechat/oauth/callback?code=code&state=state");

    expect(testState.applyAuthSession).toHaveBeenCalledWith({
      accessToken: "authenticated-token",
      role: "authenticated",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    expect(replace).toHaveBeenCalledWith("https://app.partner-up.test/me?tab=profile");
    expect(testState.clearLoginPending).toHaveBeenCalledTimes(1);
    expect(testState.clearTrace).toHaveBeenCalledTimes(1);
  });
});

const mountCallbackPage = async (path: string): Promise<HTMLElement> => {
  window.history.replaceState(null, "", path);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(WeChatOAuthCallbackPage);
  app.mount(host);
  mountedApps.push({ app, host });
  await flushVue();
  return host;
};

const flushVue = async (): Promise<void> => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};
