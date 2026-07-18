<template>
  <PuDialog
    id="pr-create.auth-disclosure"
    :open="open"
    :title="t('prCreateAuth.title')"
    :description="t('prCreateAuth.description')"
    :cancel-text="t('prCreateAuth.cancel')"
    :confirm-text="t('prCreateAuth.confirm')"
    :close-on-overlay="false"
    :close-on-escape="false"
    @close="emit('cancel')"
    @cancel="emit('cancel')"
    @confirm="emit('confirm')"
  >
    <template #default>
      <div data-testid="pr-create.auth-disclosure">{{ t("prCreateAuth.title") }}</div>
    </template>
    <template #actions>
      <PuButton
        tone="neutral"
        variant="soft"
        data-testid="pr-create.auth-disclosure.cancel"
        @click="emit('cancel')"
      >
        {{ t("prCreateAuth.cancel") }}
      </PuButton>
      <PuButton data-testid="pr-create.auth-disclosure.confirm" @click="emit('confirm')">
        {{ t("prCreateAuth.confirm") }}
      </PuButton>
    </template>
  </PuDialog>
</template>

<script setup lang="ts">
import { PuButton, PuDialog } from "@partner-up-dev/design-web";
import { useI18n } from "vue-i18n";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ cancel: []; confirm: [] }>();
const { t } = useI18n();
</script>
