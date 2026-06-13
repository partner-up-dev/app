<template>
  <OrderingPageShell
    :title="t('ordering.pageTitle')"
    :back-fallback-to="backFallbackTo"
    :data-testid="orderingPageTestId"
  >
    <template #actions>
      <PuButton
        :action="{ to: { name: 'contact-support' } }"
        shape="pill"
        tone="primary"
        variant="outline"
        size="sm"
        data-testid="ordering.contact-support.open"
      >
        {{ t("ordering.contactSupportAction") }}
      </PuButton>
    </template>

    <div class="ordering-page__body">
      <PuInlineNotice
        v-if="missingInput"
        tone="error"
        :title="t('ordering.invalidEntryTitle')"
        :message="t('ordering.invalidEntryMessage')"
      />

      <RentalOrderingForm
        v-else-if="rentalOrdering && orderingContentInput"
        :input="orderingContentInput"
        @update:output="handleRentalOutputUpdate"
      />

      <RideHailingOrderingPanel
        v-else-if="rideOrdering && orderingContentInput"
        :input="orderingContentInput"
        :evaluated-options="rideEvaluatedOptions"
        @evaluation-output-change="evaluationContentOutput = $event"
        @update:output="contentOutput = $event"
      />
    </div>

    <template #footer-action>
      <OrderingFooterActionBar
        v-if="rentalOrdering"
        :amount-label="priceDisplayLabel"
        :can-create="canCreate"
        :loading="false"
        :price-detail-enabled="true"
        price-testid="ordering.rental.price"
        price-detail-testid="ordering.rental.price-detail.toggle"
        create-testid="ordering.rental.create-order"
        :create-label="t('ordering.submitAction')"
        @open-price-detail="priceDetailOpen = true"
        @create="submitOrder"
      />
      <OrderingFooterActionBar
        v-if="rideOrdering"
        :amount-label="priceDisplayLabel"
        :can-create="canCreate"
        :loading="false"
        :price-detail-enabled="true"
        price-testid="ordering.ride-hailing.quote-price-range"
        price-detail-testid="ordering.ride-hailing.price-detail.toggle"
        create-testid="ordering.ride-hailing.create-order"
        :create-label="t('ordering.submitAction')"
        @open-price-detail="priceDetailOpen = true"
        @create="submitOrder"
      />
    </template>

    <template #floating>
      <OrderingFloatingNoticeLayer
        v-if="rentalOrdering || rideOrdering"
        :message="floatingNoticeMessage"
        :tone="floatingNoticeTone"
        data-testid="ordering.notice.blocked"
      />
    </template>

    <template #drawer>
      <OrderingPriceDetailDrawer
        :open="priceDetailOpen"
        :explanations="priceExplanations"
        :data-testid="
          rentalOrdering
            ? 'ordering.rental.price-detail'
            : 'ordering.ride-hailing.price-detail'
        "
        @close="priceDetailOpen = false"
      />
    </template>
  </OrderingPageShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import OrderingFooterActionBar from "@/domains/commerce/ui/ordering/OrderingFooterActionBar.vue";
import OrderingFloatingNoticeLayer from "@/domains/commerce/ui/ordering/OrderingFloatingNoticeLayer.vue";
import OrderingPriceDetailDrawer from "@/domains/commerce/ui/ordering/OrderingPriceDetailDrawer.vue";
import RentalOrderingForm from "@/domains/commerce/ui/ordering/RentalOrderingForm.vue";
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";
import RideHailingOrderingPanel, {
  type RideVehicleOption,
} from "@/domains/commerce/ui/ordering/RideHailingOrderingPanel.vue";
import {
  useEvaluateOrdering,
  type CreateOrderInput,
} from "@/domains/commerce/queries/useCommerce";
import {
  ORDERING_ENTRY_STORAGE_KEY,
  type OrderingEntryPayload,
} from "@/domains/commerce/model/ordering-entry-storage";
import {
  ORDERING_SUPPORT_HANDOFF_STORAGE_KEY,
  type OrderingSupportHandoffPayload,
  type OrderingSupportSummaryLine,
  type OrderingSupportSummarySection,
} from "@/domains/commerce/model/ordering-support-handoff";
import type {
  OrderingContentInput,
  OrderingContentOutput,
} from "@/domains/commerce/model/ordering-content";

