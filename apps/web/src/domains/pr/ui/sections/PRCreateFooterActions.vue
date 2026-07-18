<template>
  <footer class="page-footer">
    <PuButton
      :disabled="pending"
      data-testid="pr-create.publish"
      @click="emit('submit')"
    >
      {{
        pending ? t("createPage.createPending") : t("common.create")
      }}
    </PuButton>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { PuButton } from "@partner-up-dev/design-web";

defineProps<{
  pending: boolean;
}>();

const emit = defineEmits<{
  submit: [];
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
