<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommerceFulfillment.fulfillmentsTitle')">
        <div v-if="fulfillments.length === 0" class="hint">
          {{ t("adminCommerceFulfillment.emptyFulfillments") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="record in fulfillments"
            :key="record.fulfillment.id"
            :active="selectedFulfillmentId === record.fulfillment.id"
            @click="selectedFulfillmentIdRaw = record.fulfillment.id"
          >
            <span>{{ record.fulfillment.bookingStatus }}</span>
            <small>{{ record.fulfillment.lifecycleStatus }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <LoadingIndicator
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <ErrorToast
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
          persistent
        />
        <EmptyState
          v-else-if="fulfillments.length === 0"
          :title="t('adminCommerceFulfillment.emptyStateTitle')"
          :description="t('adminCommerceFulfillment.emptyStateDescription')"
          icon="i-mdi-clipboard-check-outline"
          align="start"
        />
        <template v-else-if="selectedRecord">
          <BentoItem :title="t('adminCommerceFulfillment.summaryTitle')" span="full">
            <dl class="summary-grid">
              <div>
                <dt>{{ t("adminCommerceFulfillment.fulfillmentIdLabel") }}</dt>
                <dd>{{ selectedRecord.fulfillment.id }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceFulfillment.orderIdLabel") }}</dt>
                <dd>{{ selectedRecord.order?.id ?? "-" }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceFulfillment.lifecycleLabel") }}</dt>
                <dd>{{ selectedRecord.fulfillment.lifecycleStatus }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceFulfillment.bookingLabel") }}</dt>
                <dd>{{ selectedRecord.fulfillment.bookingStatus }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceFulfillment.prLabel") }}</dt>
                <dd>{{ selectedRecord.attachment ? `PR#${selectedRecord.attachment.prId}` : "-" }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceFulfillment.billLabel") }}</dt>
                <dd>{{ selectedRecord.bill?.id ?? "-" }}</dd>
              </div>
            </dl>
          </BentoItem>

          <BentoItem :title="t('adminCommerceFulfillment.bookingOpsTitle')" span="full">
            <div class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommerceFulfillment.bookingNoteLabel") }}</span>
                <textarea v-model="bookingNote" class="text-area" rows="5"></textarea>
              </label>
              <div class="inline-actions">
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="isConfirming"
                  @click="handleConfirmBooking"
                >
                  {{ isConfirming ? t("adminCommerceFulfillment.processingAction") : t("adminCommerceFulfillment.confirmBookingAction") }}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  :disabled="isRejecting"
                  @click="handleRejectBooking"
                >
                  {{ isRejecting ? t("adminCommerceFulfillment.processingAction") : t("adminCommerceFulfillment.rejectBookingAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem :title="t('adminCommerceFulfillment.entryGuidanceTitle')" span="full">
            <div class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommerceFulfillment.entryPhoneLabel") }}</span>
                <input v-model="entryGuidance.entryByPhone" class="text-input" type="text" />
              </label>
              <label class="field">
                <span class="field-label">{{ t("adminCommerceFulfillment.entryRealNameLabel") }}</span>
                <input v-model="entryGuidance.entryByRealName" class="text-input" type="text" />
              </label>
              <label class="field">
                <span class="field-label">{{ t("adminCommerceFulfillment.entryNoteLabel") }}</span>
                <textarea v-model="entryGuidance.note" class="text-area" rows="5"></textarea>
              </label>
              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingGuidance" @click="handleSaveGuidance">
                  {{ isSavingGuidance ? t("adminCommerceFulfillment.processingAction") : t("adminCommerceFulfillment.saveGuidanceAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem :title="t('adminCommerceFulfillment.rawStateTitle')" span="full">
            <pre class="json-pre">{{ prettyJson(selectedRecord.fulfillment) }}</pre>
          </BentoItem>

          <ErrorToast
            v-if="pageErrorMessage"
            :message="pageErrorMessage"
            @close="clearErrors"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  useAdminCommerceFulfillmentWorkspace,
  useConfirmRentalFulfillmentBooking,
  useRecordRentalFulfillmentEntryGuidance,
  useRejectRentalFulfillmentBooking,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import { prettyJson } from "@/domains/admin-commerce/editor-json";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import EmptyState from "@/shared/ui/feedback/EmptyState.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommerceFulfillmentWorkspace(isAdmin);
const confirmMutation = useConfirmRentalFulfillmentBooking();
const rejectMutation = useRejectRentalFulfillmentBooking();
const guidanceMutation = useRecordRentalFulfillmentEntryGuidance();

const selectedFulfillmentIdRaw = ref("");
const bookingNote = ref("");
const entryGuidance = ref({
  entryByPhone: "",
  entryByRealName: "",
  note: "",
});
const localErrorMessage = ref<string | null>(null);

const fulfillments = computed(() => workspaceQuery.data.value?.fulfillments ?? []);
const selectedFulfillmentId = computed(() => selectedFulfillmentIdRaw.value || null);
const selectedRecord = computed(
  () =>
    fulfillments.value.find(
      (record) => record.fulfillment.id === selectedFulfillmentId.value,
    ) ?? null,
);

const isConfirming = computed(() => confirmMutation.isPending.value);
const isRejecting = computed(() => rejectMutation.isPending.value);
const isSavingGuidance = computed(() => guidanceMutation.isPending.value);

const pageErrorMessage = computed(
  () =>
    localErrorMessage.value ||
    confirmMutation.error.value?.message ||
    rejectMutation.error.value?.message ||
    guidanceMutation.error.value?.message ||
    null,
);

watch(
  fulfillments,
  (nextFulfillments) => {
    if (
      !nextFulfillments.some(
        (record) => record.fulfillment.id === selectedFulfillmentIdRaw.value,
      )
    ) {
      selectedFulfillmentIdRaw.value = nextFulfillments[0]?.fulfillment.id ?? "";
    }
  },
  { immediate: true },
);

watch(
  selectedRecord,
  (record) => {
    bookingNote.value = record?.fulfillment.bookingNote ?? "";
    entryGuidance.value = {
      entryByPhone: record?.fulfillment.entryGuidance?.entryByPhone ?? "",
      entryByRealName: record?.fulfillment.entryGuidance?.entryByRealName ?? "",
      note: record?.fulfillment.entryGuidance?.note ?? "",
    };
  },
  { immediate: true },
);

const handleConfirmBooking = async () => {
  localErrorMessage.value = null;
  try {
    if (!selectedRecord.value) return;
    await confirmMutation.mutateAsync({
      fulfillmentId: selectedRecord.value.fulfillment.id,
      bookingNote: bookingNote.value.trim() || null,
    });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleRejectBooking = async () => {
  localErrorMessage.value = null;
  try {
    if (!selectedRecord.value) return;
    await rejectMutation.mutateAsync({
      fulfillmentId: selectedRecord.value.fulfillment.id,
      bookingNote: bookingNote.value.trim() || null,
    });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleSaveGuidance = async () => {
  localErrorMessage.value = null;
  try {
    if (!selectedRecord.value) return;
    await guidanceMutation.mutateAsync({
      fulfillmentId: selectedRecord.value.fulfillment.id,
      input: {
        entryByPhone: entryGuidance.value.entryByPhone.trim() || null,
        entryByRealName: entryGuidance.value.entryByRealName.trim() || null,
        note: entryGuidance.value.note.trim() || null,
      },
    });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  confirmMutation.reset();
  rejectMutation.reset();
  guidanceMutation.reset();
};
</script>

<style lang="scss" scoped>
.stack,
.selection-list,
.form-stack {
  display: flex;
  flex-direction: column;
}

.stack,
.selection-list {
  gap: var(--sys-spacing-medium);
}

.form-stack {
  gap: var(--sys-spacing-large);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
  margin: 0;
}

.summary-grid dt,
.field-label,
.hint,
small {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.summary-grid dd {
  margin: 0;
  @include mx.pu-font(title-small);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.text-input,
.text-area {
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.json-pre {
  margin: 0;
  padding: var(--sys-spacing-medium);
  overflow: auto;
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  border: 1px solid var(--sys-color-outline-variant);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
