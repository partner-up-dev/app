<template>
  <PuPageScaffold viewport="screen" class="pr-messages-page" data-page="pr-messages">
    <template #pageHeader>
      <PuHeader :title="t('prPage.messagePage.title')" title-as="h1">
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('prPage.messagePage.backToDetail')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <PuInlineNotice
      tone="error"
      v-if="id === null"
      :message="t('errors.missingPartnerRequestId')"
    />

    <PRMessageThread v-else :pr-id="id" :show-header="false" acknowledge-attention layout="page" />

    <template #footer>
      <PageFooter variant="minimal" data-region="support" />
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PRMessageThread from "@/domains/pr/ui/sections/PRMessageThread.vue";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import { PuButton, PuHeader, PuInlineNotice, PuPageScaffold } from "@partner-up-dev/design-web";

const { t } = useI18n();
const id = usePRRouteId();

const backFallbackTo = computed(() => {
  if (id.value === null) return "/";
  return prDetailPath(id.value);
});
const { handleBack } = useFallbackBack(backFallbackTo);
</script>

<style scoped lang="scss">
.pr-messages-page {
  min-width: 0;
  --pu-page-max-width: 72rem;
}
</style>
