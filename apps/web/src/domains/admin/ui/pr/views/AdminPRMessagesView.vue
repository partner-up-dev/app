<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <PRFilterRail
        v-model:filters="filters"
        type-options-list-id="admin-pr-message-type-options"
        location-options-list-id="admin-pr-message-location-options"
      />
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <PuInlineNotice tone="error"
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
        />

        <template v-else>
          <datalist id="admin-pr-message-type-options">
            <option
              v-for="typeOption in workspace?.typeOptions ?? []"
              :key="typeOption.type"
              :value="typeOption.type"
            >
              {{ typeOption.eventTitle }}
            </option>
          </datalist>
          <datalist id="admin-pr-message-location-options">
            <option
              v-for="locationOption in filterLocationOptions"
              :key="locationOption"
              :value="locationOption"
            />
          </datalist>

          <BentoLayout class="pr-workspace-layout">
            <BentoItem :title="t('adminPRMessages.prsTitle')" span="full">
              <div class="stack">
                <div class="section-header">
                  <p class="hint">
                    {{
                      t("adminPR.filteredCountLabel", {
                        count: filteredPRs.length,
                      })
                    }}
                  </p>
                </div>

                <div v-if="filteredPRs.length === 0" class="hint">
                  {{ t("adminPR.emptySearchResults") }}
                </div>

                <div
                  v-else
                  class="pr-result-list pr-result-list--grid pr-result-list--scroll"
                >
                  <PuCard
                    v-for="pr in filteredPRs"
                    :key="pr.prId"
                    class="pr-result-card"
                    :active="selectedPRId === pr.prId"
                    @click="selectPR(pr.prId)"
                    selectable
                    variant="outline"
                    padding="sm"
                    gap="xs"
                  >
                    <span>{{ pr.title || pr.location || `#${pr.prId}` }}</span>
                    <small>#{{ pr.prId }} / {{ pr.status }}</small>
                    <small>{{ formatWindow(pr.time) }}</small>
                  </PuCard>
                </div>
              </div>
            </BentoItem>

            <BentoItem
              id="pr-messages"
              :title="t('adminPRMessages.panelTitle')"
              :description="t('adminPRMessages.panelHint')"
              span="full"
              data-testid="admin-pr.section.messages"
            >
              <div class="stack">
                <div v-if="selectedPR === null" class="empty-state">
                  {{ t("adminPRMessages.selectPRHint") }}
                </div>

                <template v-else>
                  <p v-if="messagesQuery.isLoading.value" class="hint">
                    {{ t("common.loading") }}
                  </p>
                  <p
                    v-else-if="messagesQuery.error.value"
                    class="error-message"
                  >
                    {{ messagesQuery.error.value.message }}
                  </p>
                  <div
                    v-else-if="messageItems.length === 0"
                    class="empty-state"
                  >
                    {{ t("adminPRMessages.emptyMessages") }}
                  </div>
                  <div v-else class="admin-message-list">
                    <article
                      v-for="item in messageItems"
                      :key="item.id"
                      class="admin-message-item"
                    >
                      <div class="section-header section-header--start">
                        <div class="stack stack--tight">
                          <strong class="message-author">
                            {{ resolveMessageAuthor(item) }}
                          </strong>
                          <span class="hint">
                            {{ formatMessageTime(item.createdAt) }}
                            <template v-if="isMessageEdited(item)">
                              ·
                              {{
                                t("adminPRMessages.editedAt", {
                                  time: formatMessageTime(item.updatedAt),
                                })
                              }}
                            </template>
                          </span>
                        </div>

                        <div class="actions actions--inline">
                          <template v-if="editingMessageId === item.id">
                            <PuButton
                              shape="pill"
                              tone="neutral" variant="outline"
                              size="sm"

                              :disabled="
                                prMessagesActions.isPending.update.value ||
                                editingMessageBody.trim().length === 0
                              "
                              @click="handleSaveMessageEdit(item.id)"
                            >
                              {{
                                prMessagesActions.isPending.update.value
                                  ? t("adminPRMessages.messageSaving")
                                  : t("adminPRMessages.saveEditAction")
                              }}
                            </PuButton>
                            <PuButton
                              shape="pill"
                              tone="neutral" variant="ghost"
                              size="sm"

                              :disabled="
                                prMessagesActions.isPending.update.value
                              "
                              @click="cancelEditMessage"
                            >
                              {{ t("common.cancel") }}
                            </PuButton>
                          </template>
                          <template v-else>
                            <PuButton
                              shape="pill"
                              tone="neutral" variant="outline"
                              size="sm"

                              :disabled="
                                prMessagesActions.isPending.delete.value
                              "
                              @click="beginEditMessage(item.id, item.body)"
                            >
                              {{ t("adminPRMessages.editAction") }}
                            </PuButton>
                            <PuButton
                              shape="pill"
                              tone="danger" variant="outline"
                              size="sm"

                              :disabled="
                                prMessagesActions.isPending.delete.value
                              "
                              @click="handleDeleteMessage(item.id)"
                            >
                              {{
                                prMessagesActions.isPending.delete.value
                                  ? t("adminPRMessages.messageDeleting")
                                  : t("adminPRMessages.deleteAction")
                              }}
                            </PuButton>
                          </template>
                        </div>
                      </div>

                      <PuFormItem
                        v-if="editingMessageId === item.id"
                        :label="t('adminPRMessages.messageLabel')"
                        :for-id="`admin-pr-message-${item.id}-edit`"
                      >
                        <PuTextarea
                          :id="`admin-pr-message-${item.id}-edit`"
                          v-model="editingMessageBody"
                          :placeholder="t('adminPRMessages.messagePlaceholder')"
                        />
                      </PuFormItem>
                      <p v-else class="message-body">
                        {{ item.body }}
                      </p>
                    </article>
                  </div>

                  <PuFormItem
                    :label="t('adminPRMessages.messageLabel')"
                    for-id="admin-pr-message-draft"
                  >
                    <PuTextarea
                      id="admin-pr-message-draft"
                      v-model="messageDraftBody"
                      :placeholder="t('adminPRMessages.messagePlaceholder')"
                      :disabled="prMessagesActions.isPending.create.value"
                    />
                  </PuFormItem>

                  <p v-if="messageActionError" class="error-message">
                    {{ messageActionError }}
                  </p>

                  <div class="actions">
                    <PuButton
                      shape="pill"
                      size="sm"

                      :disabled="
                        prMessagesActions.isPending.create.value ||
                        messageDraftBody.trim().length === 0
                      "
                      @click="handleSendPRMessage"
                    >
                      {{
                        prMessagesActions.isPending.create.value
                          ? t("adminPRMessages.messageSending")
                          : t("adminPRMessages.messageAction")
                      }}
                    </PuButton>
                  </div>
                </template>
              </div>
            </BentoItem>
          </BentoLayout>
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import PRFilterRail from "@/domains/admin/ui/pr/components/PRFilterRail.vue";
import { useAdminPRWorkspaceSelection } from "@/domains/admin/use-cases/pr/useAdminPRWorkspaceSelection";
import { useAdminPRMessagesActions } from "@/domains/admin/use-cases/pr/useAdminPRMessagesActions";
import {
  type AdminPRMessagesResponse,
  useAdminPRMessages,
} from "@/domains/admin/queries/useAdminPRManagement";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import {
  PuButton,
  PuCard,
  PuFormItem,
  PuInlineNotice,
  PuLoadingState,
  PuTextarea,
} from "@partner-up-dev/design-web";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const {
  workspaceQuery,
  filters,
  workspace,
  filterLocationOptions,
  selectedPRId,
  selectedPR,
  filteredPRs,
  selectPR,
  formatWindow,
} = useAdminPRWorkspaceSelection({
  enabled: isAdmin,
});
const prMessagesActions = useAdminPRMessagesActions();
const messagesQuery = useAdminPRMessages(selectedPRId);

