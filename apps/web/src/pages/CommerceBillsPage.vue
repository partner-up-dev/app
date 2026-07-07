<template>
  <PuPageScaffold
    viewport="screen"
    class="commerce-bills-page"
    data-testid="my-bills.page"
  >
    <template #pageHeader>
      <PuHeader
        title="我的账单"
        title-as="h1"
      >
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            aria-label="返回上一页"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <div class="commerce-bills-page__body">
      <PuInlineNotice
        v-if="showOrderingBlockNotice"
        tone="info"
        title="这里只显示你的账单"
        message="如果当前没有需要支付的账单，说明这次下单拦截可能来自其他参与者，请让对方先完成支付后再下单。"
        data-testid="my-bills.ordering-block.notice"
      />

      <PuInlineNotice
        v-if="viewerBillListQuery.isError.value"
        tone="error"
        title="无法加载账单列表"
        :message="viewerBillListErrorMessage"
      />

      <PuLoadingState
        v-else-if="viewerBillListQuery.isPending.value"
        title="正在加载账单"
        message="请稍候。"
        variant="soft"
        surface-level="section"
      />

      <PuEmptyState
        v-else-if="billIds.length === 0"
        title="还没有你的账单"
        :description="emptyDescription"
        variant="soft"
        surface-level="section"
        data-testid="my-bills.empty"
      />

      <section
        v-else
        class="commerce-bills-page__list"
        data-testid="my-bills.list"
      >
        <div
          v-for="billId in billIds"
          :key="billId"
          class="commerce-bills-page__item"
          data-testid="my-bills.item"
        >
          <BillCard :bill-id="billId" />
        </div>
      </section>
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuEmptyState,
  PuHeader,
  PuInlineNotice,
  PuLoadingState,
  PuPageScaffold,
} from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useViewerBillList } from "@/domains/commerce/queries/useCommerce";
import BillCard from "@/domains/commerce/ui/order-detail/BillCard.vue";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";

const ORDERING_BLOCK_SOURCE = "ordering-blocked-unpaid";

const route = useRoute();
const viewerBillListQuery = useViewerBillList();

const orderingBlockSource = computed(() =>
  route.query.source === ORDERING_BLOCK_SOURCE ? ORDERING_BLOCK_SOURCE : null,
);
const showOrderingBlockNotice = computed(() => orderingBlockSource.value !== null);
const billIds = computed(() => viewerBillListQuery.data.value?.billIds ?? []);
const viewerBillListErrorMessage = computed(() =>
  viewerBillListQuery.error.value instanceof Error
    ? viewerBillListQuery.error.value.message
    : "请稍后重试。",
);
const emptyDescription = computed(() =>
  orderingBlockSource.value === ORDERING_BLOCK_SOURCE
    ? "你当前没有可处理的账单；如果下单仍被拦截，请让存在未支付订单的参与者先完成支付。"
    : "当你参与的订单生成账单后，会显示在这里。",
);
const backFallbackTo = computed(() =>
  orderingBlockSource.value === ORDERING_BLOCK_SOURCE ? { path: "/order/new" } : { path: "/me" },
);
const { handleBack } = useFallbackBack(backFallbackTo);
</script>

<style scoped lang="scss">
.commerce-bills-page {
  min-width: 0;
  --pu-page-max-width: 44rem;
}

.commerce-bills-page__body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.commerce-bills-page__list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.commerce-bills-page__item {
  min-width: 0;
}
</style>
