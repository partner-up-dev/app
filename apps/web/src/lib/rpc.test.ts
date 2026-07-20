import { afterEach, expect, test, vi } from "vitest";
import {
  authFetch,
  registerAuthenticatedRequiredResponseReporter,
  type AuthenticatedRequiredResponseReport,
} from "./rpc";
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

test("authFetch reports the concrete recognised response without owning OAuth", async () => {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  vi.stubGlobal("window", {
    localStorage,
    sessionStorage,
    location: { href: "https://partner-up.test/pr/7" },
  });

  const response = new Response(
    JSON.stringify({ code: "AUTHENTICATED_REQUIRED", detail: "Login required" }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  const reports: Array<{
    response: Response;
    payload: { code?: string } | null;
    returnTo: string;
  }> = [];
  const unregister = registerAuthenticatedRequiredResponseReporter((report) => {
    reports.push(report);
  });

  try {
    const actual = await authFetch("/api/test");

    expect(actual).toBe(response);
    expect(reports).toEqual([
      {
        response,
        payload: expect.objectContaining({ code: "AUTHENTICATED_REQUIRED" }),
        returnTo: "https://partner-up.test/pr/7",
      },
    ]);
  } finally {
    unregister();
  }
});

test("authFetch does not report other 401 payloads", async () => {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  vi.stubGlobal("window", {
    localStorage,
    sessionStorage,
    location: { href: "https://partner-up.test/pr/7" },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: "OTHER" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  const reporter = vi.fn<(report: AuthenticatedRequiredResponseReport) => void>();
  const unregister = registerAuthenticatedRequiredResponseReporter(reporter);

  try {
    await authFetch("/api/test");
    expect(reporter).not.toHaveBeenCalled();
  } finally {
    unregister();
  }
});
