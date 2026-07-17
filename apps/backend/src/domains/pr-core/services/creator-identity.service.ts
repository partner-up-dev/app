import { throwHttpProblem } from "../../../lib/problem-details";
import type { User, UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import { resolveUserByOpenId } from "../../user";
import { ProblemDetailsError } from "../../../lib/problem-details";

const userRepo = new UserRepository();
export const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";

export type CreatorIdentityInput = {
  authenticatedUserId: UserId | null;
  anonymousUserId: UserId | null;
  oauthOpenId: string | null;
};

export type CreatorIdentityResult = {
  user: User;
  source: "authenticated" | "wechat";
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

export async function resolveDraftCreator(input: CreatorIdentityInput): Promise<User | null> {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user || user.status !== "ACTIVE") {
      return throwHttpProblem({ status: 401, detail: "Invalid authenticated user" });
    }
    return user;
  }

  if (input.oauthOpenId) {
    return resolveUserByOpenId(input.oauthOpenId);
  }

  return null;
}

export async function resolvePublishedCreator(
  input: CreatorIdentityInput,
): Promise<CreatorIdentityResult> {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user || user.status !== "ACTIVE") {
      return throwHttpProblem({ status: 401, detail: "Invalid authenticated user" });
    }

    return {
      user,
      source: "authenticated",
    };
  }

  if (input.oauthOpenId) {
    const user = await resolveUserByOpenId(input.oauthOpenId);
    return {
      user,
      source: "wechat",
    };
  }

  return throwAuthenticatedRequired();
}
