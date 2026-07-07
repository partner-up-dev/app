<template>
  <section
    v-if="showPairingCodeAction"
    class="utility-action-cell"
    data-region="pairing-code-action"
    data-testid="pr-detail.pairing-code-action"
  >
    <PuButton
      tone="neutral" variant="outline"
      block

      data-testid="pr-detail.pairing-code.open"
      @click="handleOpenPairingCode"
    >
      <template #leading>
        <span
          class="pairing-code-color"
          data-testid="pr-detail.pairing-code.color"
          :style="pairingColorStyle"
        ></span>
      </template>
      {{ t("prPage.pairingCodeEntry.action", { code: pairingCode }) }}
    </PuButton>
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
import { PuButton } from "@partner-up-dev/design-web";

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
.utility-action-cell {
  display: flex;
  flex-direction: column;
}

.pairing-code-color {
  width: 1em;
  height: 1em;
  border: 1px solid currentColor;
  border-radius: 999px;
}
</style>
