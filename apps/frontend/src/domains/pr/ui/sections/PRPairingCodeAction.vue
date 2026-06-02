<template>
  <section
    v-if="showPairingCodeAction"
    class="primary-action"
    data-region="pairing-code-action"
    data-testid="pr-detail.pairing-code-action"
  >
    <Button
      class="primary-action__button"
      tone="primary"
      type="button"
      data-testid="pr-detail.pairing-code.open"
      @click="handleOpenPairingCode"
    >
      <template #leading>
        <span
          class="primary-action__color"
          data-testid="pr-detail.pairing-code.color"
          :style="pairingColorStyle"
        ></span>
      </template>
      {{ t("prPage.pairingCodeEntry.action", { code: pairingCode }) }}
    </Button>
  </section>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import {
  canShowPRPairingCode,
  derivePRPairingIdentity,
} from "@/domains/pr/model/pr-pairing-code";
import { prPairingCodePath } from "@/domains/pr/routing/routes";
import Button from "@/shared/ui/actions/Button.vue";

const props = defineProps<{
  pr: PRDetailView;
}>();

const router = useRouter();
const { t } = useI18n();

const showPairingCodeAction = computed(() => canShowPRPairingCode(props.pr));
const pairingIdentity = computed(() => derivePRPairingIdentity(props.pr.id));
const pairingCode = computed(() => pairingIdentity.value.code);
const pairingColorStyle = computed<CSSProperties>(() => ({
  backgroundColor: pairingIdentity.value.backgroundColor,
}));

const handleOpenPairingCode = (): void => {
  if (!showPairingCodeAction.value) return;
  router.push(prPairingCodePath(props.pr.id));
};
</script>

<style lang="scss" scoped>
.primary-action {
  display: flex;
  margin-top: var(--sys-spacing-large);
}

.primary-action__button {
  width: 100%;
}

.primary-action__color {
  width: 1em;
  height: 1em;
  border: 1px solid currentColor;
  border-radius: 999px;
}
</style>
