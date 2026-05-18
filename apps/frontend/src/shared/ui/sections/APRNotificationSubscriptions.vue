<template>
  <article v-for="item in items" :key="item.key" class="subscription-card">
    <div class="subscription-head">
      <div class="subscription-meta">
        <p class="subscription-title">{{ item.title }}</p>
        <p class="subscription-desc">{{ item.description }}</p>
      </div>

      <Button
        v-if="item.actionKind === 'OPEN_SUBSCRIBE' && item.pending"
        class="subscription-action"
        :tone="actionButtonTone"
        size="sm"
        type="button"
        disabled
      >
        {{ props.updatingLabel }}
      </Button>

      <div
        v-else-if="
          item.actionKind === 'OPEN_SUBSCRIBE' &&
          item.actionLabel &&
          item.openSubscribeTemplateId &&
          !item.actionDisabled
        "
        class="open-subscribe-proxy"
      >
        <Button
          class="subscription-action"
          :tone="actionButtonTone"
          size="sm"
          type="button"
        >
          {{ item.actionLabel }}
        </Button>

        <wx-open-subscribe
          class="open-subscribe-overlay"
          :template="item.openSubscribeTemplateId"
          @success="handleOpenSubscribeSuccess(item.key, $event)"
          @error="handleOpenSubscribeError(item.key, $event)"
        >
          <component
            :is="'script'"
            type="text/wxtag-template"
            slot="style"
            v-html="openSubscribeStyleTemplate"
          />
          <component
            :is="'script'"
            type="text/wxtag-template"
            v-html="openSubscribeButtonTemplate"
          />
        </wx-open-subscribe>
      </div>

      <Button
        v-else-if="
          item.actionKind === 'SHOW_MINIPROGRAM_WEBVIEW_NOTICE' &&
          item.actionLabel
        "
        class="subscription-action"
        :tone="actionButtonTone"
        size="sm"
        type="button"
        :disabled="item.actionDisabled || item.pending"
        @click="showMiniProgramWebViewNotice = true"
      >
        {{ item.actionLabel }}
      </Button>

      <Button
        v-else-if="item.actionLabel"
        class="subscription-action"
        :tone="actionButtonTone"
        size="sm"
        type="button"
        :disabled="item.actionDisabled || item.pending"
        @click="handleAction(item.key)"
      >
        {{ item.pending ? props.updatingLabel : item.actionLabel }}
      </Button>
    </div>
  </article>

  <WeChatMiniProgramJssdkNoticeModal
    :open="showMiniProgramWebViewNotice"
    :operation-label="t('wechatMiniProgramWebView.operations.openSubscribe')"
    @close="showMiniProgramWebViewNotice = false"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  useWeChatNotificationSubscriptionsPanel,
  type WeChatNotificationKind,
} from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import Button from "@/shared/ui/actions/Button.vue";
import WeChatMiniProgramJssdkNoticeModal from "@/shared/wechat/WeChatMiniProgramJssdkNoticeModal.vue";

const props = withDefaults(
  defineProps<{
    visibleKinds?: readonly WeChatNotificationKind[];
    descriptionPrefixes?: Partial<Record<WeChatNotificationKind, string>>;
    updatingLabel: string;
    outlineProfile?: "primary" | "surface";
  }>(),
  {
    visibleKinds: () =>
      [
        "REMINDER_CONFIRMATION",
        "ACTIVITY_START_REMINDER",
        "NEW_PARTNER",
        "MEETING_POINT_UPDATED",
        "WAITLIST_PROMOTED",
        "WAITLIST_ALTERNATIVE_AVAILABLE",
        "PR_MESSAGE",
      ] as const,
    outlineProfile: "primary",
  },
);
const { t } = useI18n();

const emit = defineEmits<{
  "error-change": [error: Error | null];
}>();

const notificationSubscriptions = useWeChatNotificationSubscriptionsPanel({
  visibleKinds: props.visibleKinds,
});
const showMiniProgramWebViewNotice = ref(false);

const items = computed(() =>
  notificationSubscriptions.items.value.map((item) => {
    const prefix = props.descriptionPrefixes?.[item.key]?.trim() ?? "";
    if (prefix.length === 0) {
      return item;
    }

    return {
      ...item,
      description: `${prefix} ${item.description}`,
    };
  }),
);
const actionButtonTone = computed(() =>
  props.outlineProfile === "surface" ? "outline" : "primary-outline",
);

const panelError = computed(() => {
  if (notificationSubscriptions.mutation.error.value instanceof Error) {
    return notificationSubscriptions.mutation.error.value;
  }
  if (notificationSubscriptions.query.error.value instanceof Error) {
    return notificationSubscriptions.query.error.value;
  }
  return null;
});

watch(
  panelError,
  (nextError) => {
    emit("error-change", nextError);
  },
  { immediate: true },
);

const extractEventDetail = (event: unknown): unknown => {
  if (event && typeof event === "object" && "detail" in event) {
    return (event as { detail: unknown }).detail;
  }
  return null;
};

const handleAction = async (kind: WeChatNotificationKind) => {
  await notificationSubscriptions.handleAction(kind);
};

const handleOpenSubscribeSuccess = async (
  kind: WeChatNotificationKind,
  event: unknown,
) => {
  await notificationSubscriptions.handleOpenSubscribeSuccess(
    kind,
    extractEventDetail(event),
  );
};

const handleOpenSubscribeError = async (
  kind: WeChatNotificationKind,
  event: unknown,
) => {
  await notificationSubscriptions.handleOpenSubscribeError(
    kind,
    extractEventDetail(event),
  );
};

// Safe constant template for WeChat open tag; never interpolate user input.
const openSubscribeStyleTemplate = `
<style>
.open-subscribe-hit-target {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}
</style>
`;

const openSubscribeButtonTemplate = `
<button class="open-subscribe-hit-target"></button>
`;
</script>

<style scoped lang="scss">
.subscription-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.subscription-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-xsmall);
  width: 100%;
}

.subscription-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.subscription-title {
  margin: 0;
  @include mx.pu-font(label-large);
}

.subscription-desc {
  margin: 0;
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.subscription-action {
  flex-shrink: 0;
}

.open-subscribe-proxy {
  position: relative;
  display: inline-flex;
  min-height: 2rem;
  flex-shrink: 0;
}

.open-subscribe-proxy .subscription-action {
  pointer-events: none;
}

.open-subscribe-overlay {
  position: absolute;
  inset: 0;
  display: inline-flex;
  width: 100%;
  height: 100%;
  min-height: 2rem;
}

@media (max-width: 768px) {
  .subscription-head {
    gap: var(--sys-spacing-xsmall);
  }
}
</style>
