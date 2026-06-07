<template>
  <PageScaffoldFlow class="pr-create-page" data-page="pr-create">
    <template #header>
      <PRCreateHeader @back="goHome" />
    </template>

    <div class="pr-create-page__body">
      <TabBar
        :items="modeTabs"
        :model-value="activeMode"
        :aria-label="t('createPage.modeSwitchAria')"
        @update:model-value="handleModeChange"
        data-region="mode-switch"
      />

      <section
        v-show="activeMode === 'nl'"
        class="pr-create-page__mode-panel"
        data-region="create-form"
      >
        <header class="pr-create-page__mode-panel-header">
          <h2>{{ t("createPage.nlModeTitle") }}</h2>
          <p>{{ t("createPage.nlModeDescription") }}</p>
        </header>

        <NLPRForm />
      </section>

      <section
        v-show="activeMode === 'form'"
        class="pr-create-page__mode-panel"
        data-region="create-form"
      >
        <header class="pr-create-page__mode-panel-header">
          <h2>{{ t("createPage.formModeTitle") }}</h2>
          <p>{{ t("createPage.formModeDescription") }}</p>
        </header>

        <PREditor ref="editorRef" />
      </section>
    </div>

    <template #actions>
      <div data-region="actions">
        <PRCreateFooterActions
          v-if="activeMode === 'form'"
          :pending="editorPending"
          :pending-status="editorPendingStatus"
          :allow-draft-save="editorAllowDraftSave"
          @submit-as="submitEditorAs"
        />
      </div>
    </template>

    <template #footer>
      <PageFooter variant="minimal" data-region="support" />
    </template>

  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed, isRef, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PREditor from "@/domains/pr/ui/forms/PREditor.vue";
import NLPRForm from "@/domains/pr/ui/forms/NLPRForm.vue";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import PRCreateHeader from "@/domains/pr/ui/sections/PRCreateHeader.vue";
import PRCreateFooterActions from "@/domains/pr/ui/sections/PRCreateFooterActions.vue";
import type { CreateSubmissionMode } from "@/domains/pr/model/pr-editor";

const resolveQueryMode = (value: unknown): "nl" | "form" | null => {
  if (value === "nl" || value === "form") return value;
  return null;
};

const hasTopicQuery = (value: unknown): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (!Array.isArray(value)) return false;
  return value.some(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const editorRef = ref<InstanceType<typeof PREditor> | null>(null);

const initialMode =
  resolveQueryMode(route.query.mode) ??
  (hasTopicQuery(route.query.topic) ? "form" : "nl");

const activeMode = ref<"nl" | "form">(initialMode);
const modeTabs = computed(() => [
  {
    key: "nl",
    label: t("createPage.nlModeTab"),
  },
  {
    key: "form",
    label: t("createPage.formModeTab"),
  },
]);

const setMode = (mode: "nl" | "form") => {
  if (activeMode.value === mode) return;

  activeMode.value = mode;
};

const handleModeChange = (value: string | number) => {
  if (value !== "nl" && value !== "form") return;
  setMode(value);
};

const readExposed = <T,>(value: unknown, fallback: T): T => {
  if (isRef<T>(value)) return value.value;
  return value === undefined || value === null ? fallback : (value as T);
};

const editorPending = computed(() =>
  readExposed(editorRef.value?.isPending, false),
);
const editorPendingStatus = computed(() =>
  readExposed<CreateSubmissionMode>(editorRef.value?.pendingStatus, "PUBLISH"),
);
const editorAllowDraftSave = computed(() =>
  readExposed(editorRef.value?.allowDraftSave, false),
);

const submitEditorAs = (status: CreateSubmissionMode) => {
  editorRef.value?.submitAs(status);
  editorRef.value?.submitForm();
};

const goHome = () => {
  void router.push("/");
};
</script>

<style lang="scss" scoped>
.pr-create-page__body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.pr-create-page__mode-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  border: 1px solid var(--sys-color-outline-variant);
  padding: var(--sys-spacing-medium);
}

.pr-create-page__mode-panel-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);

  h2 {
    @include mx.pu-font(section);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}
</style>
