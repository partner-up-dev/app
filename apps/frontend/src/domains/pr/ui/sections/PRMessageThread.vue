<template>
  <component
    :is="containerComponent"
    v-bind="containerProps"
    class="message-thread"
    :class="{
      'message-thread--card': !isPageLayout,
      'message-thread--page': isPageLayout,
    }"
  >
    <header v-if="showHeader" class="message-thread__header">
      <h2 class="message-thread__title">
        {{ t("prPage.messageThread.title") }}
      </h2>
      <p class="message-thread__subtitle">
        {{ t("prPage.messageThread.subtitle") }}
      </p>
    </header>

    <PuInlineNotice
      tone="info"
      :message="t('prPage.messageThread.nonRealtimeHint')"
    />

    <PuInlineNotice
      v-if="messagesQuery.error.value"
      tone="error"
      :message="messagesQuery.error.value.message"
    />

    <div
      class="message-thread__viewport"
      :class="{ 'message-thread__viewport--page': isPageLayout }"
    >
      <template v-if="!messagesQuery.error.value">
        <p v-if="messagesQuery.isLoading.value" class="message-thread__loading">
          {{ t("common.loading") }}
        </p>

        <PuEmptyState
          v-else-if="threadItems.length === 0 && !isPageLayout"
          :title="t('prPage.messageThread.emptyTitle')"
          :description="t('prPage.messageThread.emptyDescription')"
          icon="i-mdi-message-text-outline"
          align="start"
        />

        <div v-else-if="threadItems.length === 0" class="message-thread__empty">
          <span
            class="message-thread__empty-icon i-mdi-message-text-outline"
            aria-hidden="true"
          />
          <div class="message-thread__empty-text">
            <h2 class="message-thread__empty-title">
              {{ t("prPage.messageThread.emptyTitle") }}
            </h2>
            <p class="message-thread__empty-description">
              {{ t("prPage.messageThread.emptyDescription") }}
            </p>
          </div>
        </div>

        <ul
          v-else
          class="message-list"
          :class="{ 'message-list--page': isPageLayout }"
        >
          <li
            v-for="item in threadItems"
            :key="item.id"
            class="message-list__item"
            :class="{
              'message-list__item--page': isPageLayout,
              'message-list__item--system': item.messageType === 'SYSTEM',
            }"
          >
            <div class="message-list__meta">
              <span class="message-list__author">
                {{ resolveAuthorName(item) }}
              </span>
              <time class="message-list__time" :datetime="item.createdAt">
                {{ formatMessageTime(item.createdAt) }}
              </time>
            </div>
            <p class="message-list__body">
              {{ item.body }}
            </p>
          </li>
        </ul>
      </template>
    </div>

    <PuInlineNotice v-if="submitError" tone="error" :message="submitError" />
    <PuInlineNotice
      v-if="readMarkerError"
      tone="warning"
      :message="readMarkerError"
    />

    <PuFormItem
      class="message-thread__composer"
      :label="t('prPage.messageThread.inputLabel')"
      for-id="pr-message-input"
    >
      <PuTextarea
        id="pr-message-input"
        v-model="draftBody"
        :placeholder="t('prPage.messageThread.inputPlaceholder')"
        ::maxlength="1000"
        />
    </PuFormItem>

    <div class="message-thread__actions">
      <Button
        tone="primary"
        :loading="createMessageMutation.isPending.value"
        :disabled="!canSubmitMessage"
        @click="handleSubmitMessage"
      >
        {{
          createMessageMutation.isPending.value
            ? t("prPage.messageThread.submittingAction")
            : t("prPage.messageThread.submitAction")
        }}
      </Button>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import { PuCard, PuEmptyState, PuFormItem, PuInlineNotice, PuTextarea } from "@partner-up-dev/design-web";
import Button from "@/shared/ui/actions/Button.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import {
  useAdvancePRMessageReadMarker,
  type PRMessagesResponse,
  useCreatePRMessage,
  usePRMessages,
} from "@/domains/pr/queries/usePRMessages";

const props = withDefaults(
  defineProps<{
    prId: PRId;
    showHeader?: boolean;
    layout?: "card" | "page";
  }>(),
  {
    showHeader: true,
    layout: "card",
  },
);

const { t } = useI18n();
const draftBody = ref("");
const submitError = ref<string | null>(null);
const readMarkerError = ref<string | null>(null);
const lastReadAdvanceRequestId = ref<number | null>(null);

