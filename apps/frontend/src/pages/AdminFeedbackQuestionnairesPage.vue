<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #main>
      <LoadingIndicator
        v-if="templatesQuery.isLoading.value"
        :message="t('common.loading')"
      />
      <ErrorToast v-else-if="pageError" :message="pageError.message" persistent />

      <BentoLayout v-else>
        <BentoItem
          :title="formTitle"
          :description="t('adminFeedbackQuestionnaires.formHint')"
          span="full"
        >
          <template #actions>
            <Button
              appearance="pill"
              size="sm"
              type="button"
              data-testid="admin-feedback-questionnaires.save"
              :disabled="!canSave"
              :loading="isSaving"
              @click="handleSave"
            >
              {{ saveButtonLabel }}
            </Button>
          </template>

          <div class="grid">
            <label class="field">
              <span class="field-label">{{
                t("adminFeedbackQuestionnaires.keyLabel")
              }}</span>
              <input
                v-model="draftKey"
                class="field-input"
                :placeholder="t('adminFeedbackQuestionnaires.keyPlaceholder')"
              />
            </label>

            <label class="field">
              <span class="field-label">{{
                t("adminFeedbackQuestionnaires.versionLabel")
              }}</span>
              <input
                v-model="draftVersion"
                class="field-input"
                :placeholder="t('adminFeedbackQuestionnaires.versionPlaceholder')"
              />
            </label>

            <label class="field field--full">
              <span class="field-label">{{
                t("adminFeedbackQuestionnaires.titleLabel")
              }}</span>
              <input
                v-model="draftTitle"
                class="field-input"
                :placeholder="t('adminFeedbackQuestionnaires.titlePlaceholder')"
              />
            </label>

            <label class="field field--full">
              <span class="field-label">{{
                t("adminFeedbackQuestionnaires.definitionLabel")
              }}</span>
              <textarea
                v-model="draftDefinitionText"
                class="field-input definition-textarea"
                spellcheck="false"
                data-testid="admin-feedback-questionnaires.definition"
              ></textarea>
            </label>
          </div>

          <p v-if="definitionError" class="error-text">{{ definitionError }}</p>
          <p v-else-if="saveSuccessMessage" class="success-text">
            {{ saveSuccessMessage }}
          </p>
        </BentoItem>
      </BentoLayout>
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminFeedbackQuestionnaires.templatesTitle')">
        <template #actions>
          <Button
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            data-testid="admin-feedback-questionnaires.create"
            @click="handleNewTemplate"
          >
            {{ t("adminFeedbackQuestionnaires.newTemplateAction") }}
          </Button>
        </template>

        <p class="hint">
          {{
            t("adminFeedbackQuestionnaires.templateCount", {
              count: templates.length,
            })
          }}
        </p>

        <label class="field">
          <span class="field-label">{{
            t("adminFeedbackQuestionnaires.templateLabel")
          }}</span>
          <select
            v-model="selectedTemplateIdRaw"
            class="field-input"
            data-testid="admin-feedback-questionnaires.template-list"
          >
            <option value="__new">
              {{ t("adminFeedbackQuestionnaires.newTemplateOption") }}
            </option>
            <option
              v-for="template in templates"
              :key="template.id"
              :value="String(template.id)"
            >
              {{ template.key }}@{{ template.version }}
            </option>
          </select>
        </label>
      </AdminRailPanel>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FeedbackQuestionnaireDefinition } from "@partner-up-dev/backend";
import {
  useAdminFeedbackQuestionnaireTemplates,
  useCreateAdminFeedbackQuestionnaireTemplate,
  useUpdateAdminFeedbackQuestionnaireTemplate,
  type AdminFeedbackQuestionnaireTemplateInput,
  type AdminFeedbackQuestionnaireTemplatesResponse,
} from "@/domains/admin/queries/useAdminFeedbackQuestionnaires";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";

type TemplateRecord = AdminFeedbackQuestionnaireTemplatesResponse[number];

const newTemplateSentinel = "__new";

