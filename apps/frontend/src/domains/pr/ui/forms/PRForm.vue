<template>
  <form
    :id="formId"
    class="partner-request-form"
    data-testid="pr-create.form"
    @submit.prevent="submitForm"
  >
    <div class="form-field">
      <label>{{ t("partnerRequestForm.title") }}</label>
      <input
        v-model="titleInput"
        type="text"
        data-testid="pr-create.form.title"
        :placeholder="t('partnerRequestForm.titlePlaceholder')"
      />
    </div>

    <div class="form-field">
      <label
        >{{ t("partnerRequestForm.type") }}
        <span class="required">{{
          t("partnerRequestForm.requiredMark")
        }}</span></label
      >
      <input
        v-model="typeModel"
        type="text"
        data-testid="pr-create.form.type"
        :placeholder="t('partnerRequestForm.typePlaceholder')"
        :readonly="!typeEditable"
        :aria-readonly="!typeEditable"
      />
      <span v-if="!typeEditable" class="field-hint">
        {{ t("partnerRequestForm.typeImmutableHint") }}
      </span>
      <span v-if="errors['fields.type']" class="error-message">
        {{ errors["fields.type"] }}
      </span>
    </div>

    <Button
      type="button"
      class="advanced-toggle"
      tone="dashed"
      block
      data-testid="pr-create.form.advanced-toggle"
      :aria-expanded="isAdvancedOpen"
      @click="isAdvancedOpen = !isAdvancedOpen"
    >
      {{
        isAdvancedOpen
          ? t("partnerRequestForm.advancedHide")
          : t("partnerRequestForm.advancedShow")
      }}
    </Button>

    <Transition name="advanced-fields">
      <div v-if="isAdvancedOpen" class="advanced-section">
        <DateTimeRangePicker v-if="showTimeField" v-model="timeModel" />

        <PRPlaceModeField
          v-model="placeValue"
          :label="t('partnerRequestForm.placeMode')"
          :aria-label="t('partnerRequestForm.placeModeAria')"
          :location-label="t('partnerRequestForm.location')"
          :location-placeholder="t('partnerRequestForm.locationPlaceholder')"
          :location-error="errors['fields.location']"
          :route-error="errors['fields.route']"
          test-id-prefix="pr-create.form.place"
        />

        <div class="form-field">
          <label>{{ t("partnerRequestForm.minPartners") }}</label>
          <input
            :value="minPartnersInput"
            type="number"
            min="1"
            data-testid="pr-create.form.min-partners"
            :placeholder="t('partnerRequestForm.minPartnersPlaceholder')"
            @input="onMinPartnersInput"
          />
          <span v-if="errors['fields.minPartners']" class="error-message">
            {{ errors["fields.minPartners"] }}
          </span>
        </div>

        <div class="form-field">
          <label>{{ t("partnerRequestForm.maxPartners") }}</label>
          <input
            :value="maxPartnersInput"
            type="number"
            min="2"
            data-testid="pr-create.form.max-partners"
            :placeholder="t('partnerRequestForm.maxPartnersPlaceholder')"
            @input="onMaxPartnersInput"
          />
          <span v-if="errors['fields.maxPartners']" class="error-message">
            {{ errors["fields.maxPartners"] }}
          </span>
        </div>

        <div v-if="showBudgetField" class="form-field">
          <label>{{ t("partnerRequestForm.budget") }}</label>
          <input
            v-model="budgetInput"
            type="text"
            data-testid="pr-create.form.budget"
            :placeholder="t('partnerRequestForm.budgetPlaceholder')"
          />
        </div>

        <div class="form-field">
          <label>{{ t("partnerRequestForm.preferences") }}</label>
          <div class="tags-input">
            <div class="tags">
              <span
                v-for="(pref, index) in preferencesModel"
                :key="index"
                class="tag"
              >
                {{ pref }}
                <button
                  type="button"
                  class="remove-tag"
                  @click="removePreference(index)"
                >
                  {{ t("partnerRequestForm.removePreference") }}
                </button>
              </span>
            </div>
            <input
              v-model="newPreference"
              type="text"
              data-testid="pr-create.form.preference-input"
              :placeholder="t('partnerRequestForm.preferencesPlaceholder')"
              @keydown.enter.prevent="addPreference"
            />
          </div>
        </div>

        <div class="form-field">
          <label>{{ t("partnerRequestForm.notes") }}</label>
          <textarea
            v-model="notesInput"
            rows="3"
            data-testid="pr-create.form.notes"
            :placeholder="t('partnerRequestForm.notesPlaceholder')"
          />
        </div>
      </div>
    </Transition>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useForm } from "vee-validate";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { buildPartnerRequestFormValidationSchema } from "@/lib/validation";
