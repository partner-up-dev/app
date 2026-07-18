<template>
  <section class="join-gate-editor">
    <div class="join-gate-editor__header">
      <div>
        <h3 class="join-gate-editor__title">加入门槛</h3>
        <p class="join-gate-editor__hint">Join Notice 会在加入前展示，同意后继续加入流程。</p>
      </div>
      <div class="join-gate-editor__actions">
        <PuButton shape="pill" tone="neutral" variant="outline" size="sm" @click="addJoinNotice">
          添加 Join Notice
        </PuButton>
      </div>
    </div>

    <p v-if="normalizedGates.length === 0" class="join-gate-editor__hint">
      当前没有自定义加入门槛，加入时会展示默认确认。
    </p>

    <article
      v-for="(gate, index) in normalizedGates"
      :key="`${gate.kind}:${gate.key}:${index}`"
      class="join-gate-row"
    >
      <div class="join-gate-row__header">
        <strong>{{ gate.kind }}</strong>
        <PuButton shape="pill" tone="danger" variant="outline" size="sm" @click="removeGate(index)">
          删除
        </PuButton>
      </div>

      <div class="join-gate-row__grid">
        <PuFormItem label="key">
          <PuInput
            :model-value="gate.key"
            @update:model-value="(value) => updateGateKey(index, value)"
          />
        </PuFormItem>

        <PuFormItem label="version">
          <PuInput
            :model-value="gate.version"
            @update:model-value="(value) => updateGateVersion(index, value)"
          />
        </PuFormItem>

        <PuFormItem label="标题" class="field--full">
          <PuInput
            :model-value="gate.title"
            @update:model-value="(value) => updateGateTitle(index, value)"
          />
        </PuFormItem>

        <PuFormItem v-if="gate.kind === 'JOIN_NOTICE'" label="须知正文" class="field--full">
          <PuTextarea
            :model-value="gate.body"
            rows="5"
            @update:model-value="(value) => updateJoinNoticeBody(index, value)"
          />
        </PuFormItem>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  PRJoinNoticeGateConfig,
} from "@partner-up-dev/backend/contracts";
import { PuButton, PuFormItem, PuInput, PuTextarea } from "@partner-up-dev/design-web";

const props = defineProps<{
  modelValue: PRJoinGateConfig;
  source: PRJoinGateSource;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PRJoinGateConfig];
}>();

const normalizedGates = computed(() => props.modelValue.map((gate) => normalizeGateSource(gate)));

const normalizeGateSource = (gate: PRJoinGateConfigItem): PRJoinGateConfigItem => {
  return {
    kind: "JOIN_NOTICE",
    key: gate.key,
    version: gate.version,
    title: gate.title,
    source: props.source,
    body: gate.body,
  };
};

const commit = (gates: PRJoinGateConfig): void => {
  emit(
    "update:modelValue",
    gates.map((gate) => normalizeGateSource(gate)),
  );
};

const updateGateAt = (index: number, gate: PRJoinGateConfigItem): void => {
  const next = [...normalizedGates.value];
  next[index] = normalizeGateSource(gate);
  commit(next);
};

const updateGateKey = (index: number, value: string): void => {
  const gate = normalizedGates.value[index];
  if (!gate) return;
  updateGateAt(index, {
    ...gate,
    key: value,
  });
};

const updateGateVersion = (index: number, value: string): void => {
  const gate = normalizedGates.value[index];
  if (!gate) return;
  updateGateAt(index, {
    ...gate,
    version: value,
  });
};

const updateGateTitle = (index: number, value: string): void => {
  const gate = normalizedGates.value[index];
  if (!gate) return;
  updateGateAt(index, {
    ...gate,
    title: value,
  });
};

const updateJoinNoticeBody = (index: number, value: string): void => {
  const gate = normalizedGates.value[index];
  if (!gate || gate.kind !== "JOIN_NOTICE") return;
  updateGateAt(index, {
    ...gate,
    body: value,
  });
};

const addJoinNotice = (): void => {
  const sequence = normalizedGates.value.length + 1;
  const gate: PRJoinNoticeGateConfig = {
    kind: "JOIN_NOTICE",
    key: `join-notice-${Date.now()}`,
    version: "1",
    title: `加入须知 ${sequence}`,
    source: props.source,
    body: "",
  };
  commit([...normalizedGates.value, gate]);
};

const removeGate = (index: number): void => {
  commit(normalizedGates.value.filter((_, gateIndex) => gateIndex !== index));
};
</script>

<style lang="scss" scoped>
.join-gate-editor,
.join-gate-row {
  display: flex;
  flex-direction: column;
}

.join-gate-editor {
  gap: var(--sys-spacing-small);
}

.join-gate-editor__header,
.join-gate-row__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.join-gate-editor__title {
  margin: 0;
  @include mx.pu-font(section);
}

.join-gate-editor__hint {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.join-gate-editor__actions {
  display: flex;
  gap: var(--sys-spacing-xsmall);
  flex-wrap: wrap;
}

.join-gate-row {
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

.join-gate-row__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sys-spacing-small);
}

.field--full {
  grid-column: 1 / -1;
}
</style>
