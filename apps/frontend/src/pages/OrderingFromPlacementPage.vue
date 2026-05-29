<template>
  <FullScreenPageScaffold class="ordering-page" data-testid="ordering.rental.page">
    <template #header>
      <PageHeader
        title="确认预订"
        subtitle="确认场地、时间、人数和登记信息后创建订单"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <div class="ordering-page__body">
      <InlineNotice
        v-if="missingInput"
        tone="error"
        title="入口无效"
        message="缺少创建订单所需的入口参数。"
      />

      <InlineNotice
        v-else-if="orderingQuery.isError.value"
        tone="error"
        title="无法加载预订信息"
        :message="orderingErrorMessage"
      />

      <div v-else-if="orderingQuery.isPending.value" class="ordering-page__loading">
        正在加载可预订内容...
      </div>

      <template v-else-if="ordering">
        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">场地服务</p>
            <h2 data-testid="ordering.rental.product-name">
              {{ primarySpu?.name ?? "可预订场地" }}
            </h2>
          </div>

          <ul
            v-if="primarySpu?.sellingPoints.length"
            class="ordering-page__selling-points"
          >
            <li
              v-for="point in primarySpu.sellingPoints"
              :key="point"
            >
              {{ point }}
            </li>
          </ul>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">已从 PR 锁定</p>
            <h2>服务时间与人数</h2>
          </div>

          <div class="ordering-page__facts">
            <div>
              <span>人数</span>
              <strong data-testid="ordering.rental.participant-count">
                {{ participantCount }} 人
              </strong>
            </div>
            <div>
              <span>开始</span>
              <strong data-testid="ordering.rental.service-start">
                {{ formatDateTime(serviceStartAt) }}
              </strong>
            </div>
            <div>
              <span>结束</span>
              <strong data-testid="ordering.rental.service-end">
                {{ formatDateTime(serviceEndAt) }}
              </strong>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">选择 SKU</p>
            <h2>可预订规格</h2>
          </div>

          <div class="ordering-page__sku-list">
            <ChoiceCard
              v-for="sku in selectableSkus"
              :key="sku.skuId"
              :active="sku.skuId === selectedSkuId"
              :disabled="!sku.selectable"
              data-testid="ordering.rental.sku-option"
              @click="selectedSkuId = sku.skuId"
            >
              <div class="ordering-page__sku-card">
                <div>
                  <strong>{{ sku.name }}</strong>
                  <span>
                    {{ sku.facts.participantCount }} 人 ·
                    {{ Math.round(sku.facts.durationMinutes / 60) }} 小时
                  </span>
                </div>
                <b>{{ formatFen(sku.pricingModel.amountFen) }}</b>
              </div>
            </ChoiceCard>
          </div>

          <div class="ordering-page__policy" data-testid="ordering.rental.cancellation-policy">
            <strong>取消政策</strong>
            <p v-if="selectedCancellationSummary.length === 0">
              暂无可展示的取消政策。
            </p>
            <p
              v-for="summary in selectedCancellationSummary"
              :key="`${summary.visibleLabel}-${summary.refundPercent}`"
            >
              {{ summary.visibleLabel }} · 退款 {{ summary.refundPercent }}%
              <span v-if="summary.requiresOperatorHandling"> · 需人工处理</span>
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard gap="md">
          <div class="ordering-page__section-heading">
            <p class="ordering-page__eyebrow">登记信息</p>
            <h2>联系人与入场人</h2>
          </div>

          <FormField
            label="联系人电话"
            for-id="rental-contact-phone"
            required
          >
            <input
              id="rental-contact-phone"
              v-model.trim="contactPhone"
              class="ordering-page__input"
              inputmode="tel"
              autocomplete="tel"
              data-testid="ordering.rental.contact-phone"
              placeholder="请输入联系人手机号"
            />
          </FormField>

          <div class="ordering-page__registrants">
            <FormField
              v-for="(_, index) in registrantNames"
              :key="index"
              :label="`入场人 ${index + 1}`"
              :for-id="`rental-registrant-${index}`"
              required
            >
              <input
                :id="`rental-registrant-${index}`"
                v-model.trim="registrantNames[index]"
                class="ordering-page__input"
                autocomplete="name"
                :data-testid="`ordering.rental.registrant-name.${index}`"
                placeholder="请输入真实姓名"
              />
            </FormField>
          </div>
        </SurfaceCard>

        <SurfaceCard
          v-if="primarySpu?.noticeBlocks.length"
          gap="sm"
          tone="outline"
        >
          <div
            v-for="notice in primarySpu.noticeBlocks"
            :key="notice.title"
            class="ordering-page__notice-block"
          >
            <strong>{{ notice.title }}</strong>
            <p>{{ notice.content }}</p>
          </div>
        </SurfaceCard>
      </template>
    </div>

    <template #footer>
      <div class="ordering-page__bottom-bar">
        <div>
          <span>预估应付</span>
          <strong data-testid="ordering.rental.price">
            {{ formatFen(pricePreviewFen) }}
          </strong>
          <button
            type="button"
            class="ordering-page__text-button"
            data-testid="ordering.rental.price-detail.toggle"
            @click="priceDetailOpen = !priceDetailOpen"
          >
            {{ priceDetailOpen ? "收起价格明细" : "查看价格明细" }}
          </button>
        </div>
        <Button
          size="lg"
          :disabled="!canCreate"
          :loading="createOrderMutation.isPending.value"
          data-testid="ordering.rental.create-order"
          @click="submitOrder"
        >
          创建订单
        </Button>
      </div>

      <InlineNotice
        v-if="availabilityMessage"
        class="ordering-page__footer-notice"
        tone="warning"
        :message="availabilityMessage"
      />
      <InlineNotice
        v-if="createOrderMutation.isError.value"
        class="ordering-page__footer-notice"
        tone="error"
        :message="createOrderErrorMessage"
      />
      <div
        v-if="priceDetailOpen"
        class="ordering-page__price-detail"
        data-testid="ordering.rental.price-detail"
      >
        <div
          v-for="explanation in priceExplanations"
          :key="explanation.sourceId"
        >
          <span>{{ explanation.label }}</span>
          <small>{{ explanation.description }}</small>
          <strong>{{ formatFen(explanation.resultAmountFen ?? explanation.deltaFen) }}</strong>
        </div>
      </div>
    </template>
  </FullScreenPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import FullScreenPageScaffold from "@/shared/ui/layout/FullScreenPageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import Button from "@/shared/ui/actions/Button.vue";
