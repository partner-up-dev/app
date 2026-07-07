<template>
  <AdminPageScaffold class="page" data-testid="admin-ride-hailing-orders.page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel title="网约车订单">
        <div v-if="orders.length === 0" class="hint">暂无网约车订单</div>
        <div v-else class="order-rail-list">
          <PuCard
            v-for="record in orders"
            :key="record.order.id"
            :active="selectedOrderId === record.order.id"
            data-testid="admin-ride-hailing-orders.order-card"
            @click="selectedOrderIdRaw = record.order.id"
            selectable
            variant="outline"
            padding="sm"
            gap="xs"
          >
            <div class="order-rail-card__header">
              <strong>{{ routeTitle(record) }}</strong>
              <PuTag
                :text="executionPhaseLabel(record.rideHailingOrder.executionPhase)"
                :tone="executionPhaseTone(record.rideHailingOrder.executionPhase)"
                variant="outline"
                shape="rect"
                size="xs"
              />
            </div>
            <small>{{ record.order.id }}</small>
            <small>
              {{ orderStatusLabel(record.order.status) }} / {{ providerLabel(record) }}
            </small>
          </PuCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <PuInlineNotice
          v-else-if="workspaceQuery.error.value"
          tone="error"
          :message="workspaceQuery.error.value.message"
        />
        <PuEmptyState
          v-else-if="orders.length === 0"
          title="暂无网约车订单"
          description="当前还没有可供运营查看的网约车订单记录。"
          icon="i-mdi-car-clock"
          align="start"
        />
        <template v-else-if="selectedRecord">
          <BentoItem title="订单概览" span="full">
            <dl class="summary-grid">
              <div>
                <dt>Order ID</dt>
                <dd>{{ selectedRecord.order.id }}</dd>
              </div>
              <div>
                <dt>订单状态</dt>
                <dd>{{ orderStatusLabel(selectedRecord.order.status) }}</dd>
              </div>
              <div>
                <dt>执行阶段</dt>
                <dd>
                  {{
                    executionPhaseLabel(
                      selectedRecord.rideHailingOrder.executionPhase,
                    )
                  }}
                </dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{{ providerLabel(selectedRecord) }}</dd>
              </div>
              <div>
                <dt>Provider Order ID</dt>
                <dd>{{ selectedRecord.providerBinding?.providerOrderId ?? "-" }}</dd>
              </div>
              <div>
                <dt>Bill</dt>
                <dd>
                  {{
                    selectedRecord.bill
                      ? `${selectedRecord.bill.id} / ${selectedRecord.bill.status}`
                      : "-"
                  }}
                </dd>
              </div>
              <div>
                <dt>Created At</dt>
                <dd>{{ formatTimestamp(selectedRecord.order.createdAt) }}</dd>
              </div>
              <div>
                <dt>Updated At</dt>
                <dd>
                  {{ formatTimestamp(selectedRecord.rideHailingOrder.updatedAt) }}
                </dd>
              </div>
            </dl>
          </BentoItem>

          <BentoItem title="路线" span="full">
            <dl class="summary-grid">
              <div>
                <dt>出发地</dt>
                <dd>{{ selectedRecord.rideHailingOrder.routeSnapshot.origin.name }}</dd>
              </div>
              <div>
                <dt>目的地</dt>
                <dd>
                  {{ selectedRecord.rideHailingOrder.routeSnapshot.destination.name }}
                </dd>
              </div>
              <div>
                <dt>途经点</dt>
                <dd>
                  {{ selectedRecord.rideHailingOrder.routeSnapshot.waypoints.length }}
                </dd>
              </div>
              <div>
                <dt>预估里程</dt>
                <dd>{{ routeDistanceLabel(selectedRecord) }}</dd>
              </div>
              <div>
                <dt>预估时长</dt>
                <dd>{{ routeDurationLabel(selectedRecord) }}</dd>
              </div>
              <div>
                <dt>出发时间</dt>
                <dd>
                  {{
                    selectedRecord.rideHailingOrder.departureAt
                      ? formatTimestamp(selectedRecord.rideHailingOrder.departureAt)
                      : "-"
                  }}
                </dd>
              </div>
            </dl>
          </BentoItem>

          <BentoItem title="乘车人" span="full">
            <div class="rider-list">
              <div
                v-for="rider in selectedRecord.rideHailingOrder.riders"
                :key="rider.userId"
                class="rider-row"
              >
                <div>
                  <strong>{{ rider.displayName }}</strong>
                  <small>{{ rider.phoneMasked ?? "暂无手机号" }}</small>
                </div>
              </div>
            </div>
          </BentoItem>

          <BentoItem title="取消订单" span="full">
            <div class="form-stack">
              <PuInlineNotice
                tone="info"
                title="运营取消边界"
                message="当前 Admin 取消沿用用户侧可取消阶段，仅支持派单中、已接单、已到达上车点的网约车订单。"
              />
              <PuInlineNotice
                v-if="cancelSuccessMessage"
                tone="success"
                :message="cancelSuccessMessage"
              />
              <PuInlineNotice
                v-if="cancellationBlockedMessage"
                tone="warning"
                :message="cancellationBlockedMessage"
              />
              <div class="inline-actions">
                <PuButton
                  tone="danger"
                  variant="outline"
                  size="sm"
                  :disabled="!canCancelSelectedOrder"
                  data-testid="admin-ride-hailing-orders.cancel.open"
                  @click="openCancelConfirm"
                >
                  取消订单
                </PuButton>
              </div>
            </div>
          </BentoItem>

          <BentoItem title="原始状态" span="full">
            <pre class="json-pre">{{ prettyJson(selectedRecord) }}</pre>
          </BentoItem>

          <PuInlineNotice
            v-if="pageErrorMessage"
            tone="error"
            dismissible
            :message="pageErrorMessage"
            @close="clearMessages"
          />

          <PuDialog
            :open="showCancelConfirmDialog"
            title="确认取消网约车订单"
            description="取消后会向服务商发起撤单，并将本地订单状态推进到已取消。确认继续？"
            cancel-text="先不取消"
            :confirm-text="cancelMutation.isPending.value ? '取消中' : '确认取消'"
            tone="error"
            :confirm-loading="cancelMutation.isPending.value"
            @close="showCancelConfirmDialog = false"
            @cancel="showCancelConfirmDialog = false"
            @confirm="confirmCancelOrder"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuCard,
  PuDialog,
  PuEmptyState,
  PuInlineNotice,
  PuLoadingState,
  PuTag,
} from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  useAdminRideHailingOrderWorkspace,
  useCancelAdminRideHailingOrder,
  type AdminRideHailingOrderWorkspaceResponse,
} from "@/domains/admin-ride-hailing/queries/useAdminRideHailing";

