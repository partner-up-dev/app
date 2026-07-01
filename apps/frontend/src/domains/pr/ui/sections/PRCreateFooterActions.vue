<template>
  <footer class="page-footer">
    <PuButton
      v-if="allowDraftSave"
      tone="neutral" variant="outline"

      :disabled="pending"
      data-testid="pr-create.save-draft"
      @click="emit('submit-as', 'DRAFT')"
    >
      {{
        pending && pendingStatus === "DRAFT"
          ? t("createPage.savePending")
          : t("common.save")
      }}
    </PuButton>
    <PuButton

      :disabled="pending"
      data-testid="pr-create.publish"
      @click="emit('submit-as', 'PUBLISH')"
    >
      {{
        pending && pendingStatus === "PUBLISH"
          ? t("createPage.createPending")
          : t("common.create")
      }}
    </PuButton>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreateSubmissionMode } from "@/domains/pr/model/pr-editor";
import { PuButton } from "@partner-up-dev/design-web";

defineProps<{
  pending: boolean;
  pendingStatus: CreateSubmissionMode;
  allowDraftSave: boolean;
}>();

const emit = defineEmits<{
  "submit-as": [status: CreateSubmissionMode];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.page-footer {
  display: flex;
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-large);
}

.page-footer > button {
  flex: 1;
  min-width: 0;
}
</style>
