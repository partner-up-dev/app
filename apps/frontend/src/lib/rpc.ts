/**
 * RPC Client Configuration
 *
 * We do not use traditional axios or fetch with manual wrapping.
 * Must create a type-safe client via the backend's exported AppType.
 */
import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";
import {
  getStoredAccessToken,
  setStoredAccessToken,
} from "@/shared/auth/session-storage";
import { API_URL } from "@/shared/api/base-url";
import { readApiErrorPayload } from "@/shared/api/error";
import { handleAuthenticatedRequiredResponse } from "@/shared/api/auth-required-policy";
import { resolveCurrentJourneyId } from "@/shared/telemetry/journey";

const ACCESS_TOKEN_HEADER = "x-access-token";
const JOURNEY_ID_HEADER = "x-journey-id";

export { API_URL };

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
    handleAuthenticatedRequiredResponse(
      response.status,
      payload,
      window.location.href,
    );
  }

  return response;
};

export const client = hc<AppType>(API_URL, {
  fetch: authFetch,
});
