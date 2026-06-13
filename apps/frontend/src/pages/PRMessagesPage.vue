<template>
  <PuPageScaffold viewport="screen"
    class="pr-messages-page"
    data-page="pr-messages"
  >
    <template #header>
      <PageHeader
        :title="t('prPage.messagePage.title')"
        :back-label="t('prPage.messagePage.backToDetail')"
        :back-fallback-to="backFallbackTo"
      />
    </template>

    <ErrorToast
      v-if="id === null"
      :message="t('errors.missingPartnerRequestId')"
      persistent
    />

    <PRMessageThread
      v-else
      :pr-id="id"
      :show-header="false"
      layout="page"
    />

    <template #footer>
      <PageFooter variant="minimal" data-region="support" />
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PRMessageThread from "@/domains/pr/ui/sections/PRMessageThread.vue";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { PuPageScaffold } from "@partner-up-dev/design-web";

const { t } = useI18n();
const id = usePRRouteId();

const backFallbackTo = computed(() => {
  if (id.value === null) return "/";
  return prDetailPath(id.value);
});
</script>

<style scoped lang="scss">
.pr-messages-page {
  min-width: 0;
  --pu-page-max-width: 72rem;
}
</style>
