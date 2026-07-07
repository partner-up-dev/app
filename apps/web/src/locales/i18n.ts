import { createI18n } from "vue-i18n";
import zhCN from "./zh-CN.jsonc";
import type { MessageSchema } from "./schema";

export const i18n = createI18n<[MessageSchema], "zh-CN">({
  legacy: false,
  locale: "zh-CN",
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
  },
});
