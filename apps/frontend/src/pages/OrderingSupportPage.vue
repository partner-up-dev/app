<template>
  <OrderingPageShell
    title="下单"
    :back-fallback-to="backFallbackTo"
    :data-testid="orderingPageTestId"
  >
    <div class="ordering-support" data-testid="ordering.support.page">
      <section class="ordering-support__content" aria-label="联系客服完成预订">
        <div class="ordering-support__qr">
          <img
            v-if="orderingReservationQrCodeUrl"
            :src="orderingReservationQrCodeUrl"
            alt="预订二维码"
            class="ordering-support__qr-image"
            data-testid="ordering.support.qr"
          />
          <p v-else class="ordering-support__qr-empty">
            {{ orderingReservationQrCodeMessage }}
          </p>
        </div>
        <p class="ordering-support__text">联系客服完成预订</p>
      </section>
    </div>
  </OrderingPageShell>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import {
  ORDERING_ENTRY_STORAGE_KEY,
  type OrderingEntryPayload,
} from "@/domains/commerce/model/ordering-entry-storage";
import {
  PUBLIC_CONFIG_KEYS,
  usePublicConfig,
} from "@/shared/config/queries/usePublicConfig";

const readOrderingEntry = (): OrderingEntryPayload | null => {
  const raw = sessionStorage.getItem(ORDERING_ENTRY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderingEntryPayload>;
    if (typeof parsed.source?.offerId !== "number") return null;
    if (!parsed.offerDetail) return null;
    return {
      source: {
        offerId: parsed.source.offerId,
      },
      offerDetail: parsed.offerDetail,
      prId: typeof parsed.prId === "number" ? parsed.prId : undefined,
      bindings:
        typeof parsed.bindings === "object" && parsed.bindings !== null
          ? parsed.bindings
          : {},
    };
  } catch {
    return null;
  }
};

const orderingEntry = ref<OrderingEntryPayload | null>(readOrderingEntry());

const orderingReservationQrCodeQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.orderingReservationQrCode,
);

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const orderingReservationQrCodeUrl = computed(() =>
  normalizeHttpUrl(orderingReservationQrCodeQuery.data.value?.value),
);

const orderingReservationQrCodeMessage = computed(() => {
  if (orderingReservationQrCodeQuery.isLoading.value) return "二维码加载中...";
  if (orderingReservationQrCodeQuery.error.value) return "二维码加载失败。";
  return "预订二维码暂未配置。";
});

const orderingPageTestId = computed(() =>
  orderingEntry.value?.offerDetail.productType === "RIDE_HAILING"
    ? "ordering.ride-hailing.page"
    : "ordering.rental.page",
);

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);
</script>

<style scoped lang="scss">
.ordering-support {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 100%;
  padding: var(--sys-spacing-large) var(--sys-spacing-medium);
}

.ordering-support__content {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-medium);
}

.ordering-support__qr {
  display: grid;
  place-items: center;
  width: min(68vw, 18rem);
  aspect-ratio: 1;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-lowest);
}

.ordering-support__qr-image {
  width: calc(100% - var(--sys-spacing-medium));
  border-radius: var(--sys-radius-small);
}

.ordering-support__qr-empty,
.ordering-support__text {
  margin: 0;
  text-align: center;
}

.ordering-support__qr-empty {
  @include mx.pu-font(body-medium);
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
}

.ordering-support__text {
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}
</style>
