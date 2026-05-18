<template>
  <section class="utility-area">
    <div class="utility-actions">
      <div
        v-if="
          showBetaGroupEntry ||
          (showMessageThread && prId !== null)
        "
        class="utility-action-row"
      >
        <Button
          v-if="showBetaGroupEntry"
          tone="outline"
          block
          data-testid="pr-detail.beta-group.open"
          @click="handleOpenBetaGroupModal"
        >
          {{ t("prPage.betaGroupEntry.action") }}
        </Button>

        <Button
          v-if="showMessageThread && prId !== null"
          tone="outline"
          block
          @click="handleOpenMessages"
        >
          {{ t("prPage.messageEntry.action") }}
        </Button>
      </div>

      <div class="utility-action-group" data-region="share">
        <Button tone="outline" block @click="showShareDrawer = true">
          {{ t("prPage.shareEntry.action") }}
        </Button>
        <div v-if="showEventPlazaLink" class="utility-link-row">
          <router-link :to="{ name: 'event-plaza' }" class="utility-link">
            {{ t("anchorEvent.otherEvents.action") }}
            <span
              class="utility-link__icon i-mdi:arrow-right"
              aria-hidden="true"
            />
          </router-link>
        </div>
      </div>
    </div>

    <section
      v-if="showInlineReminderSubscriptions"
      class="utility-section"
      data-region="reliability"
    >
      <div class="utility-section__content">
        <h2 class="utility-section__title">
          {{ t("prPage.notificationSubscriptions.title") }}
        </h2>
        <APRNotificationSubscriptions
          :updating-label="t('prPage.wechatReminder.updating')"
          outline-profile="surface"
        />
      </div>
    </section>

    <BottomDrawer
      :open="showShareDrawer"
      title="分享邀请"
      @close="showShareDrawer = false"
    >
      <PRShareSection
        :pr-id="prId"
        :share-url="shareUrl"
        :spm-route-key="spmRouteKey"
        :pr-data="prShareData"
        default-method-id="XIAOHONGSHU"
        :auto-rotate-interval-ms="null"
      />
    </BottomDrawer>

    <Modal
      :open="showBetaGroupModal"
      @close="showBetaGroupModal = false"
    >
      <AnchorEventBetaGroupQrPanel
        :event-title="betaGroupEventTitle"
        :qr-code-url="betaGroupQrCode"
      />
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import AnchorEventBetaGroupQrPanel from "@/domains/event/ui/primitives/AnchorEventBetaGroupQrPanel.vue";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import {
  prMessagesPath,
} from "@/domains/pr/routing/routes";
import { trackEvent } from "@/shared/telemetry/track";

const props = defineProps<{
  prId: PRId | null;
  pr: PRDetailView;
  supportsEventContextFeatures: boolean;
}>();

const router = useRouter();
const { t } = useI18n();
const showShareDrawer = ref(false);
const showBetaGroupModal = ref(false);
const id = computed(() => props.prId);
const prDetail = computed(() => props.pr);
const { shareUrl, spmRouteKey, prShareData } = usePRShareContext({
  id,
  pr: prDetail,
});

const showMessageThread = computed(
  () =>
    props.supportsEventContextFeatures &&
    props.pr.partnerSection.viewer.isParticipant,
);

const showEventPlazaLink = computed(() => props.supportsEventContextFeatures);
const betaGroupQrCode = computed(() => {
  const qrCode = props.pr.anchorEventContext?.betaGroupQrCode?.trim() ?? "";
  return qrCode.length > 0 ? qrCode : null;
});
const betaGroupEventTitle = computed(
  () => props.pr.anchorEventContext?.title ?? props.pr.core.type,
);
const showBetaGroupEntry = computed(() => betaGroupQrCode.value !== null);

const showInlineReminderSubscriptions = computed(() => {
  const section = props.pr.partnerSection;
  if (!section.reminder.supported) return false;
  return section.viewer.isParticipant;
});

useBodyScrollLock(
  computed(() => showShareDrawer.value || showBetaGroupModal.value),
);

const handleOpenMessages = () => {
  if (props.prId === null || !props.supportsEventContextFeatures) return;
  router.push(prMessagesPath(props.prId));
};

const handleOpenBetaGroupModal = () => {
  showBetaGroupModal.value = true;
  if (props.prId === null) return;
  trackEvent("pr_secondary_action_click", {
    prId: props.prId,
    actionType: "JOIN_BETA_GROUP",
  });
};
</script>

<style lang="scss" scoped>
.utility-area {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.utility-actions,
.utility-action-group,
.utility-section__content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.utility-action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.utility-action-row > button:only-child {
  grid-column: 1 / -1;
}

.utility-section__title {
  margin: 0;
  @include mx.pu-font(body-large);
}

.utility-link-row {
  display: flex;
  justify-content: flex-end;
}

.utility-link {
  @include mx.pu-font(body-medium);
  display: inline-flex;
  align-items: center;
  color: var(--sys-color-secondary);
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 180ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.utility-link__icon {
  margin-left: var(--sys-spacing-xsmall);
  display: inline-block;
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

@media (hover: hover) and (pointer: fine) {
  .utility-link:hover {
    transform: translateX(2px);
    color: var(--sys-color-primary);
  }
}
</style>