const cancellableExecutionPhases = new Set([
  "DISPATCHING",
  "ACCEPTED",
  "ARRIVED_AT_PICKUP",
]);

type OrderRecord =
  AdminRideHailingOrderWorkspaceResponse["orders"][number];

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminRideHailingOrderWorkspace(isAdmin);
const cancelMutation = useCancelAdminRideHailingOrder();

const selectedOrderIdRaw = ref("");
const localErrorMessage = ref<string | null>(null);
const cancelSuccessMessage = ref<string | null>(null);
const showCancelConfirmDialog = ref(false);

const orders = computed(() => workspaceQuery.data.value?.orders ?? []);
const selectedOrderId = computed(
  () => selectedOrderIdRaw.value || orders.value[0]?.order.id || "",
);
const selectedRecord = computed(
  () =>
    orders.value.find((record) => record.order.id === selectedOrderId.value) ??
    null,
);

const canCancelSelectedOrder = computed(() => {
  if (!selectedRecord.value) return false;
  return (
    selectedRecord.value.order.status === "OPEN" &&
    cancellableExecutionPhases.has(
      selectedRecord.value.rideHailingOrder.executionPhase,
    )
  );
});

const cancellationBlockedMessage = computed(() => {
  if (!selectedRecord.value) return null;
  if (selectedRecord.value.order.status !== "OPEN") {
    return "当前订单状态不是 OPEN，不能取消。";
  }
  if (
    !cancellableExecutionPhases.has(
      selectedRecord.value.rideHailingOrder.executionPhase,
    )
  ) {
    return "当前执行阶段不支持取消。";
  }
  return null;
});

