import { throwHttpProblem } from "../../../lib/problem-details";
import { UserRepository } from "../../../repositories/UserRepository";
import { hasUserRole, type UserId } from "../../../entities/user";
import type { WeChatOAuthUserProfile } from "../../../services/WeChatOAuthService";

const userRepo = new UserRepository();

type UpgradeAnonymousUserInput = {
  userId: UserId;
  openId: string;
  profile: WeChatOAuthUserProfile | null;
};

export async function upgradeAnonymousUserWithWeChat(
  input: UpgradeAnonymousUserInput,
): Promise<{ userId: UserId } | null> {
  const user = await userRepo.findById(input.userId);
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  if (!hasUserRole(user.role, "anonymous")) {
    return null;
  }

  if (user.openId) {
    return null;
  }

  const occupied = await userRepo.findByOpenId(input.openId);
  if (occupied) {
    return throwHttpProblem({
      status: 409,
      detail: "WeChat account is already bound to another user",
    });
  }

  const updated = await userRepo.upgradeAnonymousUserWithWeChat({
    userId: user.id,
    openId: input.openId,
    nickname: input.profile?.nickname ?? null,
    sex: input.profile?.sex ?? null,
    avatar: input.profile?.avatar ?? null,
  });

  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to upgrade anonymous user" });
  }

  return { userId: updated.id };
}
