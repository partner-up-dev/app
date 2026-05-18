<template>
  <InlineNotice
    v-if="showDraftPublishCard"
    tone="warning"
    data-testid="pr-detail.draft-publish.notice"
    :message="t('prPage.publishDraft.description')"
  >
    <template #actions>
      <Button
        type="button"
        data-testid="pr-detail.draft-publish.action"
        :loading="publishMutation.isPending.value"
        @click="handlePublishDraft"
      >
        {{
          publishMutation.isPending.value
            ? t("prPage.publishDraft.pending")
            : t("prPage.publishDraft.action")
        }}
      </Button>
    </template>
  </InlineNotice>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import type { PRDetailView } from "@/domains/pr/model/types";
import { usePublishPR } from "@/domains/pr/queries/usePRPublish";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";

const props = defineProps<{
  prId: PRId | null;
  pr: PRDetailView;
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const publishMutation = usePublishPR();
const showDraftPublishCard = computed(() => props.pr.status === "DRAFT");

const handlePublishDraft = async () => {
  if (props.prId === null || props.pr.status !== "DRAFT") return;
  const result = await publishMutation.mutateAsync({ id: props.prId });
  const authPayload = (result as { auth?: AuthSessionPayload | null } | null)
    ?.auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  await router.replace({ query: { ...route.query, entry: "publish" } });
};

defineExpose({
  replayPublishDraft: handlePublishDraft,
});
</script>
