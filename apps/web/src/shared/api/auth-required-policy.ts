import type { ApiErrorPayload } from "@/shared/api/error";
import {
  requestWeChatOAuthLogin,
  resetWeChatOAuthLoginRedirectStateForTest,
} from "@/processes/wechat/oauth-login";

export const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";

export const isAuthenticatedRequiredResponse = (
  status: number,
  payload: ApiErrorPayload | null,
): boolean =>
  status === 401 && payload?.code === AUTHENTICATED_REQUIRED_CODE;

export const handleAuthenticatedRequiredResponse = (
  status: number,
  payload: ApiErrorPayload | null,
  returnTo: string,
): boolean => {
  if (!isAuthenticatedRequiredResponse(status, payload)) {
    return false;
  }

  return requestWeChatOAuthLogin(returnTo);
};

export const resetAuthenticatedRequiredRedirectStateForTest = (): void => {
  resetWeChatOAuthLoginRedirectStateForTest();
};