const messageDraftBody = ref("");
const messageActionError = ref<string | null>(null);
const editingMessageId = ref<number | null>(null);
const editingMessageBody = ref("");

const messageItems = computed(() => messagesQuery.data.value?.items ?? []);

watch([messageDraftBody, editingMessageBody], () => {
  messageActionError.value = null;
});

watch(selectedPR, () => {
  messageDraftBody.value = "";
  messageActionError.value = null;
  editingMessageId.value = null;
  editingMessageBody.value = "";
});

const handleSendPRMessage = async () => {
  if (selectedPRId.value === null) return;

  const body = messageDraftBody.value.trim();
  if (!body) return;

  messageActionError.value = null;
  try {
    await prMessagesActions.createMessage({
      prId: selectedPRId.value,
      body,
    });
    messageDraftBody.value = "";
  } catch (error) {
    messageActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const resolveMessageAuthor = (item: AdminPRMessagesResponse["items"][number]) =>
  item.author.nickname?.trim() || item.author.label;

const formatMessageTime = (iso: string) => formatLocalDateTimeValue(iso) ?? iso;

const isMessageEdited = (item: AdminPRMessagesResponse["items"][number]) =>
  item.updatedAt !== item.createdAt;

const beginEditMessage = (messageId: number, body: string) => {
  editingMessageId.value = messageId;
  editingMessageBody.value = body;
  messageActionError.value = null;
};

const cancelEditMessage = () => {
  editingMessageId.value = null;
  editingMessageBody.value = "";
  messageActionError.value = null;
};

const handleSaveMessageEdit = async (messageId: number) => {
  if (selectedPRId.value === null) return;

  const body = editingMessageBody.value.trim();
  if (!body) return;

  messageActionError.value = null;
  try {
    await prMessagesActions.updateMessage({
      prId: selectedPRId.value,
      messageId,
      body,
    });
    cancelEditMessage();
  } catch (error) {
    messageActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleDeleteMessage = async (messageId: number) => {
  if (selectedPRId.value === null) return;
  if (!window.confirm(t("adminPRMessages.deleteConfirm"))) return;

  messageActionError.value = null;
  try {
    await prMessagesActions.deleteMessage({
      prId: selectedPRId.value,
      messageId,
    });
    if (editingMessageId.value === messageId) {
      cancelEditMessage();
    }
  } catch (error) {
    messageActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};
</script>

<style lang="scss" scoped>
.stack,
.pr-result-list {
  display: flex;
  flex-direction: column;
}

.stack,
.pr-result-list {
  gap: var(--sys-spacing-medium);
}

.pr-workspace-layout {
  width: 100%;
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.empty-state {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.section-header--start {
  align-items: flex-start;
}

.pr-result-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-small);
}

.pr-result-list--scroll {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--sys-spacing-xsmall);
}

.stack--tight {
  gap: var(--sys-spacing-xsmall);
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.actions--inline {
  gap: var(--sys-spacing-xsmall);
  flex-wrap: wrap;
}

.admin-message-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  max-height: 24rem;
  overflow-y: auto;
  padding-right: var(--sys-spacing-xsmall);
}

.admin-message-item {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

.message-author {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface);
}

.message-body {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
