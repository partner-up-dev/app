import { hasUserRole, type UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import type { OfficialAccountFollowStatus } from "../contracts";

const userRepo = new UserRepository();

export async function getOfficialAccountFollowStatus(
  userId: UserId,
): Promise<OfficialAccountFollowStatus> {
  const user = await userRepo.findById(userId);
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !hasUserRole(user.role, "authenticated") ||
    !user.wechatOfficialAccountFollowedAt
  ) {
    return {
      status: "UNKNOWN",
      followedAt: null,
    };
  }

  return {
    status: "FOLLOWED",
    followedAt: user.wechatOfficialAccountFollowedAt.toISOString(),
  };
}
