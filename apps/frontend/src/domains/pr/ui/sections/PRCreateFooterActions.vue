<template>
  <footer class="page-footer">
    <Button
      v-if="allowDraftSave"
      tone="outline"
      type="button"
      :disabled="pending"
      data-testid="pr-create.save-draft"
      @click="emit('submit-as', 'DRAFT')"
    >
      {{
        pending && pendingStatus === "DRAFT"
          ? t("createPage.savePending")
          : t("common.save")
      }}
    </Button>
    <Button
      type="button"
      :disabled="pending"
      data-testid="pr-create.publish"
      @click="emit('submit-as', 'PUBLISH')"
    >
      {{
        pending && pendingStatus === "PUBLISH"
          ? t("createPage.createPending")
          : t("common.create")
      }}
    </Button>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreateSubmissionMode } from "@/domains/pr/model/pr-editor";
import Button from "@/shared/ui/actions/Button.vue";

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
