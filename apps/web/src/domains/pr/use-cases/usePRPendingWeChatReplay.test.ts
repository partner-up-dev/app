// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import { computed, createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  setPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import type { PendingWeChatAction } from "@/processes/wechat/pending-wechat-action";
import {
  createPRPendingReplayRegistry,
  providePRPendingReplayRegistry,
  usePRPendingWeChatReplay,
  useRegisterPRPendingReplayHandler,
  type PRPendingReplayRegistry,
} from "./usePRPendingWeChatReplay";

const mountedApps: App<Element>[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  clearPendingWeChatAction();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("usePRPendingWeChatReplay", () => {
  test("waits for the matching handler to become ready before clearing pending action", async () => {
    const prId = ref<number | null>(123);
    const pageReady = ref(true);
    const handlerReady = ref(false);
    const replay = vi.fn<() => Promise<void> | void>(() => {
      expect(readPendingWeChatAction()).toBeNull();
    });
    const registry = createPRPendingReplayRegistry();

    setPendingWeChatAction({ kind: "PR_JOIN", prId: 123 });
    registry.register("PR_JOIN", {
      ready: handlerReady,
      replay,
    });

    mountComposable(() => {
      usePRPendingWeChatReplay({
        prId,
        ready: pageReady,
        registry,
      });
    });

    await flushVue();
    expect(replay).not.toHaveBeenCalled();
    expect(readPendingWeChatAction()?.kind).toBe("PR_JOIN");

    handlerReady.value = true;
    await flushVue();

    expect(replay).toHaveBeenCalledTimes(1);
    expect(readPendingWeChatAction()).toBeNull();
  });

  test("passes the matching typed pending action to the handler", async () => {
    const prId = ref<number | null>(123);
    const replay = vi.fn<(pending: PendingWeChatAction) => Promise<void> | void>();
    const registry = createPRPendingReplayRegistry();

    setPendingWeChatAction({
      kind: "PR_WAITLIST",
      prId: 123,
      alternativePrReminderOptIn: true,
    });
    registry.register("PR_WAITLIST", {
      ready: computed(() => true),
      replay,
    });

    mountComposable(() => {
      usePRPendingWeChatReplay({
        prId,
        ready: computed(() => true),
        registry,
      });
    });

    await flushVue();

    expect(replay).toHaveBeenCalledOnce();
    expect(replay).toHaveBeenCalledWith({
      kind: "PR_WAITLIST",
      prId: 123,
      alternativePrReminderOptIn: true,
      createdAt: expect.any(Number),
    });
    expect(readPendingWeChatAction()).toBeNull();
  });

  test("does not clear pending action before a handler is registered", async () => {
    const prId = ref<number | null>(123);
    const pageReady = ref(true);
    const showHandler = ref(false);
    const replay = vi.fn<() => Promise<void> | void>();
    const registryBox: { value: PRPendingReplayRegistry | null } = {
      value: null,
    };

    setPendingWeChatAction({ kind: "PR_WAITLIST", prId: 123 });

    const Handler = defineComponent({
      setup() {
        useRegisterPRPendingReplayHandler("PR_WAITLIST", {
          ready: computed(() => true),
          replay,
        });
        return () => null;
      },
    });

    mountComposable(() => {
      registryBox.value = providePRPendingReplayRegistry();
      usePRPendingWeChatReplay({
        prId,
        ready: pageReady,
        registry: registryBox.value,
      });
      return () => (showHandler.value ? h(Handler) : null);
    });

    await flushVue();
    expect(replay).not.toHaveBeenCalled();
    expect(readPendingWeChatAction()?.kind).toBe("PR_WAITLIST");

    showHandler.value = true;
    await flushVue();

    expect(replay).toHaveBeenCalledTimes(1);
    expect(readPendingWeChatAction()).toBeNull();

    showHandler.value = false;
    await flushVue();
    expect(registryBox.value?.handlers.PR_WAITLIST).toBeUndefined();
  });

  test("ignores pending actions for another PR", async () => {
    const prId = ref<number | null>(123);
    const replay = vi.fn<() => Promise<void> | void>();
    const registry = createPRPendingReplayRegistry();

    setPendingWeChatAction({ kind: "PR_CONFIRM", prId: 456 });
    registry.register("PR_CONFIRM", {
      ready: computed(() => true),
      replay,
    });

    mountComposable(() => {
      usePRPendingWeChatReplay({
        prId,
        ready: computed(() => true),
        registry,
      });
    });

    await flushVue();

    expect(replay).not.toHaveBeenCalled();
    expect(readPendingWeChatAction()?.kind).toBe("PR_CONFIRM");
  });
});

const mountComposable = (setup: () => (() => unknown) | void): void => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(
    defineComponent({
      setup,
      template: "<div />",
    }),
  );
  app.mount(host);
  mountedApps.push(app);
};

const flushVue = async (): Promise<void> => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};
