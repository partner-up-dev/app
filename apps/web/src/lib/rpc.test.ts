import { afterEach, expect, test, vi } from "vitest";
import { authFetch } from "./rpc";
import { clearStoredSession, getStoredAccessToken } from "@/shared/auth/session-storage";

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
    get length() {
      return values.size;
    },
  };
};

afterEach(() => {
  clearStoredSession();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, "window");
});

test("authFetch persists a rotated access token from the response header", async () => {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  vi.stubGlobal("window", { localStorage, sessionStorage });

  const token = "rpc-test-token";
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(null, {
      status: 200,
      headers: { "x-access-token": token },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await authFetch("/api/test");

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(getStoredAccessToken()).toBe(token);
});
