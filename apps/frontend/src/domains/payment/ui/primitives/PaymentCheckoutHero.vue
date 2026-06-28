<template>
  <PuCard
    as="section"
    class="payment-checkout-hero"
    variant="soft"
    tone="neutral"
    padding="sm"
    gap="xs"
    data-testid="payment-checkout.hero"
  >
    <div class="payment-checkout-hero__top-row">
      <strong class="payment-checkout-hero__amount" data-testid="payment-checkout.amount">
        {{ amountLabel }}
      </strong>
      <PuTag
        :text="statusTag.label"
        :tone="statusTag.tone"
        variant="soft"
        shape="pill"
        size="sm"
        data-testid="payment-checkout.status"
      />
    </div>

    <strong class="payment-checkout-hero__title">
      {{ title }}
    </strong>

    <p class="payment-checkout-hero__description">
      {{ description }}
    </p>
  </PuCard>
</template>

<script setup lang="ts">
import { PuCard, PuTag } from "@partner-up-dev/design-web";
import type { BillLineSettlementTagDisplay } from "@/domains/commerce/model/bill-display";

defineProps<{
  amountLabel: string;
  title: string;
  description: string;
  statusTag: BillLineSettlementTagDisplay;
}>();
</script>

<style scoped lang="scss">
.payment-checkout-hero {
  width: 100%;
  min-width: 0;
  border-radius: var(--sys-radius-small);
}

.payment-checkout-hero__top-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.payment-checkout-hero__amount {
  @include mx.pu-font(title);
  color: var(--sys-color-on-surface);
  white-space: nowrap;
}

.payment-checkout-hero__title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.payment-checkout-hero__description {
  @include mx.pu-font(caption);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  overflow-wrap: anywhere;
}
</style>