const prIdRef = computed(() => props.prId);
const messagesQuery = usePRMessages(prIdRef);
const createMessageMutation = useCreatePRMessage();
const advanceReadMarkerMutation = useAdvancePRMessageReadMarker();

const threadItems = computed(() => messagesQuery.data.value?.items ?? []);
const thread = computed(() => messagesQuery.data.value?.thread ?? null);
const isPageLayout = computed(() => props.layout === "page");
const containerComponent = computed(() =>
  isPageLayout.value ? "section" : PuCard,
);
const containerProps = computed(() =>
  isPageLayout.value
    ? {}
    : {
        as: "section" as const,
        variant: "outline" as const,
        padding: "sm" as const,
        gap: "sm" as const,
      },
);

const canSubmitMessage = computed(() => {
  if (!thread.value?.canPost) return false;
  if (createMessageMutation.isPending.value) return false;
  return draftBody.value.trim().length > 0;
});

watch(draftBody, () => {
  submitError.value = null;
});

watch(
  () =>
    [
      thread.value?.latestVisibleMessageId ?? null,
      thread.value?.lastReadMessageId ?? null,
      messagesQuery.isLoading.value,
      advanceReadMarkerMutation.isPending.value,
    ] as const,
  ([latestVisibleMessageId, lastReadMessageId, isLoading, isMarkingRead]) => {
    if (isLoading || isMarkingRead || latestVisibleMessageId === null) return;
    if (
      lastReadMessageId !== null &&
      latestVisibleMessageId <= lastReadMessageId
    ) {
      return;
    }
    if (lastReadAdvanceRequestId.value === latestVisibleMessageId) {
      return;
    }

    lastReadAdvanceRequestId.value = latestVisibleMessageId;
    readMarkerError.value = null;
    void advanceReadMarkerMutation
      .mutateAsync({
        id: props.prId,
        lastReadMessageId: latestVisibleMessageId,
      })
      .catch((error: unknown) => {
        readMarkerError.value =
          error instanceof Error ? error.message : t("common.operationFailed");
      });
  },
  { immediate: true },
);

const resolveAuthorName = (
  item: PRMessagesResponse["items"][number],
): string => {
  if (item.messageType === "SYSTEM") {
    return item.author.label;
  }

  const normalized = item.author.nickname?.trim();
  if (normalized) return normalized;
  return t("prPage.messageThread.authorFallback");
};

const formatMessageTime = (iso: string): string => {
  return formatLocalDateTimeValue(iso) ?? iso;
};

const handleSubmitMessage = async () => {
  if (!canSubmitMessage.value) return;

  const body = draftBody.value.trim();
  if (!body) return;

  submitError.value = null;
  try {
    await createMessageMutation.mutateAsync({
      id: props.prId,
      body,
    });
    draftBody.value = "";
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};
</script>

<style scoped lang="scss">
.message-thread {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.message-thread--card {
  gap: var(--sys-spacing-small);
}

.message-thread--page {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-large);
}

.message-thread__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.message-thread__title,
.message-thread__subtitle {
  margin: 0;
}

.message-thread__title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.message-thread__subtitle {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.message-thread__loading {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.message-thread__viewport {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.message-thread__viewport--page {
  flex: 1 1 auto;
  min-height: 0;
}

.message-thread__empty {
  display: flex;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
}

.message-thread__empty-icon {
  @include mx.pu-icon(large, true);
  color: var(--sys-color-primary);
  flex-shrink: 0;
}

.message-thread__empty-text {
  min-width: 0;
}

.message-thread__empty-title,
.message-thread__empty-description {
  margin: 0;
}

.message-thread__empty-title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.message-thread__empty-description {
  margin-top: var(--sys-spacing-xsmall);
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.message-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.message-list__item {
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-lowest);
}

.message-list__item--system {
  border-color: var(--sys-color-outline);
  background: var(--sys-color-surface-container-low);
}

.message-list--page {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-large);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.message-list__item--page {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

.message-list__meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--sys-spacing-small);
}

.message-list__author {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface);
}

.message-list__item--system .message-list__author {
  color: var(--sys-color-primary);
}

.message-list__time {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.message-list__body {
  margin: var(--sys-spacing-xsmall) 0 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-list__item--page .message-list__body {
  max-width: 68ch;
}

.message-thread__composer {
  gap: var(--sys-spacing-small);
}

.message-thread__actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 375px) {
  .message-list__meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sys-spacing-xsmall);
  }
}
</style>
