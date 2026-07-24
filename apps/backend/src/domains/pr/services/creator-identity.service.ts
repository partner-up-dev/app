import { throwHttpProblem } from "../../../lib/problem-details";
import { hasUserRole, type User } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import { resolveUserByOpenId } from "../../user";
import {
  throwAuthenticatedRequired,
  type CreatorIdentityInput,
} from "../contracts/creator-identity";

const userRepo = new UserRepository();
export {
  AUTHENTICATED_REQUIRED_CODE,
  throwAuthenticatedRequired,
  type CreatorIdentityInput,
} from "../contracts/creator-identity";

export type CreatorIdentityResult = {
  user: User;
  source: "authenticated" | "wechat";
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

/** Resolve the owner allowed to cross the canonical PR creation boundary. */
export async function resolveAuthenticatedCreator(input: CreatorIdentityInput): Promise<User> {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user || user.status !== "ACTIVE" || !hasUserRole(user.role, "authenticated")) {
      return throwAuthenticatedRequired();
    }
    return user;
  }

  if (input.oauthOpenId?.trim()) {
    const user = await resolveUserByOpenId(input.oauthOpenId);
    if (user.status !== "ACTIVE" || !hasUserRole(user.role, "authenticated")) {
      return throwAuthenticatedRequired();
    }
    return user;
  }

  return throwAuthenticatedRequired();
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
