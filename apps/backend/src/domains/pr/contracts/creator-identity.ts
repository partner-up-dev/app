import type { UserId } from "../../../entities/user";
import { ProblemDetailsError } from "../../../lib/problem-details";

export const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";

export type CreatorIdentityInput = {
  authenticatedUserId: UserId | null;
  anonymousUserId: UserId | null;
  oauthOpenId: string | null;
};

export const throwAuthenticatedRequired = (): never => {
  throw new ProblemDetailsError({
    status: 401,
    type: "https://partner-up.app/problems/auth.authenticated_required",
    code: AUTHENTICATED_REQUIRED_CODE,
    localizedText: {
      zhCN: {
        title: "需要登录",
        detail: "请先完成微信登录后继续操作。",
      },
      enUS: {
        title: "Login required",
        detail: "Please log in with WeChat before continuing.",
      },
    },
  });
};
