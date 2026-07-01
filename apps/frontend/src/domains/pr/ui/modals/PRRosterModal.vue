<template>
  <PuModal :open="open" max-width="560px" @close="emit('close')">
    <div class="roster-modal">
      <PRAwarenessLane :pr-id="prId" :section="section" />

      <PuButton tone="neutral" variant="soft" block @click="emit('close')">
        {{ t("common.close") }}
      </PuButton>
    </div>
  </PuModal>
</template>

<script setup lang="ts">
import { PuButton, PuModal } from "@partner-up-dev/design-web";
import { useI18n } from "vue-i18n";
import PRAwarenessLane from "@/domains/pr/ui/sections/PRAwarenessLane.vue";
import type { PRPartnerSectionView } from "@/domains/pr/model/types";

type PartnerSection = PRPartnerSectionView;

defineProps<{
  open: boolean;
  prId: number;
  section: PartnerSection;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
</script>

<style scoped lang="scss">
.roster-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}
</style>
