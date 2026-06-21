<template>
  <template v-if="rentalOffer">
    <div class="rental-ordering-form">
      <SpuCard
        :title="primarySpu?.name ?? '可预订场地'"
        :description="spuDescription"
        :thumbnail-src="spuThumbnailSrc"
        data-testid="ordering.rental.product-summary"
      />

      <div class="rental-ordering-form__service">
        <div>
          <span>服务时间</span>
          <strong>
            <span data-testid="ordering.rental.service-start">
              {{ formatDateTime(serviceStartAt) }}
            </span>
            <span aria-hidden="true"> - </span>
            <span data-testid="ordering.rental.service-end">
              {{ formatDateTime(serviceEndAt) }}
            </span>
          </strong>
        </div>
        <div>
          <span>人数</span>
          <strong data-testid="ordering.rental.participant-count">
            {{ participantCount }} 人
          </strong>
        </div>
      </div>

      <ul
        v-if="primarySpu?.presentation.sellingPoints.length"
        class="rental-ordering-form__selling-points"
      >
        <li
          v-for="point in primarySpu.presentation.sellingPoints"
          :key="point"
        >
          {{ point }}
        </li>
      </ul>

      <div class="rental-ordering-form__section">
        <h2>商品配置</h2>
        <div class="rental-ordering-form__sku-list">
          <button
            v-for="sku in selectableSkus"
            :key="sku.skuId"
            type="button"
            class="rental-ordering-form__sku-row"
            :class="{ 'is-selected': sku.skuId === selectedSkuId }"
            data-testid="ordering.rental.sku-option"
            @click="selectedSkuId = sku.skuId"
          >
            <span class="rental-ordering-form__sku-check">
              <span
                v-if="sku.skuId === selectedSkuId"
                class="i-mdi-check"
                aria-hidden="true"
              ></span>
            </span>
            <span class="rental-ordering-form__sku-summary">
              <strong>{{ sku.name }}</strong>
              <small>
                {{ rentalSkuParticipantCount(sku) }} 人 ·
                {{ Math.round(rentalSkuDurationMinutes(sku) / 60) }} 小时
              </small>
            </span>
            <b>{{ formatFen(rentalSkuAmountFen(sku)) }}</b>
          </button>
        </div>
      </div>

      <div class="rental-ordering-form__section">
        <h2>联系方式</h2>
        <PuFormItem
          label="联系人电话"
          for-id="rental-contact-phone"
          required
        >
          <input
            id="rental-contact-phone"
            v-model.trim="contactPhone"
            class="rental-ordering-form__input"
            inputmode="tel"
            autocomplete="tel"
            data-testid="ordering.rental.contact-phone"
            placeholder="请输入联系人手机号"
          />
        </PuFormItem>
      </div>

      <div class="rental-ordering-form__section">
        <h2>参与者身份信息</h2>
        <div class="rental-ordering-form__registrants">
          <PuFormItem
            v-for="(_, index) in registrantNames"
            :key="index"
            :label="`入场人 ${index + 1}`"
            :for-id="`rental-registrant-${index}`"
            required
          >
            <input
              :id="`rental-registrant-${index}`"
              v-model.trim="registrantNames[index]"
              class="rental-ordering-form__input"
              autocomplete="name"
              :data-testid="`ordering.rental.registrant-name.${index}`"
              placeholder="请输入真实姓名"
            />
          </PuFormItem>
        </div>
      </div>

      <div class="rental-ordering-form__section rental-ordering-form__section--subtle">
        <div
          class="rental-ordering-form__policy"
          data-testid="ordering.rental.cancellation-policy"
        >
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

        <div
          v-for="notice in primarySpu?.presentation.noticeBlocks ?? []"
          :key="notice.title"
          class="rental-ordering-form__notice-block"
        >
          <strong>{{ notice.title }}</strong>
          <p>{{ notice.content }}</p>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import SpuCard from "./SpuCard.vue";
