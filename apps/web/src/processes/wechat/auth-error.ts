import type { ApiErrorPayload } from "@/shared/api/error";
import {
  redirectToWeChatOAuthBind,
  requestWeChatOAuthLogin,
} from "@/processes/wechat/oauth-login";
import {
  AUTHENTICATED_REQUIRED_CODE,
  handleAuthenticatedRequiredResponse,
} from "@/shared/api/auth-required-policy";

const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

export const isWeChatAuthRequiredError = (
  status: number,
  payload: ApiErrorPayload | null,
): boolean =>
  (status === 401 || status === 403) &&
  (payload?.code === WECHAT_AUTH_REQUIRED_CODE ||
    payload?.code === WECHAT_BIND_REQUIRED_CODE ||
    payload?.code === AUTHENTICATED_REQUIRED_CODE);

export const handleWeChatAuthRequiredError = (
  status: number,
  payload: ApiErrorPayload | null,
  returnTo: string,
): boolean => {
  if (!isWeChatAuthRequiredError(status, payload)) {
    return false;
  }

  if (payload?.code === AUTHENTICATED_REQUIRED_CODE) {
    return handleAuthenticatedRequiredResponse(status, payload, returnTo);
  }

  if (payload?.code === WECHAT_BIND_REQUIRED_CODE) {
    void redirectToWeChatOAuthBind(returnTo);
    return true;
  }

  return requestWeChatOAuthLogin(returnTo);
};
