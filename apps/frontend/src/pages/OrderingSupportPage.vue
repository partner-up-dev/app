<template>
  <OrderingPageShell
    :title="pageTitle"
    :back-fallback-to="backFallbackTo"
  >
    <div class="ordering-support" data-testid="ordering.support.page">
      <template v-if="supportHandoff">
        <section
          class="ordering-support__hero"
          :aria-label="t('ordering.support.heroAria')"
        >
          <span
            class="ordering-support__icon i-mdi-progress-wrench"
            aria-hidden="true"
          ></span>
          <h1>{{ t("ordering.support.heroTitle") }}</h1>
          <p>{{ t("ordering.support.heroDescription") }}</p>
        </section>

        <section
          class="ordering-support__poster"
          :aria-label="t('ordering.support.posterAria')"
          data-testid="ordering.support.poster"
        >
          <img
            v-if="summaryPosterUrl"
            :src="summaryPosterUrl"
            :alt="t('ordering.support.posterAlt')"
            class="ordering-support__poster-image"
            data-testid="ordering.support.poster-image"
          />
          <div v-else class="ordering-support__poster-empty">
            <span
              v-if="summaryPosterGenerating"
              class="ordering-support__spinner"
              aria-hidden="true"
            ></span>
            <span>{{ summaryPosterStatusLabel }}</span>
          </div>

          <p class="ordering-support__poster-hint">
            {{
              summaryPosterUrl
                ? t("ordering.support.posterSavedHint")
                : summaryPosterHint
            }}
          </p>
        </section>

        <OrderingSupportSummaryCard
          v-if="summaryPosterError"
          :summary="supportHandoff"
          fluid
          class="ordering-support__summary-fallback"
        />

        <section
          class="ordering-support__contact"
          :aria-label="t('ordering.support.contactAria')"
        >
          <Button
            type="button"
            appearance="rect"
            size="lg"
            data-testid="ordering.support.contact.open"
            @click="showContactModal = true"
          >
            <template #leading>
              <span class="i-mdi-headset" aria-hidden="true"></span>
            </template>
            {{ t("ordering.support.contactAction") }}
          </Button>
        </section>

        <Modal
          :open="showContactModal"
          :title="t('ordering.support.contactModalTitle')"
          max-width="420px"
          @close="showContactModal = false"
        >
          <div class="ordering-support__contact-modal">
            <p class="ordering-support__contact-modal-description">
              {{ t("ordering.support.contactModalDescription") }}
            </p>

            <div class="ordering-support__qr">
              <img
                v-if="orderingReservationQrCodeUrl"
                :src="orderingReservationQrCodeUrl"
                :alt="t('ordering.support.qrAlt')"
                class="ordering-support__qr-image"
                data-testid="ordering.support.qr"
              />
              <p v-else class="ordering-support__qr-empty">
                {{ orderingReservationQrCodeMessage }}
              </p>
            </div>

            <Button
              type="button"
              appearance="rect"
              block
              data-testid="ordering.support.contact.close"
              @click="showContactModal = false"
            >
              {{ t("common.close") }}
            </Button>
          </div>
        </Modal>
      </template>

      <section
        v-else
        class="ordering-support__recovery"
        :aria-label="t('ordering.support.recoveryAria')"
        data-testid="ordering.support.recovery"
      >
        <span
          class="ordering-support__recovery-icon i-mdi-alert-circle-outline"
          aria-hidden="true"
        ></span>
        <h1>{{ t("ordering.support.recoveryTitle") }}</h1>
        <p>{{ recoveryDescription }}</p>
        <Button
          type="button"
          appearance="rect"
          size="lg"
          data-testid="ordering.support.recovery.action"
          @click="handleRecoveryAction"
        >
          {{ recoveryActionLabel }}
        </Button>
      </section>
    </div>

    <div
      v-if="supportHandoff"
      class="ordering-support__poster-source"
      aria-hidden="true"
    >
      <OrderingSupportSummaryCard
        v-if="supportHandoff"
        ref="summaryCardRef"
        :summary="supportHandoff"
      />
    </div>
  </OrderingPageShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import OrderingPageShell from "@/domains/commerce/ui/ordering/OrderingPageShell.vue";
import {
  ORDERING_ENTRY_STORAGE_KEY,
  type OrderingEntryPayload,
} from "@/domains/commerce/model/ordering-entry-storage";
import {
  ORDERING_SUPPORT_HANDOFF_STORAGE_KEY,
  isOrderingSupportHandoffPayload,
  type OrderingSupportHandoffPayload,
} from "@/domains/commerce/model/ordering-support-handoff";
import OrderingSupportSummaryCard from "@/domains/commerce/ui/ordering/OrderingSupportSummaryCard.vue";
import {
  PUBLIC_CONFIG_KEYS,
  usePublicConfig,
} from "@/shared/config/queries/usePublicConfig";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";

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

const readSupportHandoff = (): OrderingSupportHandoffPayload | null => {
  const raw = sessionStorage.getItem(ORDERING_SUPPORT_HANDOFF_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isOrderingSupportHandoffPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const orderingEntry = ref<OrderingEntryPayload | null>(readOrderingEntry());
const supportHandoff = ref<OrderingSupportHandoffPayload | null>(
  readSupportHandoff(),
);
const summaryCardRef = ref<InstanceType<typeof OrderingSupportSummaryCard> | null>(
  null,
);
const summaryPosterUrl = ref<string | null>(null);
const summaryPosterGenerating = ref(false);
const summaryPosterError = ref<string | null>(null);
const showContactModal = ref(false);
const { uploadImage } = useCloudStorage();

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
  if (orderingReservationQrCodeQuery.isLoading.value) {
    return t("ordering.support.qrLoading");
  }
  if (orderingReservationQrCodeQuery.error.value) {
    return t("ordering.support.qrFailed");
  }
  return t("ordering.support.qrMissing");
});

