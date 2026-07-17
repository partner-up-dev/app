<template>
  <Transition name="official-account-nudge-fade">
    <aside
      v-if="open"
      class="official-account-follow-nudge"
      role="status"
      aria-live="polite"
      data-testid="official-account-follow-nudge"
    >
      <div class="nudge-body">
        <span class="nudge-icon i-mdi-wechat" aria-hidden="true"></span>
        <div class="nudge-text">
          <p class="nudge-title">
            {{ t("officialAccountFollow.nudgeTitle") }}
          </p>
          <p class="nudge-description">
            {{ t("officialAccountFollow.nudgeDescription") }}
          </p>
        </div>
      </div>

      <div class="nudge-actions">
        <PuButton
          shape="pill"
          tone="neutral"
          variant="soft"
          size="sm"
          data-testid="official-account-follow-nudge.dismiss"
          @click="emit('dismiss')"
        >
          {{ t("officialAccountFollow.laterAction") }}
        </PuButton>
        <PuButton
          shape="pill"
          size="sm"
          data-testid="official-account-follow-nudge.follow"
          @click="handleOpenOfficialAccountQr"
        >
          <template #leading>
            <span class="i-mdi-qrcode-scan" aria-hidden="true"></span>
          </template>
          {{ t("officialAccountFollow.followAction") }}
        </PuButton>
      </div>
    </aside>
  </Transition>

  <OfficialAccountQrModal
    :open="showOfficialAccountQrModal"
    @close="showOfficialAccountQrModal = false"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";
import { PuButton } from "@partner-up-dev/design-web";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
  complete: [];
}>();

const { t } = useI18n();
const showOfficialAccountQrModal = ref(false);

const handleOpenOfficialAccountQr = (): void => {
  showOfficialAccountQrModal.value = true;
  emit("complete");
};
</script>

<style lang="scss" scoped>
.official-account-follow-nudge {
  position: fixed;
  left: 50%;
  bottom: calc(var(--sys-spacing-medium) + var(--pu-safe-bottom));
  z-index: 60;
  display: grid;
  gap: var(--sys-spacing-small);
  width: min(100% - (var(--sys-spacing-medium) * 2), 28rem);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-on-surface);
  color: var(--sys-color-surface-container-lowest);
  transform: translateX(-50%);
  @include mx.pu-elevation(4);
}

.nudge-body {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
}

.nudge-icon {
  flex: 0 0 auto;
  color: var(--sys-color-primary);
  @include mx.pu-icon(large, true);
}

.nudge-text {
  min-width: 0;
}

.nudge-title,
.nudge-description {
  margin: 0;
}

.nudge-title {
  @include mx.pu-font(body);
  color: var(--sys-color-surface-container-lowest);
}

.nudge-description {
  @include mx.pu-font(support);
  margin-top: var(--sys-spacing-xsmall);
  color: var(--sys-color-surface-container-highest);
}

.nudge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xsmall);
  justify-content: flex-end;
}

.official-account-nudge-fade-enter-active,
.official-account-nudge-fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.official-account-nudge-fade-enter-from,
.official-account-nudge-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5rem);
}

@media (max-width: 480px) {
  .nudge-actions {
    justify-content: stretch;
  }

  .nudge-actions > :deep(.pu-button) {
    flex: 1 1 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .official-account-nudge-fade-enter-active,
  .official-account-nudge-fade-leave-active {
    transition: none !important;
  }
}
</style>
