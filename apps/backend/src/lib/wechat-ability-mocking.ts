import { env } from "./env";

const isProduction = process.env.NODE_ENV === "production";

const resolveAbilityMockingRawEnabled = (): "true" | "false" =>
  env.WECHAT_ABILITY_MOCKING_ENABLED ?? "false";

export const isWeChatAbilityMockingEnabled = (): boolean =>
  !isProduction && resolveAbilityMockingRawEnabled() === "true";

export const resolveWeChatAbilityMockOpenId = (): string | null => {
  if (!isWeChatAbilityMockingEnabled()) {
    return null;
  }

  const openId = (env.WECHAT_ABILITY_MOCK_OPEN_ID ?? "dev-mock-openid").trim();
  return openId.length > 0 ? openId : null;
};