import { PuFormItem } from "@partner-up-dev/design-web";
import type {
  OrderingContentInput,
  OrderingContentOutput,
  OrderingContentSummary,
} from "@/domains/commerce/model/ordering-content";
import {
  readBindingValue,
  readBoundOrderParticipants,
} from "@/domains/commerce/model/ordering-content";

type RentalOffer = OrderingContentInput["offerDetail"];
type RentalSpu = RentalOffer["spus"][number];
type RentalSku = RentalSpu["skuOptions"][number];

const props = defineProps<{
  input: OrderingContentInput;
}>();

const emit = defineEmits<{
  "update:output": [value: OrderingContentOutput | null];
  "update:summary": [value: OrderingContentSummary];
}>();

const selectedSkuId = ref<number | null>(null);
const contactPhone = ref("");
const registrantNames = ref<string[]>([]);

const rentalOffer = computed<RentalOffer | null>(() =>
  props.input.offerDetail.productType === "RENTAL"
    ? props.input.offerDetail
    : null,
);

const bindingValue = (key: string): unknown | null =>
  readBindingValue(props.input.bindings, key);

const boundOrderParticipants = computed(() =>
  readBoundOrderParticipants(props.input.bindings),
);

const participantCount = computed(() => {
  const value = bindingValue("participantCount");
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return boundOrderParticipants.value.length;
});

const serviceStartAt = computed(() => {
  const value = bindingValue("serviceStartAt");
  return typeof value === "string" ? value : null;
});

const serviceEndAt = computed(() => {
  const value = bindingValue("serviceEndAt");
  return typeof value === "string" ? value : null;
});

const isRentalSku = (sku: RentalSku): boolean =>
  typeof sku.facts === "object" &&
  sku.facts !== null &&
  "type" in sku.facts &&
  sku.facts.type === "RENTAL" &&
  sku.pricingModel.type === "FIXED_TOTAL";

const rentalSkuParticipantCount = (sku: RentalSku): number =>
  isRentalSku(sku) && "participantCount" in sku.facts
    ? sku.facts.participantCount
    : 0;

const rentalSkuDurationMinutes = (sku: RentalSku): number =>
  isRentalSku(sku) && "durationMinutes" in sku.facts
    ? sku.facts.durationMinutes
    : 0;

const rentalSkuAmountFen = (sku: RentalSku): number | null =>
  sku.pricingModel.type === "FIXED_TOTAL" ? sku.pricingModel.amountFen : null;

const allSkus = computed<RentalSku[]>(() =>
  rentalOffer.value?.spus.flatMap((spu) => spu.skuOptions) ?? [],
);

const selectableSkus = computed<RentalSku[]>(() =>
  allSkus.value.filter((sku) => {
    if (!isRentalSku(sku)) return false;
    if (participantCount.value <= 0) return true;
    return rentalSkuParticipantCount(sku) === participantCount.value;
  }),
);

const selectedSku = computed<RentalSku | null>(() => {
  if (selectedSkuId.value === null) return null;
  return allSkus.value.find((sku) => sku.skuId === selectedSkuId.value) ?? null;
});

const selectedSpu = computed<RentalSpu | null>(() => {
  if (selectedSkuId.value === null || !rentalOffer.value) return null;
  return (
    rentalOffer.value.spus.find((spu) =>
      spu.skuOptions.some((sku) => sku.skuId === selectedSkuId.value),
    ) ?? null
  );
});

const primarySpu = computed(
  () => selectedSpu.value ?? rentalOffer.value?.spus[0] ?? null,
);

const spuDescription = computed(() =>
  primarySpu.value?.presentation.sellingPoints.slice(0, 2).join(" · ") ?? null,
);

const spuThumbnailSrc = computed(() => {
  const presentation = primarySpu.value?.presentation;
  return (
    presentation?.heroImageAssetIds[0] ??
    presentation?.detailImageAssetIds[0] ??
    null
  );
});

const selectedCancellationSummary = computed(
  () => selectedSku.value?.cancellationPolicySummary ?? [],
);

