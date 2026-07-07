import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";

export const isWeChatAbilityMockingEnabled = (): boolean =>
  import.meta.env.VITE_WECHAT_ABILITY_MOCKING_ENABLED === "true";

export const isWeChatAbilityEnv = (): boolean =>
  isWeChatAbilityMockingEnabled() || isWeChatBrowser();