import {
  useCreateRentalOrder,
  useEvaluateRentalOrdering,
  useRentalOrderingFromPlacement,
  type RentalOrderCreateInput,
  type RentalOrderingResponse,
} from "@/domains/commerce/queries/useCommerce";

type RentalSpu = RentalOrderingResponse["spus"][number];
type RentalSku = RentalSpu["skuOptions"][number];

const route = useRoute();
const router = useRouter();

const parsePositiveQueryInt = (
  value: LocationQueryValue | LocationQueryValue[],
): number | null => {
  if (Array.isArray(value)) return parsePositiveQueryInt(value[0] ?? null);
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const placementInstanceId = computed(() =>
  parsePositiveQueryInt(route.query.placementInstanceId),
);
const contextId = computed(() => parsePositiveQueryInt(route.query.contextId));
const missingInput = computed(
  () => placementInstanceId.value === null || contextId.value === null,
);

const orderingQuery = useRentalOrderingFromPlacement(
  placementInstanceId,
  contextId,
);
const evaluateMutation = useEvaluateRentalOrdering();
const createOrderMutation = useCreateRentalOrder();

const ordering = computed(() => orderingQuery.data.value ?? null);
const selectedSkuId = ref<number | null>(null);
const contactPhone = ref("");
const registrantNames = ref<string[]>([]);
const priceDetailOpen = ref(false);

const allSkus = computed<RentalSku[]>(() =>
  ordering.value?.spus.flatMap((spu) => spu.skuOptions) ?? [],
);

const selectableSkus = computed<RentalSku[]>(() =>
  allSkus.value.filter((sku) => sku.selectable),
);

const selectedSku = computed<RentalSku | null>(() => {
  if (selectedSkuId.value === null) return null;
  return allSkus.value.find((sku) => sku.skuId === selectedSkuId.value) ?? null;
});

const selectedSpu = computed<RentalSpu | null>(() => {
  if (selectedSkuId.value === null || !ordering.value) return null;
  return (
    ordering.value.spus.find((spu) =>
      spu.skuOptions.some((sku) => sku.skuId === selectedSkuId.value),
    ) ?? null
  );
});

const primarySpu = computed(() => selectedSpu.value ?? ordering.value?.spus[0] ?? null);

const fieldValue = (key: string): unknown | null =>
  ordering.value?.input.fields.find((field) => field.key === key)?.value ?? null;

const participantCount = computed(() => {
  const value = fieldValue("participantCount");
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
});

const serviceStartAt = computed(() => {
  const value = fieldValue("serviceStartAt");
  return typeof value === "string" ? value : null;
});

const serviceEndAt = computed(() => {
  const value = fieldValue("serviceEndAt");
  return typeof value === "string" ? value : null;
});

const orderInput = computed<RentalOrderCreateInput | null>(() => {
  if (!ordering.value || !selectedSpu.value || !selectedSku.value) return null;
  if (!serviceStartAt.value || !serviceEndAt.value) return null;
  const phone = contactPhone.value.trim();
  const names = registrantNames.value.map((name) => name.trim());
  if (!phone || names.length !== participantCount.value || names.some((name) => !name)) {
    return null;
  }

  return {
    placementInstanceId: ordering.value.source.placementInstanceId,
    context: ordering.value.source.context,
    items: [
      {
        spuId: selectedSpu.value.spuId,
        skuId: selectedSku.value.skuId,
        quantity: 1,
      },
    ],
    request: {
      serviceStartAt: serviceStartAt.value,
      serviceEndAt: serviceEndAt.value,
      contactPhone: phone,
      registrants: names.map((fullName) => ({ fullName })),
    },
  };
});

const availability = computed(
  () => evaluateMutation.data.value?.availability ?? null,
);

const availabilityMessage = computed(() => {
  if (!orderInput.value) return "请先补全联系人与入场人信息。";
  if (evaluateMutation.isPending.value) return "正在确认库存与价格...";
  return availability.value?.disabledReason ?? null;
});

const canCreate = computed(
  () =>
    !!orderInput.value &&
    !evaluateMutation.isPending.value &&
    availability.value?.createOrderEnabled === true,
);

const pricePreviewFen = computed(
  () =>
    evaluateMutation.data.value?.pricePreview.amountFen ??
    selectedSku.value?.pricingModel.amountFen ??
    null,
);

const priceExplanations = computed(
  () => evaluateMutation.data.value?.pricePreview.explanations ?? [],
);

const selectedCancellationSummary = computed(
  () => selectedSku.value?.cancellationPolicySummary ?? [],
);

const orderingErrorMessage = computed(() =>
  orderingQuery.error.value instanceof Error
    ? orderingQuery.error.value.message
    : "加载预订信息失败。",
);

const createOrderErrorMessage = computed(() =>
  createOrderMutation.error.value instanceof Error
    ? createOrderMutation.error.value.message
    : "创建订单失败。",
);

const backFallbackTo = computed(() =>
  contextId.value ? { path: `/pr/${contextId.value}` } : { path: "/" },
);

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "未确定";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

watch(
  ordering,
  (next) => {
    if (!next) return;
    const defaultSku =
      next.spus
        .flatMap((spu) => spu.skuOptions)
        .find((sku) => sku.selected && sku.selectable) ??
      next.spus.flatMap((spu) => spu.skuOptions).find((sku) => sku.selectable) ??
      null;
    selectedSkuId.value = defaultSku?.skuId ?? null;
  },
  { immediate: true },
);

watch(
  participantCount,
  (next) => {
    const normalizedCount = Number.isFinite(next) && next > 0 ? next : 0;
    registrantNames.value = Array.from(
      { length: normalizedCount },
      (_, index) => registrantNames.value[index] ?? "",
    );
  },
  { immediate: true },
);

watch(
  orderInput,
  (next) => {
    if (!next) return;
    evaluateMutation.mutate(next);
  },
  { deep: true },
);

const submitOrder = async (): Promise<void> => {
  if (!orderInput.value) return;
  const result = await createOrderMutation.mutateAsync(orderInput.value);
  await router.push({ path: `/orders/${result.orderId}` });
};
</script>

<style scoped lang="scss">
.ordering-page {
  min-width: 0;
  --pu-page-max-width: 44rem;
}

.ordering-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sys-spacing-medium);
}

