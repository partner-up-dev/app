<template>
  <div
    class="bill-line-card"
    data-testid="bill-detail.line"
    :data-payable="isSelectable ? 'true' : 'false'"
    :data-selected="selected ? 'true' : 'false'"
  >
    <PuCard
      as="div"
      class="bill-line-card__control"
      :active="selected"
      :disabled="!isSelectable"
      selectable
      variant="soft"
      tone="neutral"
      padding="sm"
      gap="sm"
      @click="handleSelect"
    >
      <div class="bill-line-card__top-row">
        <span class="bill-line-card__checkbox" aria-hidden="true">
          <PuCheckbox
            :model-value="selected"
            :disabled="!isSelectable"
            tabindex="-1"
            aria-label="选择账单行"
          />
        </span>

        <div class="bill-line-card__amount-row">
          <strong class="bill-line-card__amount" data-testid="bill-detail.line-amount">
            {{ amountLabel }}
          </strong>

          <PuTag
            :text="statusTag.label"
            :tone="statusTag.tone"
            variant="soft"
            shape="pill"
            size="sm"
            data-testid="bill-detail.line-status"
          />
        </div>

        <div class="bill-line-card__payer" data-testid="bill-detail.line-payer">
          <PuImg
            :src="props.line.payer.avatarUrl ?? ''"
            :alt="payerLabel"
            :name="payerLabel"
            :fallback-initial="payerInitial"
            size="small"
            shape="circle"
            :show-loading="false"
            bordered
          />
          <strong class="bill-line-card__payer-name">{{ payerLabel }}</strong>
        </div>
      </div>

      <p class="bill-line-card__description" data-testid="bill-detail.line-description">
        {{ descriptionText }}
      </p>
    </PuCard>
  </div>
</template>

<script setup lang="ts">
import { PuCard, PuCheckbox, PuImg, PuTag } from "@partner-up-dev/design-web";
import { computed } from "vue";
import {
  formatCurrencyAmount,
  resolveBillLineSettlementTag,
} from "@/domains/commerce/model/bill-display";
import type { BillDetailResponse } from "@/domains/commerce/queries/useCommerce";

const props = defineProps<{
  line: BillDetailResponse["lines"][number];
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();

const isSelectable = computed(() => props.line.payableByViewer);

const signedAmountFen = computed(() =>
  props.line.kind === "REFUND" ? -props.line.amountFen : props.line.amountFen,
);

const amountLabel = computed(() =>
  formatCurrencyAmount(signedAmountFen.value, props.line.currency),
);

const statusTag = computed(() => resolveBillLineSettlementTag(props.line.settlementStatus));

const descriptionText = computed(() => props.line.description?.trim() || props.line.label);

const payerLabel = computed(() => props.line.payer.displayName);

const payerInitial = computed(() => payerLabel.value.trim().slice(0, 1) || "付");

const handleSelect = (): void => {
  if (!isSelectable.value) return;
  emit("select");
};
</script>

<style scoped lang="scss">
.bill-line-card {
  width: 100%;
  min-width: 0;
  container-name: bill-line-card;
  container-type: inline-size;
}

.bill-line-card__control {
  width: 100%;
  min-width: 0;
  border-radius: var(--sys-radius-small);
  text-align: left;
}

.bill-line-card__top-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--sys-spacing-medium);
}

.bill-line-card__amount-row {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.bill-line-card__checkbox {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  pointer-events: none;

  :deep(.pu-checkbox) {
    pointer-events: none;
  }
}

.bill-line-card__amount {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
  white-space: nowrap;
}

.bill-line-card__payer {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  margin-left: auto;
}

.bill-line-card__payer-name {
  @include mx.pu-font(control);
  min-width: 0;
  max-inline-size: 8rem;
  overflow: hidden;
  color: var(--sys-color-on-surface);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-line-card__description {
  min-width: 0;
  overflow-wrap: anywhere;
  @include mx.pu-font(caption);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

@supports (width: 1cqi) {
  .bill-line-card__payer-name {
    max-inline-size: 20cqi;
  }
}
</style>
