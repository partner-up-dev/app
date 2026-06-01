<template>
  <template v-if="rentalOffer">
    <SurfaceCard gap="md">
      <div class="ordering-content__section-heading">
        <p class="ordering-content__eyebrow">场地服务</p>
        <h2 data-testid="ordering.rental.product-name">
          {{ primarySpu?.name ?? "可预订场地" }}
        </h2>
      </div>

      <ul
        v-if="primarySpu?.presentation.sellingPoints.length"
        class="ordering-content__selling-points"
      >
        <li
          v-for="point in primarySpu.presentation.sellingPoints"
          :key="point"
        >
          {{ point }}
        </li>
      </ul>
    </SurfaceCard>

    <SurfaceCard gap="md">
      <div class="ordering-content__section-heading">
        <p class="ordering-content__eyebrow">已从 PR 锁定</p>
        <h2>服务时间与人数</h2>
      </div>

      <div class="ordering-content__facts">
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
      <div class="ordering-content__section-heading">
        <p class="ordering-content__eyebrow">选择 SKU</p>
        <h2>可预订规格</h2>
      </div>

      <div class="ordering-content__sku-list">
        <ChoiceCard
          v-for="sku in selectableSkus"
          :key="sku.skuId"
          :active="sku.skuId === selectedSkuId"
          data-testid="ordering.rental.sku-option"
          @click="selectedSkuId = sku.skuId"
        >
          <div class="ordering-content__sku-card">
            <div>
              <strong>{{ sku.name }}</strong>
              <span>
                {{ rentalSkuParticipantCount(sku) }} 人 ·
                {{ Math.round(rentalSkuDurationMinutes(sku) / 60) }} 小时
              </span>
            </div>
            <b>{{ formatFen(rentalSkuAmountFen(sku)) }}</b>
          </div>
        </ChoiceCard>
      </div>

      <div
        class="ordering-content__policy"
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
    </SurfaceCard>

    <SurfaceCard gap="md">
      <div class="ordering-content__section-heading">
        <p class="ordering-content__eyebrow">登记信息</p>
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
          class="ordering-content__input"
          inputmode="tel"
          autocomplete="tel"
          data-testid="ordering.rental.contact-phone"
          placeholder="请输入联系人手机号"
        />
      </FormField>

      <div class="ordering-content__registrants">
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
            class="ordering-content__input"
            autocomplete="name"
            :data-testid="`ordering.rental.registrant-name.${index}`"
            placeholder="请输入真实姓名"
          />
        </FormField>
      </div>
    </SurfaceCard>

    <SurfaceCard
      v-if="primarySpu?.presentation.noticeBlocks.length"
      gap="sm"
      tone="outline"
    >
      <div
        v-for="notice in primarySpu.presentation.noticeBlocks"
        :key="notice.title"
        class="ordering-content__notice-block"
      >
        <strong>{{ notice.title }}</strong>
        <p>{{ notice.content }}</p>
      </div>
    </SurfaceCard>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import type {
  OrderingContentInput,
  OrderingContentOutput,
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

const selectedCancellationSummary = computed(
  () => selectedSku.value?.cancellationPolicySummary ?? [],
);

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
</script>

<style scoped lang="scss">
.ordering-content__section-heading {
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

.ordering-content__eyebrow {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ordering-content__selling-points {
  display: grid;
  gap: var(--sys-spacing-xsmall);
  margin: 0;
  padding-left: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
}

.ordering-content__facts {
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

.ordering-content__sku-list,
.ordering-content__registrants {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ordering-content__policy {
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

.ordering-content__sku-card {
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

.ordering-content__input {
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

.ordering-content__notice-block {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);

  p {
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

@media (max-width: 42rem) {
  .ordering-content__facts {
    grid-template-columns: 1fr;
  }
}
</style>