.ordering-page__loading {
  color: var(--sys-color-on-surface-variant);
}

.ordering-page__section-heading {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
  }
}

.ordering-page__eyebrow {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ordering-page__selling-points {
  display: grid;
  gap: var(--sys-spacing-xsmall);
  margin: 0;
  padding-left: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
}

.ordering-page__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sys-spacing-small);

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
    min-width: 0;
    padding: var(--sys-spacing-small);
    border-radius: var(--sys-radius-small);
    background: var(--sys-color-surface-container-high);
  }

  span {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface);
  }
}

.ordering-page__sku-list,
.ordering-page__registrants {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ordering-page__policy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.ordering-page__sku-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  width: 100%;

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
  }

  span {
    color: var(--sys-color-on-surface-variant);
  }

  b {
    color: var(--sys-color-primary);
    white-space: nowrap;
  }
}

.ordering-page__input {
  width: 100%;
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  padding: 0 var(--sys-spacing-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ordering-page__notice-block {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.ordering-page__bottom-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
  align-items: center;
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-large) var(--sys-radius-large) 0 0;
  background: var(--sys-color-surface-container-high);

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
  }

  span {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
  }
}

.ordering-page__text-button {
  width: fit-content;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--sys-color-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ordering-page__footer-notice {
  margin: 0 var(--sys-spacing-medium) var(--sys-spacing-small);
}

.ordering-page__price-detail {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  margin: 0 var(--sys-spacing-medium) var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);

  div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--sys-spacing-xsmall) var(--sys-spacing-medium);
  }

  small {
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    grid-row: span 2;
    align-self: center;
    color: var(--sys-color-on-surface);
  }
}


@media (max-width: 42rem) {
  .ordering-page__facts {
    grid-template-columns: 1fr;
  }

  .ordering-page__bottom-bar {
    grid-template-columns: 1fr;
  }
}
</style>
