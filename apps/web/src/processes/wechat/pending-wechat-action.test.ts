import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  setPendingWeChatAction,
} from "./pending-wechat-action";

describe("pending WeChat actions", () => {
  const values = new Map<string, string>();
  const storage = {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: storage });
    storage.clear();
  });

  it("round-trips an unrelated publish action", () => {
    setPendingWeChatAction({ kind: "PR_PUBLISH", prId: 42 });
    expect(readPendingWeChatAction()).toMatchObject({ kind: "PR_PUBLISH", prId: 42 });
  });

  it("persists the waitlist alternative reminder choice", () => {
    setPendingWeChatAction({
      kind: "PR_WAITLIST",
      prId: 42,
      alternativePrReminderOptIn: true,
    });
    expect(readPendingWeChatAction()).toMatchObject({
      kind: "PR_WAITLIST",
      prId: 42,
      alternativePrReminderOptIn: true,
    });
  });

  it("defaults the waitlist alternative reminder choice for legacy storage", () => {
    storage.setItem(
      "partner_up_pending_wechat_action",
      JSON.stringify({ kind: "PR_WAITLIST", prId: 42, createdAt: Date.now() }),
    );
    expect(readPendingWeChatAction()).toMatchObject({
      kind: "PR_WAITLIST",
      prId: 42,
      alternativePrReminderOptIn: false,
    });
  });

  it("rejects the removed discovery-create action and clears it", () => {
    storage.setItem(
      "partner_up_pending_wechat_action",
      JSON.stringify({
        kind: "PR_DISCOVERY_CREATE",
        createdAt: Date.now(),
        selection: {},
        allowEditAfterReady: null,
      }),
    );
    expect(readPendingWeChatAction()).toBeNull();
    expect(storage.getItem("partner_up_pending_wechat_action")).toBeNull();
  });

  it("clears an existing action explicitly", () => {
    setPendingWeChatAction({ kind: "PR_JOIN", prId: 42 });
    clearPendingWeChatAction();
    expect(readPendingWeChatAction()).toBeNull();
  });
});
