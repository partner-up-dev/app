import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";
import {
  clearStoredAdminSession,
  getStoredAdminAccessToken,
  setStoredAdminAccessToken,
} from "@/domains/admin/model/admin-session-storage";
import { API_URL } from "@/lib/rpc";

const ACCESS_TOKEN_HEADER = "x-access-token";
const ADMIN_LOGIN_PATH_SUFFIX = "/auth/admin/login";

const getRequestPath = (input: RequestInfo | URL): string => {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  try {
    const baseUrl =
      typeof window === "undefined" ? "http://localhost" : window.location.origin;
    return new URL(rawUrl, baseUrl).pathname;
  } catch {
    return rawUrl;
  }
};

const isAdminLoginRequest = (input: RequestInfo | URL): boolean =>
  getRequestPath(input).endsWith(ADMIN_LOGIN_PATH_SUFFIX);

const redirectToAdminLogin = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath =
    window.location.pathname + window.location.search + window.location.hash;
  const target = `/admin/login?redirect=${encodeURIComponent(currentPath)}`;

  if (window.location.pathname === "/admin/login") {
    return;
  }

  window.location.replace(target);
};

const adminFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  const token = getStoredAdminAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const rotatedToken = response.headers.get(ACCESS_TOKEN_HEADER);
  if (rotatedToken) {
    setStoredAdminAccessToken(rotatedToken);
  }

  if (response.status === 401 && !isAdminLoginRequest(input)) {
    clearStoredAdminSession();
    redirectToAdminLogin();
  }

  return response;
};

export const adminClient = hc<AppType>(API_URL, {
  fetch: adminFetch,
});