const summary = computed<OrderingContentSummary>(() => {
  const sku = selectedSku.value;
  const amountFen = sku ? rentalSkuAmountFen(sku) : null;
  return {
    price: sku
      ? {
          currency: "CNY",
          totalFen: amountFen,
          range: null,
          explanations: [
            {
              sourceId: `sku:${sku.skuId}`,
              label: sku.name,
              description: "固定总价",
              deltaFen: amountFen,
              resultAmountFen: amountFen,
            },
          ],
        }
      : null,
  };
});

const output = computed<OrderingContentOutput | null>(() => {
  if (!rentalOffer.value || !selectedSku.value) return null;
  if (!serviceStartAt.value || !serviceEndAt.value) return null;
  const phone = contactPhone.value.trim();
  const names = registrantNames.value.map((name) => name.trim());
  if (
    !phone ||
    names.length !== participantCount.value ||
    names.some((name) => !name)
  ) {
    return null;
  }
  if (boundOrderParticipants.value.length === 0) return null;

  return {
    participants: boundOrderParticipants.value.map((participant) => ({
      userId: participant.userId,
    })),
    items: [
      {
        skuId: selectedSku.value.skuId,
        quantity: 1,
      },
    ],
    productTypedExtraProperties: {
      serviceStartAt: serviceStartAt.value,
      serviceEndAt: serviceEndAt.value,
      contactPhone: phone,
      registrants: names.map((fullName) => ({ fullName })),
    },
  };
});

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
  rentalOffer,
  (next) => {
    if (!next) return;
    const defaultSku =
      next.spus
        .flatMap((spu) => spu.skuOptions)
        .find(
          (sku) =>
            isRentalSku(sku) &&
            rentalSkuParticipantCount(sku) === participantCount.value,
        ) ??
      next.spus.flatMap((spu) => spu.skuOptions).find(isRentalSku) ??
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

watch(output, (next) => emit("update:output", next), {
  immediate: true,
  deep: true,
});

watch(summary, (next) => emit("update:summary", next), {
  immediate: true,
  deep: true,
});
</script>

<style scoped lang="scss">
.rental-ordering-form {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-small) 0 var(--sys-spacing-large);
}

.rental-ordering-form__selling-points {
  display: grid;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  margin: 0;
  padding-left: var(--sys-spacing-large);
  color: var(--sys-color-on-surface-variant);
}

.rental-ordering-form__service {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-small) 0;
  border-top: 1px solid var(--sys-color-outline-variant);
  border-bottom: 1px solid var(--sys-color-outline-variant);

  div {
    display: flex;
    flex-direction: column;
    gap: calc(var(--sys-spacing-xsmall) / 2);
    min-width: 0;
  }

  span {
    @include mx.pu-font(control);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface);
  }
}

.rental-ordering-form__section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding-top: var(--sys-spacing-small);

  h2 {
    @include mx.pu-font(section);
    margin: 0;
    color: var(--sys-color-on-surface);
  }
}

.rental-ordering-form__section--subtle {
  gap: var(--sys-spacing-medium);
}

.rental-ordering-form__sku-list,
.rental-ordering-form__registrants {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.rental-ordering-form__sku-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--sys-spacing-small);
  align-items: center;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-small);
  background: var(--sys-color-surface-container-low);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  font: inherit;
  text-align: left;

  &.is-selected {
    border-color: var(--sys-color-primary);
    background: var(--sys-color-primary-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  b {
    color: var(--sys-color-primary);
    white-space: nowrap;
  }
}

.rental-ordering-form__sku-check {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border: 1px solid var(--sys-color-outline);
  border-radius: 999px;
  color: var(--sys-color-primary);

  span {
    @include mx.pu-icon(small);
  }
}

.rental-ordering-form__sku-summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);

  strong {
    overflow-wrap: anywhere;
  }

  small {
    color: var(--sys-color-on-surface-variant);
  }
}

.rental-ordering-form__input {
  width: 100%;
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
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

.rental-ordering-form__policy,
.rental-ordering-form__notice-block {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  padding-top: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

@media (max-width: 42rem) {
  .rental-ordering-form__service {
    grid-template-columns: 1fr;
  }
}
</style>