const pageErrorMessage = computed(
  () =>
    localErrorMessage.value || cancelMutation.error.value?.message || null,
);

const routeTitle = (record: OrderRecord): string =>
  `${record.rideHailingOrder.routeSnapshot.origin.name} → ${record.rideHailingOrder.routeSnapshot.destination.name}`;

const providerLabel = (record: OrderRecord): string =>
  record.providerInstance
    ? `${record.providerInstance.displayName} / ${record.providerInstance.instanceKey}`
    : "-";

const orderStatusLabel = (status: OrderRecord["order"]["status"]): string => {
  if (status === "INITIATING") return "初始化中";
  if (status === "OPEN") return "进行中";
  if (status === "CANCELLED") return "已取消";
  if (status === "FAILED") return "失败";
  if (status === "EXPIRED") return "已过期";
  return "已完成";
};

const executionPhaseLabel = (
  phase: OrderRecord["rideHailingOrder"]["executionPhase"],
): string => {
  if (phase === "INITIATING") return "初始化中";
  if (phase === "DISPATCHING") return "派单中";
  if (phase === "ACCEPTED") return "已接单";
  if (phase === "ARRIVED_AT_PICKUP") return "已到达上车点";
  if (phase === "IN_TRIP") return "行程中";
  if (phase === "FINISHED") return "已完成";
  if (phase === "CANCELLED") return "已取消";
  return "失败";
};

const executionPhaseTone = (
  phase: OrderRecord["rideHailingOrder"]["executionPhase"],
): "neutral" | "primary" | "danger" => {
  if (phase === "FAILED") return "danger";
  if (phase === "CANCELLED" || phase === "FINISHED") return "neutral";
  return "primary";
};

const formatTimestamp = (value: Date | string): string =>
  new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatCurrencyFen = (amountFen: number): string =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);

const routeDistanceLabel = (record: OrderRecord): string => {
  const meters =
    record.rideHailingOrder.routeSnapshot.drivingPlan?.distanceMeters ?? null;
  if (meters === null) return "-";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
};

const routeDurationLabel = (record: OrderRecord): string => {
  const seconds =
    record.rideHailingOrder.routeSnapshot.drivingPlan?.durationSeconds ?? null;
  if (seconds === null) return "-";
  const minutes = Math.round(seconds / 60);
  return `${minutes} 分钟`;
};

const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const clearMessages = (): void => {
  localErrorMessage.value = null;
  cancelSuccessMessage.value = null;
};

const openCancelConfirm = (): void => {
  clearMessages();
  if (!canCancelSelectedOrder.value) return;
  showCancelConfirmDialog.value = true;
};

const confirmCancelOrder = async (): Promise<void> => {
  if (!selectedRecord.value || !canCancelSelectedOrder.value) return;
  clearMessages();
  try {
    const result = await cancelMutation.mutateAsync({
      orderId: selectedRecord.value.order.id,
    });
    cancelSuccessMessage.value =
      result.effectAmountFen > 0
        ? `取消成功，产生取消费 ${formatCurrencyFen(result.effectAmountFen)}。`
        : "取消成功。";
    showCancelConfirmDialog.value = false;
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : "取消网约车订单失败";
  }
};

watch(
  orders,
  (nextOrders) => {
    if (!nextOrders.some((record) => record.order.id === selectedOrderIdRaw.value)) {
      selectedOrderIdRaw.value = nextOrders[0]?.order.id ?? "";
    }
  },
  { immediate: true },
);

watch(selectedOrderId, () => {
  clearMessages();
  showCancelConfirmDialog.value = false;
});
</script>

<style lang="scss" scoped>
.stack,
.order-rail-list,
.rider-list,
.form-stack {
  display: flex;
  flex-direction: column;
}

.stack,
.order-rail-list,
.rider-list,
.form-stack {
  gap: var(--sys-spacing-medium);
}

.order-rail-card__header,
.inline-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
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
  word-break: break-word;
}

.rider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface);
}

.rider-row strong,
.order-rail-card__header strong {
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

  .order-rail-card__header,
  .inline-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
