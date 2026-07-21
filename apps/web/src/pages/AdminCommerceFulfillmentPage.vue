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
        <div v-else class="fulfillment-rail-list">
          <PuCard
            v-for="record in fulfillments"
            :key="record.fulfillment.id"
            :active="selectedFulfillmentId === record.fulfillment.id"
            @click="selectedFulfillmentIdRaw = record.fulfillment.id"
            selectable
            variant="outline"
            padding="sm"
            gap="xs"
          >
            <span>{{ record.fulfillment.bookingStatus }}</span>
            <small>{{ record.fulfillment.cancellationHandlingStatus }}</small>
          </PuCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState v-if="workspaceQuery.isLoading.value" :message="t('common.loading')" />
        <PuInlineNotice
          tone="error"
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
        />
        <PuEmptyState
          v-else-if="fulfillments.length === 0"
          :title="t('adminCommerceFulfillment.emptyStateTitle')"
          :description="t('adminCommerceFulfillment.emptyStateDescription')"
          icon="i-mdi-clipboard-check-outline"
          align="start"
        />
        <template v-else-if="selectedRecord">
          <PuInlineNotice
            tone="info"
            title="Rental 履约已停用"
            message="租赁履约运行时已停止，历史记录仅供核对，不再接受确认、取消或入场指引操作。"
            data-testid="admin-fulfillment.rental-retired"
          />
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
                <dt>{{ t("adminCommerceFulfillment.bookingLabel") }}</dt>
                <dd>{{ selectedRecord.fulfillment.bookingStatus }}</dd>
              </div>
              <div>
                <dt>
                  {{ t("adminCommerceFulfillment.cancellationHandlingLabel") }}
                </dt>
                <dd>
                  {{ selectedRecord.fulfillment.cancellationHandlingStatus }}
                </dd>
              </div>
              <div>
                <dt>
                  {{ t("adminCommerceFulfillment.cancellationOutcomeLabel") }}
                </dt>
                <dd>
                  {{ selectedRecord.fulfillment.supplierCancellationOutcome ?? "-" }}
                </dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceFulfillment.billLabel") }}</dt>
                <dd>{{ selectedRecord.bill?.id ?? "-" }}</dd>
              </div>
            </dl>
          </BentoItem>

          <BentoItem :title="t('adminCommerceFulfillment.rawStateTitle')" span="full">
            <pre class="json-pre">{{ prettyJson(selectedRecord.fulfillment) }}</pre>
          </BentoItem>
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
import { useAdminCommerceFulfillmentWorkspace } from "@/domains/admin-commerce/queries/useAdminCommerce";
import { prettyJson } from "@/domains/admin-commerce/editor-json";
import { PuCard, PuEmptyState, PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommerceFulfillmentWorkspace(isAdmin);
const selectedFulfillmentIdRaw = ref("");

const fulfillments = computed(() => workspaceQuery.data.value?.fulfillments ?? []);
const selectedFulfillmentId = computed(() => selectedFulfillmentIdRaw.value || null);
const selectedRecord = computed(
  () =>
    fulfillments.value.find((record) => record.fulfillment.id === selectedFulfillmentId.value) ??
    null,
);


watch(
  fulfillments,
  (nextFulfillments) => {
    if (
      !nextFulfillments.some((record) => record.fulfillment.id === selectedFulfillmentIdRaw.value)
    ) {
      selectedFulfillmentIdRaw.value = nextFulfillments[0]?.fulfillment.id ?? "";
    }
  },
  { immediate: true },
);

</script>

<style lang="scss" scoped>
.stack,
.fulfillment-rail-list {
  display: flex;
  flex-direction: column;
}

.stack,
.fulfillment-rail-list {
  gap: var(--sys-spacing-medium);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
  margin: 0;
}

.summary-grid dt,
.hint,
small {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.summary-grid dd {
  margin: 0;
  @include mx.pu-font(section);
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
