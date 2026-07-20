// @vitest-environment happy-dom

import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, type App } from "vue";
import { useWaitlistPR } from "./usePRActions";
import {
  handleWeChatAuthRequiredError,
  isWeChatAuthRequiredError,
} from "@/processes/wechat/auth-error";
import { setPendingWeChatAction } from "@/processes/wechat/pending-wechat-action";

const mocks = vi.hoisted(() => ({
  waitlistPost: vi.fn<(input: unknown, options?: unknown) => Promise<Response>>(),
  authOrder: [] as string[],
}));

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      pr: {
        ":id": {
          waitlist: {
            $post: mocks.waitlistPost,
          },
        },
      },
    },
  },
}));

vi.mock("@/processes/wechat/auth-error", () => ({
  isWeChatAuthRequiredError: vi.fn<(status: number, payload: unknown) => boolean>(() => true),
  handleWeChatAuthRequiredError: vi.fn<
    (status: number, payload: unknown, returnTo: string, response?: Response) => boolean
  >(() => {
    mocks.authOrder.push("claim");
    return true;
  }),
}));

vi.mock("@/processes/wechat/pending-wechat-action", () => ({
  setPendingWeChatAction: vi.fn<(action: unknown) => void>((action: unknown) => {
    mocks.authOrder.push("persist");
    return action;
  }),
}));

const mountedApps: App<Element>[] = [];

describe("PR action auth continuation ordering", () => {
  beforeEach(() => {
    mocks.waitlistPost.mockReset();
    mocks.authOrder.length = 0;
  });

  afterEach(() => {
    for (const app of mountedApps.splice(0)) {
      app.unmount();
    }
  });

  test("persists waitlist intent with opt-in before claiming authenticated response", async () => {
    mocks.waitlistPost.mockResolvedValue(
      new Response(JSON.stringify({ code: "AUTHENTICATED_REQUIRED" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const queryClient = new QueryClient();
    let mutation: ReturnType<typeof useWaitlistPR> | undefined;
    const app = createApp(
      defineComponent({
        setup() {
          mutation = useWaitlistPR();
          return () => null;
        },
      }),
    );
    app.use(VueQueryPlugin, { queryClient });
    const host = document.createElement("div");
    document.body.appendChild(host);
    app.mount(host);
    mountedApps.push(app);

    await expect(
      mutation?.mutateAsync({ id: 42, alternativePrReminderOptIn: true }),
    ).rejects.toThrow(/.+/);

    expect(vi.mocked(setPendingWeChatAction)).toHaveBeenCalledWith({
      kind: "PR_WAITLIST",
      prId: 42,
      alternativePrReminderOptIn: true,
    });
    expect(mocks.authOrder).toEqual(["persist", "claim"]);
    expect(vi.mocked(handleWeChatAuthRequiredError)).toHaveBeenCalledWith(
      401,
      { code: "AUTHENTICATED_REQUIRED" },
      window.location.href,
      expect.any(Response),
    );
    expect(vi.mocked(isWeChatAuthRequiredError)).toHaveBeenCalledWith(401, {
      code: "AUTHENTICATED_REQUIRED",
    });
  });
});
