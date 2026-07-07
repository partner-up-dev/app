<template>
  <WeChatOAuthHandoffGate>
    <RouterView />
    <MatchedPRHandoffOverlay />
  </WeChatOAuthHandoffGate>
  <WeChatOAuthLoginModal />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useAuthSessionBootstrap } from "@/processes/auth/useAuthSessionBootstrap";
import WeChatOAuthHandoffGate from "@/processes/wechat/WeChatOAuthHandoffGate.vue";
import WeChatOAuthLoginModal from "@/processes/wechat/WeChatOAuthLoginModal.vue";
import MatchedPRHandoffOverlay from "@/processes/route-handoff/MatchedPRHandoffOverlay.vue";
import { useRouteShareOrchestrator } from "@/domains/share/use-cases/useRouteShareOrchestrator";

useAuthSessionBootstrap();
useRouteShareOrchestrator();
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  min-height: var(--pu-vh);
  -webkit-tap-highlight-color: transparent;
}
</style>
