<template>
  <form class="partner-request-form" data-testid="pr-editor.form" @submit.prevent="submitForm">
    <PuLoadingState v-if="isDetailLoading" :message="t('common.loading')" />
    <PuInlineNotice tone="error" v-else-if="detailError" :message="detailError.message" />
    <PuEmptyState
      v-else-if="!hasEditableFields"
      icon="i-mdi-lock-outline"
      title="当前没有可编辑内容"
      description="这个 PR 在当前状态下没有开放可调整的字段。"
    />

    <template v-else>
      <PuInlineNotice
        v-if="isCreateEditor && authoringOptions && !authoringOptions.creationAllowed"
        tone="warning"
        title="当前类型暂不开放创建"
        message="当前类型不可创建，提交操作已禁用；配置变更后仍由服务端最终校验。"
        data-testid="pr-editor.authoring-disabled"
      />

      <div v-if="canEditTitle" class="form-field">
        <label>{{ t("partnerRequestForm.title") }}</label>
        <input
          v-model="titleInput"
          type="text"
          data-testid="pr-editor.form.title"
          :placeholder="t('partnerRequestForm.titlePlaceholder')"
        />
      </div>

      <div v-if="canEditType" class="form-field">
        <label>
          {{ t("partnerRequestForm.type") }}
          <span class="required">{{ t("partnerRequestForm.requiredMark") }}</span>
        </label>
        <input
          v-model="typeModel"
          type="text"
          data-testid="pr-editor.form.type"
          :placeholder="t('partnerRequestForm.typePlaceholder')"
        />
        <span v-if="errors['fields.type']" class="error-message">
          {{ errors["fields.type"] }}
        </span>
      </div>

      <PuButton
        v-if="showAdvancedToggle"
        class="advanced-toggle"
        tone="neutral"
        variant="dashed"
        block
        data-testid="pr-editor.form.advanced-toggle"
        :aria-expanded="isAdvancedOpen"
        @click="isAdvancedOpen = !isAdvancedOpen"
      >
        {{
          isAdvancedOpen
            ? t("partnerRequestForm.advancedHide")
            : t("partnerRequestForm.advancedShow")
        }}
      </PuButton>

      <Transition name="advanced-fields">
        <div v-if="showBodyFields" class="advanced-section">
          <DateTimeRangePicker
            v-if="canEditTime"
            v-model="timeModel"
            label="时间"
            :hint="timeHint"
          />
          <div
            v-if="isCreateEditor && authoringOptions?.startOptions.length"
            class="authoring-suggestions"
          >
            <span>时间建议</span>
            <PuButton
              v-for="option in authoringOptions.startOptions"
              :key="option.key"
              type="button"
              tone="neutral"
              variant="outline"
              size="sm"
              :data-testid="`pr-editor.authoring.start.${option.key}`"
              @click="selectAuthoringStart(option.startAt, option.endAt)"
            >
              {{ option.description ?? formatAuthoringStart(option.startAt, option.endAt) }}
            </PuButton>
          </div>

          <PRPlaceModeField
            v-if="canEditPlace"
            v-model="placeValue"
            :label="t('partnerRequestForm.placeMode')"
            :aria-label="t('partnerRequestForm.placeModeAria')"
            :location-label="t('partnerRequestForm.location')"
            :location-placeholder="t('partnerRequestForm.locationPlaceholder')"
            location-options-list-id="pr-editor-authoring-locations"
            :location-error="errors['fields.location']"
            :route-error="errors['fields.route']"
            test-id-prefix="pr-editor.form.place"
          />
          <datalist id="pr-editor-authoring-locations">
            <option
              v-for="option in authoringOptions?.locationOptions ?? []"
              :key="option.id"
              :value="option.label"
            >
              {{ option.label }}
            </option>
          </datalist>
          <div
            v-if="isCreateEditor && authoringOptions?.routeOptions.length"
            class="authoring-suggestions"
          >
            <label for="pr-editor-authoring-route">路线建议</label>
            <select
              id="pr-editor-authoring-route"
              data-testid="pr-editor.authoring.route"
              @change="selectAuthoringRoute"
            >
              <option value="">自定义路线</option>
              <option
                v-for="option in authoringOptions.routeOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.id }}
              </option>
            </select>
          </div>

          <div v-if="canEditMinPartners" class="form-field">
            <label>{{ t("partnerRequestForm.minPartners") }}</label>
            <input
              :value="minPartnersInput"
              type="number"
              min="1"
              data-testid="pr-editor.form.min-partners"
              :placeholder="t('partnerRequestForm.minPartnersPlaceholder')"
              @input="onMinPartnersInput"
            />
            <span v-if="errors['fields.minPartners']" class="error-message">
              {{ errors["fields.minPartners"] }}
            </span>
          </div>

          <div v-if="canEditMaxPartners" class="form-field">
            <label>{{ t("partnerRequestForm.maxPartners") }}</label>
            <input
              :value="maxPartnersInput"
              type="number"
              min="2"
              data-testid="pr-editor.form.max-partners"
              :placeholder="t('partnerRequestForm.maxPartnersPlaceholder')"
              @input="onMaxPartnersInput"
            />
            <span v-if="errors['fields.maxPartners']" class="error-message">
              {{ errors["fields.maxPartners"] }}
            </span>
          </div>

          <div v-if="canEditBudget" class="form-field">
            <label>{{ t("partnerRequestForm.budget") }}</label>
            <input
              v-model="budgetInput"
              type="text"
              data-testid="pr-editor.form.budget"
              :placeholder="t('partnerRequestForm.budgetPlaceholder')"
            />
          </div>

          <PuFormItem
            v-if="canEditPreferences"
            class="form-field"
            :label="t('partnerRequestForm.preferences')"
          >
            <PuChipsEditor
              v-model="preferencesInput"
              data-testid="pr-editor.form.preference-input"
              :placeholder="t('partnerRequestForm.preferencesPlaceholder')"
              :remove-label="t('partnerRequestForm.removePreference')"
              shape="pill"
              add-on-blur
            />
            <div
              v-if="isCreateEditor && authoringOptions?.preferenceTags.length"
              class="authoring-suggestions"
            >
              <span>偏好建议</span>
              <PuButton
                v-for="tag in authoringOptions.preferenceTags"
                :key="tag.label"
                type="button"
                tone="neutral"
                variant="outline"
                size="sm"
                :data-testid="`pr-editor.authoring.preference.${tag.label}`"
                @click="toggleAuthoringPreference(tag.label)"
              >
                {{ tag.label }}
              </PuButton>
            </div>
          </PuFormItem>

          <div v-if="canEditNotes" class="form-field">
            <label>{{ t("partnerRequestForm.notes") }}</label>
            <textarea
              v-model="notesInput"
              data-testid="pr-editor.form.notes"
              :placeholder="t('partnerRequestForm.notesPlaceholder')"
            />
          </div>
        </div>
      </Transition>

      <PuInlineNotice
        tone="error"
        dismissible
        v-if="commandErrorMessage"
        :message="commandErrorMessage"
        @close="resetCommandErrors"
      />
    </template>
  </form>

  <PuDialog
    :open="showReleaseConfirmDialog"
    title="确认移出冲突成员"
    description="这次修改会让部分成员与你选择的新时间冲突。确认后，系统会将这些成员移出本次 PR，并通知他们原因。"
    confirm-text="确认修改并移出"
    tone="error"
    :confirm-loading="isPending"
    @close="closeReleaseConfirmDialog"
    @cancel="closeReleaseConfirmDialog"
    @confirm="confirmReleaseAndSubmit"
  />
  <PRCreateAuthDisclosure
    :open="showAuthDisclosure"
    @cancel="authGate.cancelAuth"
    @confirm="authGate.confirmAuth"
  />
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import {
  PuButton,
  PuChipsEditor,
  PuDialog,
  PuEmptyState,
  PuFormItem,
  PuInlineNotice,
  PuLoadingState,
} from "@partner-up-dev/design-web";
import { useForm } from "vee-validate";
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { type LocationQueryValue, useRoute, useRouter } from "vue-router";
import {
  applyPRAuthoringCreateDefaults,
  resolvePRAuthoringCreateDefaultEligibility,
} from "@/domains/pr/model/authoring";
import { clonePRFields, parseNullableNumber } from "@/domains/pr/model/form";
import type { PRDetailView, PRFormFields } from "@/domains/pr/model/types";
import { toPartnerRequestFields, toUserUpdatePRContentFields } from "@/domains/pr/model/types";
import { useUpdatePRContent } from "@/domains/pr/queries/usePRActions";
import { usePRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import { useCreatePRFromStructured } from "@/domains/pr/queries/usePRCreate";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import DateTimeRangePicker from "@/domains/pr/ui/forms/DateTimeRangePicker.vue";
import PRPlaceModeField, {
  type PRPlaceModeFieldValue,
} from "@/domains/pr/ui/forms/PRPlaceModeField.vue";
import PRCreateAuthDisclosure from "@/domains/pr/ui/sections/PRCreateAuthDisclosure.vue";
import { usePRCreateAuthGate } from "@/domains/pr/use-cases/usePRCreateAuthGate";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { buildPartnerRequestFormValidationSchema } from "@/lib/validation";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import { trackEvent } from "@/shared/telemetry/track";

const props = defineProps<{
  prId?: number;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const resolveTopic = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildCreateInitialFields = (topic: string | null): PRFormFields => ({
  title: undefined,
  type: topic ?? "",
  time: [null, null],
  location: null,
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
});

const buildEditInitialFields = (detail: PRDetailView): PRFormFields => ({
  title: detail.title,
  type: detail.core.type ?? "",
  time: detail.core.time ?? [null, null],
  location: detail.core.location ?? null,
  route: detail.core.route ?? null,
  minPartners: detail.core.minPartners ?? null,
  maxPartners: detail.core.maxPartners ?? null,
  partners: detail.core.partners ?? [],
  budget: detail.core.budget ?? null,
  preferences: detail.core.preferences ?? [],
  notes: detail.core.notes ?? null,
  meetingPoint: detail.core.meetingPoint
    ? {
        description: detail.core.meetingPoint.description,
        imageUrl: detail.core.meetingPoint.imageUrl,
      }
    : null,
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const resolvedPrId = computed<PRId | null>(() => props.prId ?? null);
const isCreateEditor = computed(() => resolvedPrId.value === null);
const detailQuery = usePRDetail(resolvedPrId);
const prDetail = computed(() => detailQuery.data.value);
const isDetailLoading = computed(() => !isCreateEditor.value && detailQuery.isLoading.value);
const detailError = computed(() => (isCreateEditor.value ? null : detailQuery.error.value));

const createMutation = useCreatePRFromStructured();
const updateMutation = useUpdatePRContent();
const showReleaseConfirmDialog = ref(false);
const authGate = usePRCreateAuthGate();
const showAuthDisclosure = authGate.showAuthDisclosure;
const pendingReleasePayload = ref<PartnerRequestFormInput | null>(null);

const baseInitialFields = computed<PRFormFields>(() => {
  const detail = prDetail.value;
  if (detail) return buildEditInitialFields(detail);
  return buildCreateInitialFields(
    resolveTopic(route.query.topic) ?? resolveTopic(route.query.type),
  );
});

const editableFields = computed(() => {
  if (isCreateEditor.value) {
    return new Set([
      "title",
      "type",
      "time",
      "location",
      "route",
      "minPartners",
      "maxPartners",
      "budget",
      "preferences",
      "notes",
    ]);
  }

  const capability = prDetail.value?.editCapability;
  return new Set(capability?.canEdit ? capability.editableFields : []);
});

const canEditTitle = computed(() => editableFields.value.has("title"));
const canEditType = computed(() => editableFields.value.has("type"));
const canEditTime = computed(() => editableFields.value.has("time"));
const canEditPlace = computed(
  () => editableFields.value.has("location") || editableFields.value.has("route"),
);
const canEditMinPartners = computed(() => editableFields.value.has("minPartners"));
const canEditMaxPartners = computed(() => editableFields.value.has("maxPartners"));
const canEditBudget = computed(() => editableFields.value.has("budget"));
const canEditPreferences = computed(() => editableFields.value.has("preferences"));
const canEditNotes = computed(() => editableFields.value.has("notes"));
const hasAdvancedFields = computed(
  () =>
    canEditTime.value ||
    canEditPlace.value ||
    canEditMinPartners.value ||
    canEditMaxPartners.value ||
    canEditBudget.value ||
    canEditPreferences.value ||
    canEditNotes.value,
);
const hasEditableFields = computed(
  () => canEditTitle.value || canEditType.value || hasAdvancedFields.value,
);
const showAdvancedToggle = computed(() => isCreateEditor.value && hasAdvancedFields.value);
const isAdvancedOpen = ref(false);
const showBodyFields = computed(
  () => hasAdvancedFields.value && (!showAdvancedToggle.value || isAdvancedOpen.value),
);

watch(
  isCreateEditor,
  (isCreate) => {
    if (!isCreate) {
      isAdvancedOpen.value = true;
    }
  },
  { immediate: true },
);

const { defineField, values, errors, meta, resetForm, handleSubmit, setFieldValue } =
  useForm<PartnerRequestFormInput>({
    validationSchema: computed(() =>
      buildPartnerRequestFormValidationSchema({
        validateTime: canEditTime.value,
      }),
    ),
    initialValues: {
      fields: clonePRFields(baseInitialFields.value),
    },
  });

const [titleModel] = defineField("fields.title");
const [typeModel] = defineField("fields.type");
const [timeModel] = defineField("fields.time");
const [locationModel] = defineField("fields.location");
const [routeModel] = defineField("fields.route");
const [budgetModel] = defineField("fields.budget");
const [notesModel] = defineField("fields.notes");
const [preferencesModel] = defineField("fields.preferences");

const authoringType = computed(() => {
  if (!isCreateEditor.value) return null;
  const value = typeModel.value?.trim() ?? "";
  return value.length > 0 ? value : null;
});
const authoringQuery = usePRAuthoringOptions(authoringType);
const authoringOptions = computed(() => {
  const options = authoringQuery.data.value;
  return options && options.type === authoringType.value ? options : null;
});

watch(
  baseInitialFields,
  (nextFields) => {
    if (isCreateEditor.value) return;
    resetForm({ values: { fields: clonePRFields(nextFields) } });
  },
  { deep: true },
);

watch([authoringOptions, authoringType], ([options, type]) => {
  if (!isCreateEditor.value || !type || !options || meta.value.dirty) return;
  const current = clonePRFields(values.fields);
  const eligibility = resolvePRAuthoringCreateDefaultEligibility(
    current,
    buildCreateInitialFields(type),
  );
  const next = applyPRAuthoringCreateDefaults(current, options, eligibility);
  resetForm({ values: { fields: next } });
});

const titleInput = computed({
  get: () => titleModel.value ?? "",
  set: (value: string) => {
    titleModel.value = value.trim().length === 0 ? undefined : value;
  },
});

const placeValue = computed<PRPlaceModeFieldValue>({
  get: () => ({
    location: locationModel.value ?? null,
    route: routeModel.value ?? null,
  }),
  set: (value) => {
    locationModel.value = value.location;
    routeModel.value = value.route;
  },
});

const selectAuthoringStart = (startAt: string, endAt: string) => {
  timeModel.value = [startAt, endAt];
};

const formatAuthoringStart = (startAt: string, endAt: string): string =>
  `${new Date(startAt).toLocaleString()} – ${new Date(endAt).toLocaleString()}`;

const selectAuthoringRoute = (event: Event) => {
  const id = (event.target as HTMLSelectElement).value;
  const option = authoringOptions.value?.routeOptions.find((item) => item.id === id);
  if (!option) return;
  placeValue.value = { location: null, route: option.route };
};

const budgetInput = computed({
  get: () => budgetModel.value ?? "",
  set: (value: string) => {
    budgetModel.value = value.trim().length === 0 ? null : value;
  },
});

const notesInput = computed({
  get: () => notesModel.value ?? "",
  set: (value: string) => {
    notesModel.value = value.trim().length === 0 ? null : value;
  },
});

const preferencesInput = computed({
  get: () => preferencesModel.value ?? [],
  set: (value: string[]) => {
    preferencesModel.value = value;
  },
});

const toggleAuthoringPreference = (label: string) => {
  preferencesInput.value = preferencesInput.value.includes(label)
    ? preferencesInput.value.filter((value) => value !== label)
    : [...preferencesInput.value, label];
};

const minPartnersInput = computed(() =>
  values.fields.minPartners === null ? "" : String(values.fields.minPartners),
);
const maxPartnersInput = computed(() =>
  values.fields.maxPartners === null ? "" : String(values.fields.maxPartners),
);

const onMinPartnersInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  setFieldValue("fields.minPartners", parseNullableNumber(value));
};

const onMaxPartnersInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  setFieldValue("fields.maxPartners", parseNullableNumber(value));
};

const timeHint = computed(() => {
  const range = prDetail.value?.editCapability.constraints.timeWindow;
  if (!range) return "";
  return `可调整范围：${formatLocalDateTimeWindowLabel(range)}`;
});

const isPending = computed(() => createMutation.isPending.value || updateMutation.isPending.value);
const commandErrorMessage = computed(
  () => createMutation.error.value?.message || updateMutation.error.value?.message || "",
);
const creationBlocked = computed(
  () => isCreateEditor.value && authoringOptions.value?.creationAllowed === false,
);
const canSubmit = computed(
  () => hasEditableFields.value && !isPending.value && !creationBlocked.value,
);

const resetCommandErrors = () => {
  createMutation.reset();
  updateMutation.reset();
};

const submitCreate = async ({ fields }: PartnerRequestFormInput) => {
  if (!(await authGate.ensureCreateAuth())) return;

  const result = await createMutation.mutateAsync({
    fields: toPartnerRequestFields(fields),
    createSource: "STRUCTURED_FORM",
  });

  await nextTick();
  trackEvent("pr.create.result", {
    prId: result.id,
    status: result.status,
    prType: fields.type,
    actionResult: "success",
  });

  await router.push(`${result.canonicalPath}?entry=create`);
  emit("saved");
};

const submitEditPayload = async (
  payload: PartnerRequestFormInput,
  options: { allowRelease?: boolean } = {},
) => {
  const id = resolvedPrId.value;
  if (id === null) return;

  try {
    await updateMutation.mutateAsync({
      id,
      fields: toUserUpdatePRContentFields(payload.fields),
      allowRelease: options.allowRelease,
    });
    pendingReleasePayload.value = null;
    showReleaseConfirmDialog.value = false;
    emit("saved");
  } catch (error) {
    if (
      options.allowRelease !== true &&
      error instanceof Error &&
      "code" in error &&
      error.code === "PARTICIPANT_RELEASE_REQUIRED"
    ) {
      pendingReleasePayload.value = payload;
      updateMutation.reset();
      showReleaseConfirmDialog.value = true;
      return;
    }
    throw error;
  }
};

const submitEdit = async (payload: PartnerRequestFormInput) => {
  await submitEditPayload(payload);
};

const submitHandler = handleSubmit(async (payload) => {
  if (!canSubmit.value) return;
  if (isCreateEditor.value) {
    await submitCreate(payload);
    return;
  }
  await submitEdit(payload);
});

const submitForm = () => {
  void submitHandler();
};

const closeReleaseConfirmDialog = () => {
  showReleaseConfirmDialog.value = false;
};

const confirmReleaseAndSubmit = async () => {
  const payload = pendingReleasePayload.value;
  if (!payload) return;
  await submitEditPayload(payload, { allowRelease: true });
};

defineExpose({
  canSubmit,
  isPending,
  submitForm,
});
</script>

<style scoped lang="scss" src="./PRForm.scss"></style>
<style scoped lang="scss">
.authoring-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  margin-top: calc(var(--sys-spacing-small) * -1);
  color: var(--sys-color-on-surface-variant);
}
</style>
