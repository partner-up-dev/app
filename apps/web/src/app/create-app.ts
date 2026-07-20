import { VueQueryPlugin } from "@tanstack/vue-query";
import { createHead } from "@unhead/vue/client";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { createApp } from "vue";
import AppRoot from "@/app/AppRoot.vue";
import { router } from "@/app/router";
import { i18n } from "@/locales/i18n";
import { installRouteWeChatAutoLoginGuard } from "@/processes/wechat/route-wechat-auto-login";
import { installFakeWeChatPayBridge } from "@/shared/wechat/fake-wechatpay-bridge";

export const createPartnerUpApp = () => {
  if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  installFakeWeChatPayBridge();

  const app = createApp(AppRoot);
  const head = createHead();
  const pinia = createPinia();

  pinia.use(piniaPluginPersistedstate);

  app.use(head);
  app.use(pinia);
  app.use(VueQueryPlugin);
  app.use(i18n);
  installRouteWeChatAutoLoginGuard(router, pinia);
  app.use(router);

  return app;
};