type OrderingOfferDetail = OrderingEntryPayload["offerDetail"];
type OrderingSku = OrderingOfferDetail["spus"][number]["skuOptions"][number];
type OrderingSpu = OrderingOfferDetail["spus"][number];
type SkuSelection = {
  sku: OrderingSku | null;
  spu: OrderingSpu | null;
};

const { t } = useI18n();
const router = useRouter();

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
const missingInput = computed(() => orderingEntry.value === null);

const evaluateMutation = useEvaluateOrdering();

const ordering = computed(() => orderingEntry.value?.offerDetail ?? null);
const rentalOrdering = computed<OrderingOfferDetail | null>(() =>
  ordering.value?.productType === "RENTAL" ? ordering.value : null,
);
const rideOrdering = computed<OrderingOfferDetail | null>(() =>
  ordering.value?.productType === "RIDE_HAILING" ? ordering.value : null,
);
const orderingPageTestId = computed(() =>
  rideOrdering.value ? "ordering.ride-hailing.page" : "ordering.rental.page",
);

const contentOutput = ref<OrderingContentOutput | null>(null);
const evaluationContentOutput = ref<OrderingContentOutput | null>(null);
const priceDetailOpen = ref(false);

const orderingContentInput = computed<OrderingContentInput | null>(() => {
  const entry = orderingEntry.value;
  if (!entry) return null;
  return {
    source: entry.source,
    offerDetail: entry.offerDetail,
    bindings: entry.bindings,
  };
});

const buildOrderInput = (
  output: OrderingContentOutput | null,
): CreateOrderInput | null => {
  const entry = orderingEntry.value;
  if (!entry || !output) return null;
  return {
    source: entry.source,
    prId: entry.prId ?? null,
    participants: output.participants,
    items: output.items,
    productTypedExtraProperties: output.productTypedExtraProperties,
  };
};

const createOrderInput = computed<CreateOrderInput | null>(() =>
  buildOrderInput(contentOutput.value),
);

const evaluationOrderInput = computed<CreateOrderInput | null>(() =>
  buildOrderInput(evaluationContentOutput.value),
);

const rideEvaluatedOptions = computed<RideVehicleOption[]>(
  () => evaluateMutation.data.value?.rideHailing?.options ?? [],
);

const availability = computed(
  () => evaluateMutation.data.value?.actions.create_order ?? null,
);

const availabilityMessage = computed(() => {
  if (!createOrderInput.value) return t("ordering.completeInfoNotice");
  if (evaluateMutation.isPending.value) return t("ordering.evaluatingNotice");
  return availability.value?.problem?.detail ?? null;
});

const canCreate = computed(
  () =>
    !!createOrderInput.value &&
    !evaluateMutation.isPending.value &&
    availability.value?.allowed === true,
);

const priceExplanations = computed(
  () => evaluateMutation.data.value?.price.explanations ?? [],
);

const priceDisplayLabel = computed(() => {
  const range = evaluateMutation.data.value?.price.range ?? null;
  const rangePrices = range
    ? [range.minFen, range.maxFen].filter(
        (value): value is number => typeof value === "number",
      )
    : [];
  if (rangePrices.length > 0) {
    const min = Math.min(...rangePrices);
    const max = Math.max(...rangePrices);
    return min === max
      ? formatPriceAmount(min)
      : `${formatPriceAmount(min)}~${formatYuan(max)}`;
  }
  return formatPriceAmount(evaluateMutation.data.value?.price.totalFen ?? null);
});

const floatingNoticeMessage = computed(() => availabilityMessage.value);

const floatingNoticeTone = computed<"warning" | "error">(() => "warning");

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId
    ? { path: `/pr/${orderingEntry.value.prId}` }
    : { path: "/" },
);

