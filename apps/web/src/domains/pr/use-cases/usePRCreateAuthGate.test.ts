import { describe, expect, it, vi } from "vitest";
import { createPRCreateAuthGate } from "./usePRCreateAuthGate";

describe("PR create auth gate", () => {
  it("opens disclosure for anonymous users without invoking a command", async () => {
    const oauth = vi.fn<(returnTo: string) => void>();
    const gate = createPRCreateAuthGate({
      bootstrap: vi.fn<() => Promise<void>>(async () => undefined),
      isAuthenticated: () => false,
      requestOAuth: oauth,
      getReturnTo: () => "https://example.test/pr/new",
    });

    expect(await gate.ensureCreateAuth()).toBe(false);
    expect(gate.showAuthDisclosure.value).toBe(true);
    gate.cancelAuth();
    expect(gate.showAuthDisclosure.value).toBe(false);
    expect(oauth).not.toHaveBeenCalled();
  });

  it("only starts OAuth after explicit confirmation and does so once", async () => {
    const oauth = vi.fn<(returnTo: string) => void>();
    const gate = createPRCreateAuthGate({
      bootstrap: vi.fn<() => Promise<void>>(async () => undefined),
      isAuthenticated: () => false,
      requestOAuth: oauth,
      getReturnTo: () => "https://example.test/pr/new?mode=form",
    });

    await gate.ensureCreateAuth();
    gate.confirmAuth();
    gate.confirmAuth();
    expect(oauth).toHaveBeenCalledOnce();
    expect(oauth).toHaveBeenCalledWith("https://example.test/pr/new?mode=form");
  });

  it("allows authenticated commands after bootstrap", async () => {
    const bootstrap = vi.fn<() => Promise<void>>(async () => undefined);
    const gate = createPRCreateAuthGate({ bootstrap, isAuthenticated: () => true });

    expect(await gate.ensureCreateAuth()).toBe(true);
    expect(gate.showAuthDisclosure.value).toBe(false);
    expect(bootstrap).toHaveBeenCalledOnce();
  });
});
