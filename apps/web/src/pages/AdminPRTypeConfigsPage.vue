<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>
    <template #rail>
      <AdminRailPanel :title="t('adminPRTypeConfigs.catalogTitle')">
        <div class="stack stack--tight">
          <div class="actions actions--inline">
            <input
              v-model="newType"
              class="field-input"
              :placeholder="t('adminPRTypeConfigs.newTypePlaceholder')"
              data-testid="admin-pr-type-config.new-type"
            />
            <PuButton
              shape="pill"
              size="sm"
              :disabled="!newType.trim()"
              data-testid="admin-pr-type-config.new-type.open"
              @click="openType(newType)"
            >
              {{ t("adminPRTypeConfigs.openAction") }}
            </PuButton>
          </div>
          <PuLoadingState v-if="catalogQuery.isLoading.value" :message="t('common.loading')" />
          <div v-else-if="!(catalogQuery.data.value ?? []).length" class="hint">
            {{ t("adminPRTypeConfigs.emptyCatalog") }}
          </div>
          <PuCard
            v-for="item in catalogQuery.data.value ?? []"
            :key="item.type"
            :active="selectedType === item.type"
            selectable
            variant="outline"
            padding="sm"
            gap="xs"
            data-testid="admin-pr-type-config.catalog-item"
            @click="openType(item.type)"
          >
            <strong>{{ item.title }}</strong>
            <small>{{ item.type }}</small>
            <small>
              FORM {{ item.viewRatios.FORM }} · CARD {{ item.viewRatios.CARD }} · LIST
              {{ item.viewRatios.LIST }}
            </small>
          </PuCard>
        </div>
      </AdminRailPanel>
    </template>
    <template #main>
      <div class="stack">
        <PuInlineNotice
          v-if="detailQuery.error.value && editorState === 'idle'"
          tone="error"
          :message="detailQuery.error.value.message"
        />
        <PuLoadingState v-if="detailQuery.isLoading.value" :message="t('common.loading')" />
        <template v-else-if="form && editorState !== 'idle'">
          <BentoLayout>
            <AdminPRTypeConfigAuthoringSection
              v-model:authoring="form.authoring"
              v-bind="authoringProps"
              :existing="isExistingConfig"
              :pending="authoringMutation.isPending.value"
              :error="authoringMutation.error.value?.message"
              @validation-change="setInvalid('authoring', $event)"
              @save="saveAuthoring"
            />
            <AdminPRTypeConfigDiscoverySection
              v-model:discovery="form.discovery"
              v-bind="discoveryProps"
              :existing="isExistingConfig"
              :pending="discoveryMutation.isPending.value"
              :error="discoveryMutation.error.value?.message"
              @validation-change="setInvalid('discovery', $event)"
              @save="saveDiscovery"
            />
            <AdminPRTypeConfigParticipationSection
              v-model:participation="form.participation"
              v-bind="participationProps"
              :existing="isExistingConfig"
              :pending="participationMutation.isPending.value"
              :error="participationMutation.error.value?.message"
              @validation-change="setInvalid('participation', $event)"
              @save="saveParticipation"
            />
            <AdminPRTypeConfigCoordinationSection
              v-model:coordination="form.coordination"
              v-bind="coordinationProps"
              :existing="isExistingConfig"
              :pending="coordinationMutation.isPending.value"
              :error="coordinationMutation.error.value?.message"
              @validation-change="setInvalid('coordination', $event)"
              @save="saveCoordination"
            />
            <AdminPRTypeConfigCompletionSection
              v-model:completion="form.completion"
              v-bind="completionProps"
              :existing="isExistingConfig"
              :pending="completionMutation.isPending.value"
              :error="completionMutation.error.value?.message"
              @validation-change="setInvalid('completion', $event)"
              @save="saveCompletion"
            />
          </BentoLayout>
          <div v-if="isNewConfig" class="actions actions--inline">
            <PuButton
              :disabled="saveMutation.isPending.value || hasInvalidSlice"
              data-testid="admin-pr-type-config.save"
              @click="save"
            >
              {{
                saveMutation.isPending.value
                  ? t("adminPRTypeConfigs.saving")
                  : t("adminPRTypeConfigs.saveAction")
              }}
            </PuButton>
            <PuInlineNotice
              v-if="saveMutation.error.value"
              tone="error"
              :message="saveMutation.error.value.message"
            />
          </div>
          <BentoItem :title="t('adminPRTypeConfigs.preferenceTagsTitle')" span="full">
            <div v-if="tagsQuery.isLoading.value" class="hint">
              {{ t("common.loading") }}
            </div>
            <div v-else-if="!(tagsQuery.data.value ?? []).length" class="hint">
              {{ t("adminPRTypeConfigs.emptyPreferenceTags") }}
            </div>
            <div v-for="tag in tagsQuery.data.value ?? []" :key="tag.id" class="preference-tag-row">
              <span>
                <strong>{{ tag.label }}</strong>
                <small>{{ tag.description }}</small>
              </span>
              <span class="actions actions--inline">
                <PuButton
                  v-if="tag.moderationStatus === 'PENDING'"
                  size="sm"
                  variant="outline"
                  @click="moderate(tag.id, 'PUBLISHED')"
                >
                  {{ t("adminPRTypeConfigs.publishAction") }}
                </PuButton>
                <PuButton
                  v-if="tag.moderationStatus === 'PENDING'"
                  size="sm"
                  variant="outline"
                  tone="danger"
                  @click="moderate(tag.id, 'REJECTED')"
                >
                  {{ t("adminPRTypeConfigs.rejectAction") }}
                </PuButton>
              </span>
            </div>
          </BentoItem>
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { PuButton, PuCard, PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toAdminPRTypeConfigDraft } from "@/domains/admin/adapters/pr-type-config-adapter";
import {
  clonePRTypeConfigDraft,
  mergeSavedSlice,
  type AdminPRTypeConfigDraft,
  type PRTypeConfigSection,
  resetPRTypeConfigDraft,
} from "@/domains/admin/model/pr-type-config-editor";
import {
  AdminPRTypeConfigRequestError,
  useAdminPRTypeConfigCatalog,
  useAdminPRTypeConfigDetail,
  useAdminPRTypePreferenceTags,
  useCreateAdminPRTypeConfig,
  useModerateAdminPRTypePreferenceTag,
  useUpdateAdminPRTypeConfigAuthoring,
  useUpdateAdminPRTypeConfigCompletion,
  useUpdateAdminPRTypeConfigCoordination,
  useUpdateAdminPRTypeConfigDiscovery,
  useUpdateAdminPRTypeConfigParticipation,
} from "@/domains/admin/queries/useAdminPRTypeConfigs";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import AdminPRTypeConfigAuthoringSection from "@/domains/admin/ui/pr-type-config/AdminPRTypeConfigAuthoringSection.vue";
import AdminPRTypeConfigCompletionSection from "@/domains/admin/ui/pr-type-config/AdminPRTypeConfigCompletionSection.vue";
import AdminPRTypeConfigCoordinationSection from "@/domains/admin/ui/pr-type-config/AdminPRTypeConfigCoordinationSection.vue";
import AdminPRTypeConfigDiscoverySection from "@/domains/admin/ui/pr-type-config/AdminPRTypeConfigDiscoverySection.vue";
import AdminPRTypeConfigParticipationSection from "@/domains/admin/ui/pr-type-config/AdminPRTypeConfigParticipationSection.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const catalogQuery = useAdminPRTypeConfigCatalog(isAdmin);
const selectedType = ref<string | null>(null);
const newType = ref("");
const detailQuery = useAdminPRTypeConfigDetail(selectedType);
const tagsQuery = useAdminPRTypePreferenceTags(selectedType);
const saveMutation = useCreateAdminPRTypeConfig();
const authoringMutation = useUpdateAdminPRTypeConfigAuthoring();
const discoveryMutation = useUpdateAdminPRTypeConfigDiscovery();
const participationMutation = useUpdateAdminPRTypeConfigParticipation();
const coordinationMutation = useUpdateAdminPRTypeConfigCoordination();
const completionMutation = useUpdateAdminPRTypeConfigCompletion();
const moderationMutation = useModerateAdminPRTypePreferenceTag();
const form = ref<AdminPRTypeConfigDraft | null>(null);
const invalidSlices = reactive<Record<PRTypeConfigSection, boolean>>({
  authoring: false,
  discovery: false,
  participation: false,
  coordination: false,
  completion: false,
});
const hasInvalidSlice = computed(() => Object.values(invalidSlices).some(Boolean));
const editorState = computed<"idle" | "loading" | "new" | "existing">(() => {
  if (!selectedType.value) return "idle";
  if (detailQuery.isLoading.value) return "loading";
  if (detailQuery.data.value?.type === selectedType.value) return "existing";
  if (
    detailQuery.error.value instanceof AdminPRTypeConfigRequestError &&
    detailQuery.error.value.status === 404
  )
    return "new";
  return "idle";
});
const isNewConfig = computed(() => editorState.value === "new");
const isExistingConfig = computed(() => editorState.value === "existing");
const setInvalid = (section: PRTypeConfigSection, invalid: boolean) => {
  invalidSlices[section] = invalid;
};

