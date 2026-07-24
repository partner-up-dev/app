import type { UserId } from "../../../entities/user";
import type { ActiveUserWeChatIdentity } from "../contracts";
import { getActiveUserWeChatBindingState } from "./active-user-wechat-binding-state";

export const findActiveUserWeChatIdentity = async (
  userId: UserId,
): Promise<ActiveUserWeChatIdentity | null> => {
  const bindingState = await getActiveUserWeChatBindingState(userId);
  if (bindingState.state !== "BOUND") {
    return null;
  }

  return {
    userId,
    openId: bindingState.openId,
  };
};
