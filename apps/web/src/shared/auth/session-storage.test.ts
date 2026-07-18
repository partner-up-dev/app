import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  clearStoredSession,
  getStoredAccessToken,
  getStoredSessionRole,
  setStoredAccessToken,
  setStoredSessionRole,
} from "./session-storage";

describe("public session storage", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearStoredSession();
  });

  it("keeps the public Pinia projection limited to role and user ID", async () => {
    const { useUserSessionStore } = await import("./useUserSessionStore");
    const store = useUserSessionStore();

    store.applyAuthSession({
      role: "authenticated",
      userId: "user-1",
      accessToken: "token-1",
    });

    expect(store.role).toBe("authenticated");
    expect(store.userId).toBe("user-1");
    expect("accessToken" in store).toBe(false);
    expect(getStoredAccessToken()).toBe("token-1");
  });

  it("admits only public roles and keeps token storage separate", () => {
    setStoredSessionRole("authenticated");
    setStoredAccessToken("token-1");

    expect(getStoredSessionRole()).toBe("authenticated");
    expect(getStoredAccessToken()).toBe("token-1");
  });

  it("clears an operator payload instead of projecting it into public storage", async () => {
    const { useUserSessionStore } = await import("./useUserSessionStore");
    const store = useUserSessionStore();

    store.applyAuthSession({
      role: "service",
      userId: "operator-1",
      accessToken: "operator-token",
    });

    expect(store.role).toBe("anonymous");
    expect(store.userId).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });

  it("clears the sole browser token projection with the public session", () => {
    setStoredSessionRole("authenticated");
    setStoredAccessToken("token-1");

    clearStoredSession();

    expect(getStoredSessionRole()).toBe("anonymous");
    expect(getStoredAccessToken()).toBeNull();
  });
});
