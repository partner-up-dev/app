/**
 * RPC Client Configuration
 *
 * We do not use traditional axios or fetch with manual wrapping.
 * Must create a type-safe client via the backend's exported AppType.
 */
import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";
import { getStoredAccessToken, setStoredAccessToken } from "@/shared/auth/session-storage";
import { API_URL } from "@/shared/api/base-url";
import { readApiErrorPayload } from "@/shared/api/error";
import { isAuthenticatedRequiredResponse } from "@/shared/api/auth-required-policy";
import { resolveCurrentJourneyId } from "@/shared/telemetry/journey";

const ACCESS_TOKEN_HEADER = "x-access-token";
const JOURNEY_ID_HEADER = "x-journey-id";
const CLIENT_ID_HEADER = "x-client-id";
const FRONTEND_CLIENT_ID = "web";

export { API_URL };

export type AuthenticatedRequiredResponseReport = {
  response: Response;
  payload: Awaited<ReturnType<typeof readApiErrorPayload>>;
  returnTo: string;
};

export type AuthenticatedRequiredResponseReporter = (
  report: AuthenticatedRequiredResponseReport,
) => void;

let authenticatedRequiredResponseReporter: AuthenticatedRequiredResponseReporter | null = null;

/**
 * Connects the transport's response observation to the browser auth process.
 * The transport owns no OAuth or navigation policy; callers can unregister by
 * invoking the returned function, which is identity-safe for remounts.
 */
export const registerAuthenticatedRequiredResponseReporter = (
  reporter: AuthenticatedRequiredResponseReporter,
): (() => void) => {
  authenticatedRequiredResponseReporter = reporter;
  return () => {
    if (authenticatedRequiredResponseReporter === reporter) {
      authenticatedRequiredResponseReporter = null;
    }
  };
};

export const authFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  const token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const journeyId = resolveCurrentJourneyId();
  if (journeyId && !headers.has(JOURNEY_ID_HEADER)) {
    headers.set(JOURNEY_ID_HEADER, journeyId);
  }
  if (!headers.has(CLIENT_ID_HEADER)) {
    headers.set(CLIENT_ID_HEADER, FRONTEND_CLIENT_ID);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const rotatedToken = response.headers.get(ACCESS_TOKEN_HEADER);
  if (rotatedToken) {
    setStoredAccessToken(rotatedToken);
  }

  if (response.status === 401 && typeof window !== "undefined") {
    const payload = await readApiErrorPayload(response.clone());
    if (isAuthenticatedRequiredResponse(response.status, payload)) {
      authenticatedRequiredResponseReporter?.({
        response,
        payload,
        returnTo: window.location.href,
      });
    }
  }

  return response;
};

export const client = hc<AppType>(API_URL, {
  fetch: authFetch,
});