const summaryPosterStatusLabel = computed(() => {
  if (!supportHandoff.value) return t("ordering.support.summaryMissing");
  if (summaryPosterError.value) return summaryPosterError.value;
  if (summaryPosterGenerating.value) {
    return t("ordering.support.summaryGenerating");
  }
  return t("ordering.support.summaryPending");
});

const summaryPosterHint = computed(() =>
  summaryPosterError.value
    ? t("ordering.support.posterFallbackHint")
    : t("ordering.support.posterPendingHint"),
);

const backFallbackTo = computed(() =>
  orderingEntry.value?.prId ? { path: `/pr/${orderingEntry.value.prId}` } : { path: "/" },
);

const pageTitle = computed(() =>
  supportHandoff.value
    ? t("ordering.support.pageTitle")
    : t("ordering.support.recoveryPageTitle"),
);

const recoveryActionLabel = computed(() =>
  orderingEntry.value
    ? t("ordering.support.recoveryAction")
    : t("ordering.support.recoveryHomeAction"),
);

const recoveryDescription = computed(() =>
  orderingEntry.value
    ? t("ordering.support.recoveryDescription")
    : t("ordering.support.recoveryHomeDescription"),
);

const handleRecoveryAction = (): void => {
  void router.push(orderingEntry.value ? { name: "order-new" } : { path: "/" });
};

useBodyScrollLock(computed(() => showContactModal.value));

const loadHtml2Canvas = async (): Promise<typeof import("html2canvas")["default"]> => {
  const module = await import("html2canvas");
  return module.default;
};

const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> =>
  await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(t("ordering.support.canvasBlobFailed")));
        }
      },
      "image/png",
      0.95,
    );
  });

const getSummaryCardElement = (): HTMLElement | null => {
  const component = summaryCardRef.value;
  const root = component?.$el;
  return root instanceof HTMLElement ? root : null;
};

const generateSummaryPoster = async (): Promise<void> => {
  if (!supportHandoff.value) return;
  summaryPosterGenerating.value = true;
  summaryPosterError.value = null;

  try {
    await nextTick();
    const element = getSummaryCardElement();
    if (!element) throw new Error(t("ordering.support.summaryElementMissing"));

    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(element, {
      width: 420,
      height: element.offsetHeight,
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      allowTaint: false,
      windowWidth: 420,
      windowHeight: element.offsetHeight,
    });
    const blob = await canvasToBlob(canvas);
    summaryPosterUrl.value = await uploadImage(blob, { purpose: "poster" });
  } catch (error) {
    summaryPosterError.value =
      error instanceof Error
        ? error.message
        : t("ordering.support.posterGenerationFailed");
  } finally {
    summaryPosterGenerating.value = false;
  }
};

onMounted(() => {
  void generateSummaryPoster();
});
</script>

<style scoped lang="scss">
.ordering-support {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-large);
  width: 100%;
  min-height: 100%;
  overflow: auto;
  padding: var(--sys-spacing-large) var(--sys-spacing-medium);
}

.ordering-support__hero {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
  max-width: 28rem;
  text-align: center;

  h1,
  p {
    margin: 0;
  }

  h1 {
    @include mx.pu-font(hero);
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.ordering-support__icon {
  @include mx.pu-icon(large);
  color: var(--sys-color-primary);
}

.ordering-support__recovery {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-medium);
  width: min(100%, 24rem);
  padding-top: var(--sys-spacing-xxlarge);
  text-align: center;

  h1,
  p {
    margin: 0;
  }

  h1 {
    @include mx.pu-font(title);
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.ordering-support__recovery-icon {
  @include mx.pu-icon(large);
  color: var(--sys-color-error);
}

.ordering-support__recovery :deep(.ui-button) {
  width: 100%;
}

.ordering-support__poster {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-small);
  width: 100%;
}

.ordering-support__poster-image {
  width: min(100%, 22rem);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  box-shadow: var(--sys-shadow-2);
}

.ordering-support__poster-empty {
  display: grid;
  place-items: center;
  gap: var(--sys-spacing-small);
  width: min(100%, 22rem);
  min-height: 14rem;
  border: 1px dashed var(--sys-color-outline);
  border-radius: var(--sys-radius-medium);
  padding: var(--sys-spacing-medium);
  background: var(--sys-color-surface-container-low);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.ordering-support__spinner {
  width: 1.75rem;
  height: 1.75rem;
  border: 3px solid var(--sys-color-outline-variant);
  border-top-color: var(--sys-color-primary);
  border-radius: 999px;
  animation: ordering-support-spin 0.8s linear infinite;
}

.ordering-support__poster-hint {
  @include mx.pu-font(support);
  max-width: 22rem;
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.ordering-support__contact {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-medium);
  width: min(100%, 22rem);
}

.ordering-support__contact :deep(.ui-button) {
  width: 100%;
}

.ordering-support__contact-modal {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-medium);
}

.ordering-support__contact-modal-description {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.ordering-support__qr {
  display: grid;
  place-items: center;
  width: min(100%, 18rem);
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
  @include mx.pu-font(body);
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
}

.ordering-support__text {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.ordering-support__summary-fallback {
  width: min(100%, 22rem);
  min-height: auto;
}

.ordering-support__poster-source {
  position: absolute;
  top: -10000px;
  left: -10000px;
  pointer-events: none;
}

@keyframes ordering-support-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
