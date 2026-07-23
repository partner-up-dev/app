// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, nextTick, ref, type App } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { usePRMessageVisibleAcknowledgement } from "./usePRMessageVisibleAcknowledgement";

const mountedApps: App<Element>[] = [];
const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");

const setDocumentVisibility = (value: "hidden" | "visible"): void => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
};

const flushAcknowledgement = async (): Promise<void> => {
  for (let index = 0; index < 5; index += 1) {
    await nextTick();
    await Promise.resolve();
  }
};

const mountWorkflow = (
  acknowledge: (input: { prId: PRId; acknowledgementCursor: number }) => Promise<unknown>,
): void => {
  const app = createApp(
    defineComponent({
      setup() {
        usePRMessageVisibleAcknowledgement({
          prId: ref<PRId>(42),
          acknowledgementCursor: ref(101),
          enabled: ref(true),
          acknowledge,
        });
        return () => null;
      },
    }),
  );
  const host = document.createElement("div");
  document.body.appendChild(host);
  app.mount(host);
  mountedApps.push(app);
};

beforeEach(() => {
  setDocumentVisibility("visible");
});

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.innerHTML = "";
  if (originalVisibilityDescriptor) {
    Object.defineProperty(document, "visibilityState", originalVisibilityDescriptor);
  }
});

describe("PR message visible acknowledgement", () => {
  test("waits for a committed visible route and ignores hidden cached data", async () => {
    const acknowledge = vi.fn<
      (input: { prId: PRId; acknowledgementCursor: number }) => Promise<unknown>
    >(async () => ({ ok: true }));
    setDocumentVisibility("hidden");
    mountWorkflow(acknowledge);

    await flushAcknowledgement();
    expect(acknowledge).not.toHaveBeenCalled();

    setDocumentVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await flushAcknowledgement();

    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(acknowledge).toHaveBeenCalledWith({ prId: 42, acknowledgementCursor: 101 });
  });

  test("retries the same cursor once after a transient acknowledgement failure", async () => {
    const acknowledge = vi
      .fn<(input: { prId: PRId; acknowledgementCursor: number }) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ ok: true });
    mountWorkflow(acknowledge);

    expect(acknowledge).not.toHaveBeenCalled();
    await flushAcknowledgement();

    expect(acknowledge).toHaveBeenCalledTimes(2);
    expect(acknowledge).toHaveBeenNthCalledWith(1, { prId: 42, acknowledgementCursor: 101 });
    expect(acknowledge).toHaveBeenNthCalledWith(2, { prId: 42, acknowledgementCursor: 101 });
  });
});