const handleRentalOutputUpdate = (next: OrderingContentOutput | null): void => {
  contentOutput.value = next;
  evaluationContentOutput.value = next;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readStringField = (
  record: Record<string, unknown> | null,
  key: string,
): string | null => {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const readNumberField = (
  record: Record<string, unknown> | null,
  key: string,
): number | null => {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const firstLineValue = (
  value: string | null | undefined,
  fallback?: string,
): string => value?.trim() || fallback || t("ordering.summary.pending");

const formatDateTime = (value: string | null): string => {
  if (!value) return t("ordering.summary.pending");
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatTime = (value: string | null): string => {
  if (!value) return t("ordering.summary.departNow");
  const time = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
  return t("ordering.summary.departAt", { time });
};

const formatYuan = (amountFen: number): string => (amountFen / 100).toFixed(2);

const formatPriceAmount = (amountFen: number | null | undefined): string =>
  typeof amountFen === "number"
    ? `￥${formatYuan(amountFen)}`
    : t("ordering.summary.currencyPending");

const selectedSkuSelection = (
  entry: OrderingEntryPayload,
  output: OrderingContentOutput,
): SkuSelection => {
  const selectedSkuId = output.items[0]?.skuId ?? null;
  if (typeof selectedSkuId !== "number") {
    return { sku: null, spu: entry.offerDetail.spus[0] ?? null };
  }

  for (const spu of entry.offerDetail.spus) {
    const sku = spu.skuOptions.find((option) => option.skuId === selectedSkuId);
    if (sku) return { sku, spu };
  }

  return { sku: null, spu: entry.offerDetail.spus[0] ?? null };
};

const getRentalParticipantCount = (sku: OrderingSku | null): number | null => {
  const facts = asRecord(sku?.facts ?? null);
  const count = readNumberField(facts, "participantCount");
  return count && count > 0 ? count : null;
};

const getRentalDurationMinutes = (sku: OrderingSku | null): number | null => {
  const facts = asRecord(sku?.facts ?? null);
  const duration = readNumberField(facts, "durationMinutes");
  return duration && duration > 0 ? duration : null;
};

const readRegistrants = (extras: Record<string, unknown> | null): string => {
  const value = extras?.registrants;
  if (!Array.isArray(value)) return t("ordering.summary.pending");
  const names = value.flatMap((item) => {
    const record = asRecord(item);
    const fullName = readStringField(record, "fullName");
    return fullName ? [fullName] : [];
  });
  return names.length > 0
    ? names.join(t("ordering.summary.listSeparator"))
    : t("ordering.summary.pending");
};

const readParticipantNames = (entry: OrderingEntryPayload): string => {
  const value = entry.bindings.orderParticipants;
  if (!Array.isArray(value)) return t("ordering.summary.pending");
  const names = value.flatMap((item) => {
    const record = asRecord(item);
    const displayName = readStringField(record, "displayName");
    return displayName ? [displayName] : [];
  });
  return names.length > 0
    ? names.join(t("ordering.summary.listSeparator"))
    : t("ordering.summary.pending");
};

const readPlaceName = (value: unknown): string => {
  const record = asRecord(value);
  return (
    readStringField(record, "name") ??
    readStringField(record, "full_address") ??
    readStringField(record, "address") ??
    t("ordering.summary.pending")
  );
};

const buildRentalSections = (input: {
  entry: OrderingEntryPayload;
  output: OrderingContentOutput;
  selection: SkuSelection;
}): OrderingSupportSummarySection[] => {
  const extras = asRecord(input.output.productTypedExtraProperties);
  const participantCount =
    getRentalParticipantCount(input.selection.sku) ??
    input.output.participants.length;
  const durationMinutes = getRentalDurationMinutes(input.selection.sku);
  const skuDetail = [
    participantCount > 0
      ? t("ordering.summary.personUnit", { count: participantCount })
      : null,
    durationMinutes
      ? t("ordering.summary.hourUnit", {
          count: Math.round(durationMinutes / 60),
        })
      : null,
  ]
    .filter((item): item is string => item !== null)
    .join(" · ");
  const serviceStartAt = readStringField(extras, "serviceStartAt");
  const serviceEndAt = readStringField(extras, "serviceEndAt");
  const contactPhone = readStringField(extras, "contactPhone");

  return [
    {
      title: t("ordering.summary.rentalBookingSection"),
      lines: [
        {
          label: t("ordering.summary.labels.product"),
          value: firstLineValue(input.selection.spu?.name),
        },
        {
          label: t("ordering.summary.labels.sku"),
          value: firstLineValue(input.selection.sku?.name),
        },
        {
          label: t("ordering.summary.labels.configuration"),
          value: firstLineValue(skuDetail),
        },
        {
          label: t("ordering.summary.labels.serviceTime"),
          value: `${formatDateTime(serviceStartAt)} - ${formatDateTime(serviceEndAt)}`,
        },
      ],
    },
    {
      title: t("ordering.summary.rentalContactSection"),
      lines: [
        {
          label: t("ordering.summary.labels.contactPhone"),
          value: firstLineValue(contactPhone),
        },
        {
          label: t("ordering.summary.labels.registrants"),
          value: readRegistrants(extras),
        },
      ],
    },
  ];
};

const buildRideSections = (input: {
  entry: OrderingEntryPayload;
  output: OrderingContentOutput;
  selection: SkuSelection;
}): OrderingSupportSummarySection[] => {
  const extras = asRecord(input.output.productTypedExtraProperties);
  const route = asRecord(extras?.route);
  const origin = readPlaceName(route?.origin);
  const destination = readPlaceName(route?.destination);
  const departureAt = readStringField(extras, "departureAt");
  const contactPhone = readStringField(extras, "contactPhone");

  return [
    {
      title: t("ordering.summary.rideTripSection"),
      lines: [
        {
          label: t("ordering.summary.labels.service"),
          value: firstLineValue(input.selection.spu?.name),
        },
        {
          label: t("ordering.summary.labels.vehicle"),
          value: firstLineValue(input.selection.sku?.name),
        },
        {
          label: t("ordering.summary.labels.route"),
          value: `${origin} → ${destination}`,
        },
        {
          label: t("ordering.summary.labels.departure"),
          value: formatTime(departureAt),
        },
      ],
    },
    {
      title: t("ordering.summary.ridePassengerSection"),
      lines: [
        {
          label: t("ordering.summary.labels.riders"),
          value: readParticipantNames(input.entry),
        },
        {
          label: t("ordering.summary.labels.contactPhone"),
          value: firstLineValue(contactPhone),
        },
      ],
    },
  ];
};

const buildOrderingSupportHandoff = (input: {
  entry: OrderingEntryPayload;
  output: OrderingContentOutput;
  priceLabel: string;
}): OrderingSupportHandoffPayload => {
  const selection = selectedSkuSelection(input.entry, input.output);
  const title =
    selection.spu?.name ??
    input.entry.offerDetail.spus[0]?.name ??
    (input.entry.offerDetail.productType === "RIDE_HAILING"
      ? t("ordering.summary.rideFallbackTitle")
      : t("ordering.summary.rentalFallbackTitle"));
  const subtitle = selection.sku?.name ?? null;
  const sections =
    input.entry.offerDetail.productType === "RIDE_HAILING"
      ? buildRideSections({ ...input, selection })
      : buildRentalSections({ ...input, selection });

  return {
    createdAt: new Date().toISOString(),
    offerId: input.entry.source.offerId,
    prId: input.entry.prId ?? null,
    productType: input.entry.offerDetail.productType,
    title,
    subtitle,
    priceLabel: input.priceLabel,
    sections,
  };
};

watch(
  () => orderingEntry.value?.offerDetail.productType,
  () => {
    contentOutput.value = null;
    evaluationContentOutput.value = null;
    priceDetailOpen.value = false;
    evaluateMutation.reset();
  },
);

watch(
  evaluationOrderInput,
  (next) => {
    if (!next) return;
    evaluateMutation.mutate(next);
  },
  { deep: true },
);

const submitOrder = async (): Promise<void> => {
  const entry = orderingEntry.value;
  const output = contentOutput.value;
  if (!entry || !output) return;

  const handoff = buildOrderingSupportHandoff({
    entry,
    output,
    priceLabel: priceDisplayLabel.value,
  });
  sessionStorage.setItem(
    ORDERING_SUPPORT_HANDOFF_STORAGE_KEY,
    JSON.stringify(handoff),
  );
  await router.push({ name: "order-support" });
};
</script>

<style scoped lang="scss">
.ordering-page__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  width: 100%;
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sys-spacing-medium);
}
</style>