const buildDefaultDefinition = (): FeedbackQuestionnaireDefinition => ({
  key: "post-event-feedback",
  version: "1.0.0",
  title: "活动反馈",
  questions: [
    {
      id: "overall_experience",
      type: "single_choice",
      label: "这次活动体验整体如何？",
      required: true,
      options: [
        { value: "good", label: "满意" },
        { value: "okay", label: "一般" },
        { value: "bad", label: "不满意" },
      ],
    },
    {
      id: "suggestion",
      type: "textarea",
      label: "还有什么想补充？",
      required: false,
      maxLength: 1000,
    },
  ],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatDefinition = (definition: FeedbackQuestionnaireDefinition): string =>
  JSON.stringify(definition, null, 2);

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const templatesQuery = useAdminFeedbackQuestionnaireTemplates(isAdmin);
const createTemplateMutation = useCreateAdminFeedbackQuestionnaireTemplate();
const updateTemplateMutation = useUpdateAdminFeedbackQuestionnaireTemplate();

const selectedTemplateIdRaw = ref(newTemplateSentinel);
const draftKey = ref("");
const draftVersion = ref("");
const draftTitle = ref("");
const draftDefinitionText = ref("");
const definitionError = ref<string | null>(null);
const saveSuccessMessage = ref<string | null>(null);

const templates = computed<TemplateRecord[]>(() => templatesQuery.data.value ?? []);
const selectedTemplate = computed<TemplateRecord | null>(() => {
  const selectedId = Number(selectedTemplateIdRaw.value);
  if (!Number.isInteger(selectedId) || selectedId <= 0) return null;
  return templates.value.find((template) => template.id === selectedId) ?? null;
});
const isCreating = computed(() => selectedTemplate.value === null);
const isSaving = computed(
  () =>
    createTemplateMutation.isPending.value ||
    updateTemplateMutation.isPending.value,
);
const canSave = computed(
  () =>
    draftKey.value.trim().length > 0 &&
    draftVersion.value.trim().length > 0 &&
    draftTitle.value.trim().length > 0 &&
    !isSaving.value,
);
const formTitle = computed(() =>
  isCreating.value
    ? t("adminFeedbackQuestionnaires.createFormTitle")
    : t("adminFeedbackQuestionnaires.editFormTitle"),
);
const saveButtonLabel = computed(() => {
  if (isSaving.value) return t("adminFeedbackQuestionnaires.saving");
  return isCreating.value
    ? t("adminFeedbackQuestionnaires.createAction")
    : t("adminFeedbackQuestionnaires.saveAction");
});
const pageError = computed(
  () =>
    templatesQuery.error.value ??
    createTemplateMutation.error.value ??
    updateTemplateMutation.error.value ??
    null,
);

const loadTemplateIntoDraft = (template: TemplateRecord) => {
  draftKey.value = template.key;
  draftVersion.value = template.version;
  draftTitle.value = template.title;
  draftDefinitionText.value = formatDefinition(template.definition);
  definitionError.value = null;
  saveSuccessMessage.value = null;
};

const loadDefaultDraft = () => {
  const definition = buildDefaultDefinition();
  draftKey.value = definition.key;
  draftVersion.value = definition.version;
  draftTitle.value = definition.title;
  draftDefinitionText.value = formatDefinition(definition);
  definitionError.value = null;
  saveSuccessMessage.value = null;
};

const handleNewTemplate = () => {
  selectedTemplateIdRaw.value = newTemplateSentinel;
  loadDefaultDraft();
};

const parseDefinitionInput = ():
  | AdminFeedbackQuestionnaireTemplateInput
  | null => {
  definitionError.value = null;
  saveSuccessMessage.value = null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(draftDefinitionText.value);
  } catch {
    definitionError.value = t("adminFeedbackQuestionnaires.invalidJson");
    return null;
  }

  if (!isRecord(parsed)) {
    definitionError.value = t("adminFeedbackQuestionnaires.invalidDefinition");
    return null;
  }

  const key = draftKey.value.trim();
  const version = draftVersion.value.trim();
  const title = draftTitle.value.trim();
  const definition = parsed as FeedbackQuestionnaireDefinition;
  return {
    key,
    version,
    title,
    definition: {
      ...definition,
      key,
      version,
      title,
    },
  };
};

const handleSave = async () => {
  const input = parseDefinitionInput();
  if (!input) return;

  const template = selectedTemplate.value;
  if (!template) {
    const result = await createTemplateMutation.mutateAsync(input);
    selectedTemplateIdRaw.value = String(result.id);
    loadTemplateIntoDraft(result);
    saveSuccessMessage.value = t("adminFeedbackQuestionnaires.created");
    return;
  }

  const result = await updateTemplateMutation.mutateAsync({
    templateId: template.id,
    input,
  });
  loadTemplateIntoDraft(result);
  saveSuccessMessage.value = t("adminFeedbackQuestionnaires.saved");
};

watch(
  templates,
  (nextTemplates) => {
    if (selectedTemplateIdRaw.value === newTemplateSentinel) {
      if (!draftDefinitionText.value) {
        loadDefaultDraft();
      }
      return;
    }

    const hasSelectedTemplate = nextTemplates.some(
      (template) => String(template.id) === selectedTemplateIdRaw.value,
    );
    if (hasSelectedTemplate) return;

    selectedTemplateIdRaw.value =
      nextTemplates.length > 0 ? String(nextTemplates[0].id) : newTemplateSentinel;
  },
  { immediate: true },
);

watch(
  selectedTemplate,
  (template) => {
    if (template) {
      loadTemplateIntoDraft(template);
      return;
    }
    if (!draftDefinitionText.value) {
      loadDefaultDraft();
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.field {
  display: flex;
  flex-direction: column;
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.hint,
.error-text,
.success-text {
  margin: 0;
}

.hint {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.field--full {
  grid-column: 1 / -1;
}

.field-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.definition-textarea {
  min-height: 28rem;
  resize: vertical;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Consolas,
    "Liberation Mono",
    monospace;
  font-size: 0.875rem;
  line-height: 1.55;
}

.error-text {
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}

.success-text {
  @include mx.pu-font(body);
  color: var(--sys-color-primary);
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
