<template>
  <PuModal
    :open="pending"
    max-width="360px"
    title="微信登录"
    :close-on-overlay="false"
    :close-on-escape="false"
  >
    <div class="wechat-oauth-login-modal" aria-live="polite" aria-busy="true">
      <div class="wechat-oauth-login-modal__spinner" aria-hidden="true"></div>
      <p class="wechat-oauth-login-modal__text">正在尝试微信登录...</p>
    </div>
  </PuModal>
</template>

<script setup lang="ts">
import { PuModal } from "@partner-up-dev/design-web";
import { useWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";

const { pending } = useWeChatOAuthLoginPending();
</script>

<style lang="scss" scoped>
@use "@partner-up-dev/design-web/styles/mixins" as mx;

.wechat-oauth-login-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-small) 0;
  text-align: center;
}

.wechat-oauth-login-modal__spinner {
  width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border: 3px solid var(--sys-color-outline-variant);
  border-top-color: var(--sys-color-primary);
  border-radius: 50%;
  animation: wechat-oauth-login-modal-spin 0.8s linear infinite;
}

.wechat-oauth-login-modal__text {
  color: var(--sys-color-on-surface);

  @include mx.pu-font(body);
}

@media (prefers-reduced-motion: reduce) {
  .wechat-oauth-login-modal__spinner {
    animation: none;
  }
}

@keyframes wechat-oauth-login-modal-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
