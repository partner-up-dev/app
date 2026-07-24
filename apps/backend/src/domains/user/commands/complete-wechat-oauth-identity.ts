import { v4 as uuidv4 } from "uuid";
import type { User, UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { UserRepository } from "../../../repositories/UserRepository";
import type {
  CompleteWeChatOAuthIdentityInput,
  PublicAuthenticatedWeChatIdentity,
} from "../contracts";
import { classifyCurrentPublicUser } from "../queries/public-user-identity";
import { bindWeChatToCurrentUser } from "../use-cases/current-user";
import { upgradeAnonymousUserWithWeChat } from "../use-cases/upgrade-anonymous-user";

const userRepo = new UserRepository();

const invalidOpenId = (): never =>
  throwHttpProblem({
    status: 400,
    detail: "Invalid WeChat openid",
  });

const publicIdentityNotAllowed = (): never =>
  throwHttpProblem({
    status: 403,
    detail: "OAuth identity is not eligible for a public session",
    code: "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED",
    type: "https://partner-up.app/problems/wechat.oauth_public_identity_not_allowed",
  });

const toPublicAuthenticatedIdentity = (user: User): PublicAuthenticatedWeChatIdentity => {
  const identity = classifyCurrentPublicUser(user);
  if (identity?.role !== "authenticated") {
    return publicIdentityNotAllowed();
  }

  return {
    userId: identity.userId,
    needsProfileRefresh: !user.nickname || user.sex === null || !user.avatar,
  };
};

const failBinding = (): never => {
  throw new Error("Failed to bind WeChat OAuth identity");
};

const bindTargetUser = async (
  targetUserId: UserId,
  openId: string,
): Promise<PublicAuthenticatedWeChatIdentity> => {
  const targetUser = await userRepo.findById(targetUserId);
  if (!targetUser || targetUser.status !== "ACTIVE") {
    return failBinding();
  }

  if (targetUser.role.includes("anonymous")) {
    const upgraded = await upgradeAnonymousUserWithWeChat({
      userId: targetUser.id,
      openId,
      profile: null,
    });
    if (!upgraded) {
      return failBinding();
    }

    const upgradedUser = await userRepo.findById(upgraded.userId);
    if (!upgradedUser || upgradedUser.status !== "ACTIVE") {
      return failBinding();
    }

    return toPublicAuthenticatedIdentity(upgradedUser);
  }

  await bindWeChatToCurrentUser(targetUser.id, openId);
  const boundUser = await userRepo.findById(targetUser.id);
  if (!boundUser || boundUser.status !== "ACTIVE") {
    return failBinding();
  }

  return toPublicAuthenticatedIdentity(boundUser);
};

const completeBinding = async (
  targetUserId: UserId,
  openId: string,
): Promise<PublicAuthenticatedWeChatIdentity> => {
  const occupiedUser = await userRepo.findByOpenId(openId);
  if (occupiedUser?.status === "ACTIVE") {
    return toPublicAuthenticatedIdentity(occupiedUser);
  }

  return bindTargetUser(targetUserId, openId);
};

const tryCandidateUser = async (
  candidateUserId: UserId | null,
  openId: string,
): Promise<PublicAuthenticatedWeChatIdentity | null> => {
  if (!candidateUserId) {
    return null;
  }

  const candidateUser = await userRepo.findById(candidateUserId);
  if (!candidateUser || candidateUser.status !== "ACTIVE" || candidateUser.openId) {
    return null;
  }

  if (candidateUser.role.includes("anonymous")) {
    const upgraded = await upgradeAnonymousUserWithWeChat({
      userId: candidateUser.id,
      openId,
      profile: null,
    });
    if (upgraded) {
      const upgradedUser = await userRepo.findById(upgraded.userId);
      if (upgradedUser?.status === "ACTIVE") {
        return toPublicAuthenticatedIdentity(upgradedUser);
      }
    }

    return null;
  }

  await bindWeChatToCurrentUser(candidateUser.id, openId);
  const boundUser = await userRepo.findById(candidateUser.id);
  if (!boundUser || boundUser.status !== "ACTIVE") {
    return null;
  }

  return toPublicAuthenticatedIdentity(boundUser);
};

const createAuthenticatedUser = async (
  openId: string,
): Promise<PublicAuthenticatedWeChatIdentity> => {
  const created = await userRepo.createIfNotExists({
    id: uuidv4() as UserId,
    openId,
    role: ["authenticated"],
    status: "ACTIVE",
  });
  if (created) {
    return toPublicAuthenticatedIdentity(created);
  }

  const racedUser = await userRepo.findByOpenId(openId);
  if (!racedUser) {
    throw new Error("Failed to create user for WeChat OAuth login");
  }

  return toPublicAuthenticatedIdentity(racedUser);
};

const completeLogin = async (
  candidateUserId: UserId | null,
  openId: string,
): Promise<PublicAuthenticatedWeChatIdentity> => {
  const existingUser = await userRepo.findByOpenId(openId);
  if (existingUser) {
    return toPublicAuthenticatedIdentity(existingUser);
  }

  const candidateIdentity = await tryCandidateUser(candidateUserId, openId);
  if (candidateIdentity) {
    return candidateIdentity;
  }

  return createAuthenticatedUser(openId);
};

export async function completeWeChatOAuthIdentity(
  input: CompleteWeChatOAuthIdentityInput,
): Promise<PublicAuthenticatedWeChatIdentity> {
  const openId = input.openId.trim();
  if (!openId) {
    return invalidOpenId();
  }

  if (input.mode === "BIND") {
    return completeBinding(input.targetUserId, openId);
  }

  return completeLogin(input.candidateUserId, openId);
}
