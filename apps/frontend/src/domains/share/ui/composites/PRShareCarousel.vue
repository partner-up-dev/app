<template>
  <section class="share-pr">
    <div class="carousel-header">
      <Button
        class="method-nav-action"
        appearance="pill"
        tone="ghost"
        size="sm"
        type="button"
        @click="goToPrevMethod"
        :disabled="enabledMethods.length <= 1"
        :aria-label="t('share.prevMethodAria')"
      >
        <div class="i-mdi-chevron-left"></div>
      </Button>
      <h3 class="method-label">{{ currentMethod.label }}</h3>
      <Button
        class="method-nav-action"
        appearance="pill"
        tone="ghost"
        size="sm"
        type="button"
        @click="goToNextMethod"
        :disabled="enabledMethods.length <= 1"
        :aria-label="t('share.nextMethodAria')"
      >
        <div class="i-mdi-chevron-right"></div>
      </Button>
    </div>

    <div
      class="method-pane-stage"
      @pointerdown.capture="handleShareMethodInteraction"
      @keydown.capture="handleShareMethodInteraction"
      @input.capture="handleShareMethodInteraction"
    >
      <Transition :name="transitionName">
        <ShareAsLink
          v-show="currentMethod.id === 'WEB_SHARE'"
          class="method-pane"
          :share-url="shareUrl"
          :spm-route-key="spmRouteKey"
          :share-title="shareData.canonicalShare.title"
        />
      </Transition>

      <Transition :name="transitionName">
        <ShareToWechatChatMethod
          v-show="currentMethod.id === 'WECHAT_CHAT'"
          class="method-pane"
          :share-url="shareUrl"
          :spm-route-key="spmRouteKey"
          :pr-id="prId!"
          :pr-data="shareData"
        />
      </Transition>

      <Transition :name="transitionName">
        <ShareToXiaohongshuMethod
          v-show="currentMethod.id === 'XIAOHONGSHU'"
          class="method-pane"
          :share-url="shareUrl"
          :spm-route-key="spmRouteKey"
          :pr-id="prId!"
          :pr-data="shareData"
        />
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ShareAsLink from "@/domains/share/ui/methods/as-link/ShareAsLink.vue";
import ShareToXiaohongshuMethod from "@/domains/share/ui/methods/xhs/ShareToXiaohongshu.vue";
import ShareToWechatChatMethod from "@/domains/share/ui/methods/wechat/ShareToWechatChat.vue";
import type { PRShareProps } from "@/domains/share/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import {
  useShareCarousel,
  type ShareMethod,
  type ShareMethodId,
} from "@/domains/share/use-cases/useShareCarousel";

const props = withDefaults(
  defineProps<
    PRShareProps & {
      defaultMethodId?: ShareMethodId;
      autoRotateIntervalMs?: number | null;
    }
  >(),
  {
    defaultMethodId: "XIAOHONGSHU",
    autoRotateIntervalMs: 3000,
  },
);
const { t } = useI18n();

const allMethods = computed<ShareMethod[]>(() => [
  { id: "WEB_SHARE", label: t("share.methods.webShare"), enabled: true },
  {
    id: "WECHAT_CHAT",
    label: t("share.methods.wechat"),
  },
  {
    id: "XIAOHONGSHU",
    label: t("share.methods.xiaohongshu"),
  },
]);

const prId = computed(() => props.prId);
const shareData = computed(() => ({
  ...props.prData,
  xiaohongshuPoster: props.prData.xiaohongshuPoster ?? null,
  wechatThumbnail: props.prData.wechatThumbnail ?? null,
}));

const {
  enabledMethods,
  currentMethod,
  transitionName,
  goToPrevMethod,
  goToNextMethod,
  handleShareMethodInteraction,
} = useShareCarousel({
  allMethods,
  defaultMethodId: props.defaultMethodId,
  autoRotateIntervalMs: props.autoRotateIntervalMs,
  spmRouteKey: props.spmRouteKey,
});
</script>

<style lang="scss" scoped>
.carousel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  margin-bottom: var(--sys-spacing-medium);
}

.method-nav-action {
  min-width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));

  div {
    @include mx.pu-font(title);
  }
}

.method-label {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  text-align: center;
}

.method-pane-stage {
  position: relative;
  height: 66vh;
  min-height: 0;
  overflow: hidden;
}

.method-pane {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.method-switch-next-enter-active,
.method-switch-next-leave-active,
.method-switch-prev-enter-active,
.method-switch-prev-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.method-switch-next-enter-from,
.method-switch-next-leave-to {
  opacity: 0;
}

.method-switch-next-enter-from {
  transform: translateX(16px);
}

.method-switch-next-leave-to {
  transform: translateX(-16px);
}

.method-switch-prev-enter-from,
.method-switch-prev-leave-to {
  opacity: 0;
}

.method-switch-prev-enter-from {
  transform: translateX(-16px);
}

.method-switch-prev-leave-to {
  transform: translateX(16px);
}

.method-switch-next-leave-active,
.method-switch-prev-leave-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .method-switch-next-enter-active,
  .method-switch-next-leave-active,
  .method-switch-prev-enter-active,
  .method-switch-prev-leave-active {
    transition: none;
  }
}

.empty-state {
  padding: var(--sys-spacing-medium);
  text-align: center;
  color: var(--sys-color-on-surface-variant);
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-small);

  p {
    margin: 0;
  }
}
</style>
