import type { ApiErrorPayload } from "@/shared/api/error";
import { isAuthenticatedRequiredResponse } from "@/shared/api/auth-required-policy";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

/** A small delay lets a command persist its continuation before fallback OAuth. */
export const AUTHENTICATED_ESCALATION_FALLBACK_DELAY_MS = 0;

type PendingEscalation = {
  returnTo: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

let pendingEscalations = new WeakMap<Response, PendingEscalation>();
let handledResponses = new WeakSet<Response>();
// Weak collections cannot be iterated; retain only outstanding timer handles
// so test reset and teardown can cancel scheduled callbacks without retaining
// completed Responses.
const activeTimers = new Set<ReturnType<typeof setTimeout>>();

export type AuthenticatedRequiredResponseReport = {
  response: Response;
  payload: ApiErrorPayload | null;
  returnTo: string;
};

const startOAuthForResponse = (response: Response, returnTo: string): boolean => {
  // The response already has an escalation owner. Report the handled state to
  // compatible callers without scheduling a second OAuth attempt.
  if (handledResponses.has(response)) return true;
  handledResponses.add(response);
  return requestWeChatOAuthLogin(returnTo);
};

/**
 * Receives the transport report and gives a command one timer turn to claim
 * the exact Response. Unclaimed protected requests retain compatible OAuth
 * escalation without creating replay state.
 */
export const reportAuthenticatedRequiredResponse = (
  report: AuthenticatedRequiredResponseReport,
): boolean => {
  const { response, payload, returnTo } = report;
  if (!isAuthenticatedRequiredResponse(response.status, payload)) return false;
  if (handledResponses.has(response) || pendingEscalations.has(response)) return true;

  const timeoutId = setTimeout(() => {
    activeTimers.delete(timeoutId);
    pendingEscalations.delete(response);
    startOAuthForResponse(response, returnTo);
  }, AUTHENTICATED_ESCALATION_FALLBACK_DELAY_MS);
  activeTimers.add(timeoutId);
  pendingEscalations.set(response, { returnTo, timeoutId });
  return true;
};

/**
 * Claims the fallback belonging to one concrete Response after a command has
 * durably written its continuation. A claim always uses the existing OAuth
 * single-flight helper and never consumes another Response's timer.
 */
export const claimAuthenticatedRequiredResponse = (
  response: Response,
  returnTo: string,
): boolean => {
  const pending = pendingEscalations.get(response);
  if (pending) {
    clearTimeout(pending.timeoutId);
    activeTimers.delete(pending.timeoutId);
    pendingEscalations.delete(response);
    return startOAuthForResponse(response, returnTo || pending.returnTo);
  }

  return startOAuthForResponse(response, returnTo);
};

export const resetAuthenticatedEscalationForTest = (): void => {
  for (const timeoutId of activeTimers) {
    clearTimeout(timeoutId);
  }
  activeTimers.clear();
  pendingEscalations = new WeakMap();
  handledResponses = new WeakSet();
};