watch(selectedType, () => {
  form.value = null;
  Object.keys(invalidSlices).forEach((key) => {
    invalidSlices[key as PRTypeConfigSection] = false;
  });
});
watch(
  editorState,
  (state) => {
    if (form.value || !selectedType.value) return;
    if (state === "existing" && detailQuery.data.value)
      form.value = resetPRTypeConfigDraft(
        selectedType.value,
        toAdminPRTypeConfigDraft(detailQuery.data.value),
      );
    if (state === "new") form.value = resetPRTypeConfigDraft(selectedType.value);
  },
  { immediate: true },
);

const authoringProps = computed(() => ({
  title: t("adminPRTypeConfigs.authoringTitle"),
  typeLabel: t("adminPRTypeConfigs.typeLabel"),
  creationPolicyLabel: t("adminPRTypeConfigs.authoringCreationPolicyLabel"),
  defaultMinLabel: t("adminPRTypeConfigs.defaultMinPartnersLabel"),
  defaultMaxLabel: t("adminPRTypeConfigs.defaultMaxPartnersLabel"),
  locationPoolLabel: t("adminPRTypeConfigs.locationPoolLabel"),
  routePoolLabel: t("adminPRTypeConfigs.routePoolJsonLabel"),
  timePoolLabel: t("adminPRTypeConfigs.timePoolJsonLabel"),
  notesLabel: t("adminPRTypeConfigs.defaultNotesLabel"),
  savingLabel: t("adminPRTypeConfigs.saving"),
  saveLabel: t("adminPRTypeConfigs.saveAction"),
  type: selectedType.value ?? "",
}));
const discoveryProps = computed(() => ({
  title: t("adminPRTypeConfigs.discoveryTitle"),
  titleLabel: t("adminPRTypeConfigs.titleLabel"),
  coverImageLabel: t("adminPRTypeConfigs.coverImageLabel"),
  descriptionLabel: t("adminPRTypeConfigs.descriptionLabel"),
  ratioLabel: t("adminPRTypeConfigs.ratioLabel"),
  ratioHint: t("adminPRTypeConfigs.ratioFallbackHint"),
  savingLabel: t("adminPRTypeConfigs.saving"),
  saveLabel: t("adminPRTypeConfigs.saveAction"),
}));
const participationProps = computed(() => ({
  title: t("adminPRTypeConfigs.participationTitle"),
  confirmationEnabledLabel: t("adminPRTypeConfigs.confirmationEnabledLabel"),
  expansionPolicyLabel: t("adminPRTypeConfigs.fullCapacityExpansionLabel"),
  startOffsetLabel: t("adminPRTypeConfigs.confirmationStartOffsetLabel"),
  endOffsetLabel: t("adminPRTypeConfigs.confirmationEndOffsetLabel"),
  joinLockLabel: t("adminPRTypeConfigs.joinLockOffsetLabel"),
  joinGateLabel: t("adminPRTypeConfigs.joinGateJsonLabel"),
  savingLabel: t("adminPRTypeConfigs.saving"),
  saveLabel: t("adminPRTypeConfigs.saveAction"),
}));
const coordinationProps = computed(() => ({
  title: t("adminPRTypeConfigs.coordinationTitle"),
  meetingPointLabel: t("adminPRTypeConfigs.meetingPointJsonLabel"),
  locationMeetingPointsLabel: t("adminPRTypeConfigs.locationMeetingPointsJsonLabel"),
  savingLabel: t("adminPRTypeConfigs.saving"),
  saveLabel: t("adminPRTypeConfigs.saveAction"),
}));
const completionProps = computed(() => ({
  title: t("adminPRTypeConfigs.completionTitle"),
  feedbackTemplateLabel: t("adminPRTypeConfigs.feedbackTemplateLabel"),
  savingLabel: t("adminPRTypeConfigs.saving"),
  saveLabel: t("adminPRTypeConfigs.saveAction"),
}));

