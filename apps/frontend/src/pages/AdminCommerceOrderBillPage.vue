<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommerceOrderBill.ordersTitle')">
        <div v-if="orders.length === 0" class="hint">
          {{ t("adminCommerceOrderBill.emptyOrders") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="record in orders"
            :key="record.order.id"
            :active="selectedOrderId === record.order.id"
            @click="selectedOrderIdRaw = record.order.id"
          >
            <span>{{ record.order.family }} · {{ record.order.status }}</span>
            <small>#{{ record.order.offerId }}</small>
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
          v-else-if="orders.length === 0"
          :title="t('adminCommerceOrderBill.emptyStateTitle')"
          :description="t('adminCommerceOrderBill.emptyStateDescription')"
          icon="i-mdi-receipt-text-outline"
          align="start"
        />
        <template v-else-if="selectedOrderRecord">
          <BentoItem :title="t('adminCommerceOrderBill.orderSummaryTitle')" span="full">
            <dl class="summary-grid">
              <div>
                <dt>{{ t("adminCommerceOrderBill.orderIdLabel") }}</dt>
                <dd>{{ selectedOrderRecord.order.id }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceOrderBill.statusLabel") }}</dt>
                <dd>{{ selectedOrderRecord.order.status }}</dd>
              </div>
              <div>
                <dt>{{ t("adminCommerceOrderBill.offerLabel") }}</dt>
                <dd>#{{ selectedOrderRecord.order.offerId }}</dd>
              </div>
            </dl>
          </BentoItem>

          <BentoItem :title="t('adminCommerceOrderBill.participantsTitle')" span="full">
            <pre class="json-pre">{{ prettyJson(selectedOrderRecord.order.participants) }}</pre>
          </BentoItem>

          <BentoItem :title="t('adminCommerceOrderBill.terminationAttemptsTitle')" span="full">
            <pre class="json-pre">{{ prettyJson(selectedOrderRecord.order.terminationAttempts) }}</pre>
          </BentoItem>

          <BentoItem :title="t('adminCommerceOrderBill.billTitle')" span="full">
            <div v-if="selectedOrderRecord.bill === null" class="hint">
              {{ t("adminCommerceOrderBill.emptyBill") }}
            </div>
            <template v-else>
              <dl class="summary-grid">
                <div>
                  <dt>{{ t("adminCommerceOrderBill.billIdLabel") }}</dt>
                  <dd>{{ selectedOrderRecord.bill.id }}</dd>
                </div>
                <div>
                  <dt>{{ t("adminCommerceOrderBill.billStatusLabel") }}</dt>
                  <dd>{{ selectedOrderRecord.bill.status }}</dd>
                </div>
                <div>
                  <dt>{{ t("adminCommerceOrderBill.effectiveTotalLabel") }}</dt>
                  <dd>{{ effectiveTotalFen }}</dd>
                </div>
              </dl>

              <pre class="json-pre">{{ prettyJson(selectedOrderRecord.billLines) }}</pre>
            </template>
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
import { useAdminCommerceOrderBillWorkspace } from "@/domains/admin-commerce/queries/useAdminCommerce";
import { prettyJson } from "@/domains/admin-commerce/editor-json";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import EmptyState from "@/shared/ui/feedback/EmptyState.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommerceOrderBillWorkspace(isAdmin);
const selectedOrderIdRaw = ref("");

const orders = computed(() => workspaceQuery.data.value?.orders ?? []);
const selectedOrderId = computed(() => selectedOrderIdRaw.value || null);
const selectedOrderRecord = computed(
  () => orders.value.find((record) => record.order.id === selectedOrderId.value) ?? null,
);

const effectiveTotalFen = computed(() => {
  if (!selectedOrderRecord.value) return 0;
  return selectedOrderRecord.value.billLines.reduce((sum, line) => {
    return sum + (line.kind === "CHARGE" ? line.amountFen : -line.amountFen);
  }, 0);
});

watch(
  orders,
  (nextOrders) => {
    if (!nextOrders.some((record) => record.order.id === selectedOrderIdRaw.value)) {
      selectedOrderIdRaw.value = nextOrders[0]?.order.id ?? "";
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.stack,
.selection-list {
  display: flex;
  flex-direction: column;
}

.stack,
.selection-list {
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
