import type { UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import type { ActiveUserWeChatBindingState } from "../contracts";

const userRepo = new UserRepository();

export async function getActiveUserWeChatBindingState(
  userId: UserId,
): Promise<ActiveUserWeChatBindingState> {
  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return { state: "UNAVAILABLE" };
  }

  if (!user.openId) {
    return { state: "UNBOUND" };
  }

  return {
    state: "BOUND",
    openId: user.openId,
  };
}