const save = async () => {
  if (form.value && selectedType.value && isNewConfig.value && !hasInvalidSlice.value) {
    form.value = toAdminPRTypeConfigDraft(
      await saveMutation.mutateAsync({
        type: selectedType.value,
        input: clonePRTypeConfigDraft(form.value),
      }),
    );
    Object.keys(invalidSlices).forEach((key) => {
      invalidSlices[key as PRTypeConfigSection] = false;
    });
  }
};
const saveSlice = async (section: PRTypeConfigSection) => {
  if (!form.value || !selectedType.value || !isExistingConfig.value || invalidSlices[section])
    return;
  if (section === "authoring")
    form.value = mergeSavedSlice(
      form.value,
      section,
      toAdminPRTypeConfigDraft(
        await authoringMutation.mutateAsync({
          type: selectedType.value,
          input: form.value.authoring,
        }),
      ),
    );
  if (section === "discovery")
    form.value = mergeSavedSlice(
      form.value,
      section,
      toAdminPRTypeConfigDraft(
        await discoveryMutation.mutateAsync({
          type: selectedType.value,
          input: form.value.discovery,
        }),
      ),
    );
  if (section === "participation")
    form.value = mergeSavedSlice(
      form.value,
      section,
      toAdminPRTypeConfigDraft(
        await participationMutation.mutateAsync({
          type: selectedType.value,
          input: form.value.participation,
        }),
      ),
    );
  if (section === "coordination")
    form.value = mergeSavedSlice(
      form.value,
      section,
      toAdminPRTypeConfigDraft(
        await coordinationMutation.mutateAsync({
          type: selectedType.value,
          input: form.value.coordination,
        }),
      ),
    );
  if (section === "completion")
    form.value = mergeSavedSlice(
      form.value,
      section,
      toAdminPRTypeConfigDraft(
        await completionMutation.mutateAsync({
          type: selectedType.value,
          input: form.value.completion,
        }),
      ),
    );
};
const saveAuthoring = () => saveSlice("authoring");
const saveDiscovery = () => saveSlice("discovery");
const saveParticipation = () => saveSlice("participation");
const saveCoordination = () => saveSlice("coordination");
const saveCompletion = () => saveSlice("completion");
const openType = (type: string) => {
  const normalized = type.trim();
  if (normalized) selectedType.value = normalized;
};
const moderate = async (tagId: number, moderationStatus: "PUBLISHED" | "REJECTED") => {
  if (selectedType.value)
    await moderationMutation.mutateAsync({
      type: selectedType.value,
      tagId,
      input: { moderationStatus },
    });
};
</script>

<style scoped lang="scss">
.preference-tag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  padding: calc(var(--sys-spacing-medium) * 0.75) 0;
  border-bottom: 1px solid var(--pu-color-border-subtle);
}
.preference-tag-row span:first-child {
  display: grid;
  gap: var(--pu-space-1);
}
.preference-tag-row small {
  color: var(--pu-color-text-secondary);
}
</style>