import DateTimeRangePicker from "@/domains/pr/ui/forms/DateTimeRangePicker.vue";
import PRPlaceModeField, {
  type PRPlaceModeFieldValue,
} from "@/domains/pr/ui/forms/PRPlaceModeField.vue";
import type { PRFormFields } from "@/domains/pr/model/types";
import { clonePRFields, parseNullableNumber } from "@/domains/pr/model/form";
import Button from "@/shared/ui/actions/Button.vue";

const props = withDefaults(
  defineProps<{
    formId?: string;
    initialFields: PRFormFields;
    showBudgetField?: boolean;
    showTimeField?: boolean;
    typeEditable?: boolean;
  }>(),
  {
    showBudgetField: true,
    showTimeField: true,
    typeEditable: true,
  },
);
const { t } = useI18n();

const emit = defineEmits<{
  submit: [payload: PartnerRequestFormInput];
}>();

const {
  defineField,
  values,
  errors,
  resetForm,
  handleSubmit,
  setFieldValue,
  meta,
} = useForm<PartnerRequestFormInput>({
  validationSchema: computed(() =>
    buildPartnerRequestFormValidationSchema({
      validateTime: props.showTimeField,
    }),
  ),
  initialValues: {
    fields: clonePRFields(props.initialFields),
  },
});

watch(
  () => props.initialFields,
  (nextFields) => {
    resetForm({
      values: {
        fields: clonePRFields(nextFields),
      },
    });
  },
  { deep: true },
);

const [titleModel] = defineField("fields.title");
const [typeModel] = defineField("fields.type");
const [timeModel] = defineField("fields.time");
const [locationModel] = defineField("fields.location");
const [routeModel] = defineField("fields.route");
const [budgetModel] = defineField("fields.budget");
const [notesModel] = defineField("fields.notes");
const [preferencesModel] = defineField("fields.preferences");

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

const minPartnersInput = computed(() =>
  values.fields.minPartners === null ? "" : String(values.fields.minPartners),
);
const maxPartnersInput = computed(() =>
  values.fields.maxPartners === null ? "" : String(values.fields.maxPartners),
);

const onMinPartnersInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const nextMin = parseNullableNumber(value);
  setFieldValue("fields.minPartners", nextMin);
};

const onMaxPartnersInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const nextMax = parseNullableNumber(value);
  setFieldValue("fields.maxPartners", nextMax);
};

const newPreference = ref("");
const isAdvancedOpen = ref(false);

const addPreference = () => {
  const pref = newPreference.value.trim();
  if (!pref || preferencesModel.value.includes(pref)) return;
  preferencesModel.value = [...preferencesModel.value, pref];
  newPreference.value = "";
};

const removePreference = (index: number) => {
  preferencesModel.value = preferencesModel.value.filter((_, i) => i !== index);
};

const submitForm = handleSubmit((formValues) => {
  emit("submit", formValues);
});

const canSubmit = computed(() => meta.value.valid);

defineExpose({
  submitForm,
  canSubmit,
});
</script>

<style scoped lang="scss" src="./PRForm.scss"></style>
