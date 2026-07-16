<template>
  <BentoItem
    id="pr-type-config-discovery"
    :title="title"
    span="full"
    data-testid="admin-pr-type-config.slice.discovery"
  >
    <div class="grid-2">
      <label class="field">
        <span class="field-label">{{ titleLabel }}</span>
        <input
          :value="discovery.title"
          class="field-input"
          @input="update({ title: inputValue($event) })"
        />
      </label>
      <label class="field">
        <span class="field-label">{{ coverImageLabel }}</span>
        <input
          :value="discovery.coverImage ?? ''"
          class="field-input"
          @input="update({ coverImage: inputValue($event) || null })"
        />
      </label>
      <label class="field field--full">
        <span class="field-label">{{ descriptionLabel }}</span>
        <textarea
          :value="discovery.description ?? ''"
          class="field-input field-textarea"
          @input="update({ description: inputValue($event) || null })"
        />
      </label>
      <NumberField
        v-for="mode in modes"
        :key="mode"
        :label="`${mode} ${ratioLabel}`"
        :value="discovery.viewRatios[mode]"
        :min="0"
        @update="updateRatio(mode, $event)"
      />
    </div>
    <p class="hint">{{ ratioHint }}</p>
    <p v-if="hasNumberErrors" class="error-text">
      {{ Object.values(numberErrors).join("；") }}
    </p>
    <div v-if="existing" class="actions actions--inline slice-actions">
      <PuButton
        :disabled="pending || hasNumberErrors"
        data-testid="admin-pr-type-config.slice.discovery.save"
        @click="$emit('save')"
      >
        {{ pending ? savingLabel : saveLabel }}
      </PuButton>
      <PuInlineNotice v-if="error" tone="error" :message="error" />
    </div>
  </BentoItem>
</template>

<script setup lang="ts">
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { normalizeRequiredNumber } from "@/domains/admin/model/pr-type-config-editor";
import type { AdminPRTypeConfigDiscovery } from "@/domains/admin/queries/useAdminPRTypeConfigs";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import NumberField from "./PRTypeConfigNumberField.vue";

type Mode = keyof AdminPRTypeConfigDiscovery["viewRatios"];
const modes: Mode[] = ["FORM", "CARD", "LIST"];
const props = defineProps<{
  title: string;
  titleLabel: string;
  coverImageLabel: string;
  descriptionLabel: string;
  ratioLabel: string;
  ratioHint: string;
  savingLabel: string;
  saveLabel: string;
  discovery: AdminPRTypeConfigDiscovery;
  existing: boolean;
  pending: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  "update:discovery": [value: AdminPRTypeConfigDiscovery];
  "validation-change": [invalid: boolean];
  save: [];
}>();
const numberErrors = ref<Partial<Record<Mode, string>>>({});
const hasNumberErrors = computed(() => Object.keys(numberErrors.value).length > 0);
const inputValue = (event: Event) => (event.target as HTMLInputElement | HTMLTextAreaElement).value;
const update = (patch: Partial<AdminPRTypeConfigDiscovery>) =>
  emit("update:discovery", { ...props.discovery, ...patch });
const updateRatio = (mode: Mode, value: string | number | null) => {
  const normalized = normalizeRequiredNumber(value);
  if (normalized === undefined || normalized < 0) {
    numberErrors.value[mode] = "请输入有效的非负整数";
    emit("validation-change", true);
    return;
  }
  delete numberErrors.value[mode];
  emit("validation-change", hasNumberErrors.value);
  update({ viewRatios: { ...props.discovery.viewRatios, [mode]: normalized } });
};
</script>
