import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  setPendingWeChatAction,
} from "./pending-wechat-action";

const selection = {
  type: "RIDE_HAILING",
  timeWindows: [{ startAt: "2035-01-10T02:00:00.000Z", endAt: "2035-01-10T03:00:00.000Z" }],
  place: {
    kind: "route" as const,
    route: [
      {
        wgs84: null,
        bd09: null,
        gcj02: [23, 113] as [number, number],
        name: "起点",
        full_address: null,
      },
      {
        wgs84: null,
        bd09: null,
        gcj02: [24, 114] as [number, number],
        name: "终点",
        full_address: null,
      },
    ],
  },
  preferences: [],
};

describe("PR discovery create WeChat pending action", () => {
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

  it("round-trips a valid create action with edit policy", () => {
    setPendingWeChatAction({
      kind: "PR_DISCOVERY_CREATE",
      selection,
      allowEditAfterReady: { route: true },
    });
    const pending = readPendingWeChatAction();
    expect(pending?.kind).toBe("PR_DISCOVERY_CREATE");
    if (pending?.kind === "PR_DISCOVERY_CREATE") {
      expect(pending.allowEditAfterReady).toEqual({ route: true });
    }
  });

  it("rejects malformed edit policy and clears it", () => {
    storage.setItem(
      "partner_up_pending_wechat_action",
      JSON.stringify({
        kind: "PR_DISCOVERY_CREATE",
        createdAt: Date.now(),
        selection,
        allowEditAfterReady: { route: "yes" },
      }),
    );
    expect(readPendingWeChatAction()).toBeNull();
    expect(storage.getItem("partner_up_pending_wechat_action")).toBeNull();
  });

  it("clears the action explicitly", () => {
    setPendingWeChatAction({ kind: "PR_DISCOVERY_CREATE", selection, allowEditAfterReady: null });
    clearPendingWeChatAction();
    expect(readPendingWeChatAction()).toBeNull();
  });
});
