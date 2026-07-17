<template>
  <div class="join-gates">
    <p v-if="loading" class="gate-text">正在读取前置项...</p>

    <template v-else-if="activeGate?.kind === 'JOIN_NOTICE'">
      <h3 class="gate-title">{{ activeGate.title }}</h3>
      <div class="notice-body">
        {{ activeGate.body }}
      </div>
      <div class="gate-actions">
        <PuButton
          tone="neutral"
          variant="soft"
          :disabled="interactionPending"
          data-testid="pr-detail.join-gate.join-notice.cancel"
          @click="emit('cancel')"
        >
          取消
        </PuButton>
        <PuButton
          :loading="interactionPending"
          data-testid="pr-detail.join-gate.join-notice.accept"
          @click="resolveJoinNotice(activeGate)"
        >
          同意
        </PuButton>
      </div>
    </template>

    <component
      :is="fallbackConfirmGate"
      v-else-if="showFallbackConfirm"
      :pending="interactionPending"
      @cancel="emit('cancel')"
      @confirm="emitCompletedOnce"
    />

    <p v-if="visibleError" class="action-error">{{ visibleError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import {
  usePRJoinGates,
  type PRJoinGateProjectionItem,
  type ResolvePRJoinGateResponse,
} from "@/domains/pr/queries/usePRJoinGates";
import { PuButton } from "@partner-up-dev/design-web";

type JoinNoticeGate = Extract<PRJoinGateProjectionItem, { kind: "JOIN_NOTICE" }>;

const props = defineProps<{
  prId: PRId | null;
  enabled: boolean;
  pending: boolean;
  error: string | null;
  fallbackConfirmGate: Component;
}>();

const emit = defineEmits<{
  cancel: [];
  completed: [];
  error: [message: string];
  resolved: [result: ResolvePRJoinGateResponse];
}>();

const { t } = useI18n();
const completionEmitted = ref(false);
const prIdRef = computed(() => props.prId);
const enabledRef = computed(() => props.enabled);
const joinGatesQuery = usePRJoinGates(prIdRef, enabledRef);

const gates = computed(() => joinGatesQuery.data.value?.gates ?? []);
const activeGate = computed(() => gates.value.find((gate) => !gate.resolved) ?? null);
const loading = computed(
  () => props.enabled && joinGatesQuery.isFetching.value && joinGatesQuery.data.value === undefined,
);
const interactionPending = computed(
  () =>
    props.pending || joinGatesQuery.isFetching.value || joinGatesQuery.resolveGate.isPending.value,
);
const queryErrorMessage = computed(() => {
  const error = joinGatesQuery.error.value;
  return error instanceof Error ? error.message : null;
});
const visibleError = computed(() => props.error ?? queryErrorMessage.value ?? null);
const showFallbackConfirm = computed(
  () => props.enabled && !loading.value && !queryErrorMessage.value && gates.value.length === 0,
);
const allConfiguredGatesResolved = computed(
  () =>
    props.enabled &&
    !loading.value &&
    !queryErrorMessage.value &&
    gates.value.length > 0 &&
    activeGate.value === null,
);

const emitCompletedOnce = (): void => {
  if (completionEmitted.value) return;
  completionEmitted.value = true;
  emit("completed");
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const resolveJoinNotice = async (gate: JoinNoticeGate): Promise<void> => {
  if (props.prId === null || interactionPending.value) return;
  try {
    const result = await joinGatesQuery.resolveGate.mutateAsync({
      id: props.prId,
      gateKey: gate.key,
      payload: {
        kind: "JOIN_NOTICE",
        version: gate.version,
        accepted: true,
      },
    });
    emit("resolved", result);
  } catch (error) {
    emit("error", resolveErrorMessage(error));
  }
};

watch(
  () => [props.enabled, props.prId] as const,
  () => {
    completionEmitted.value = false;
    joinGatesQuery.resolveGate.reset();
  },
);

watch(queryErrorMessage, (message) => {
  if (message) {
    emit("error", message);
  }
});

watch(allConfiguredGatesResolved, (resolved) => {
  if (resolved) {
    emitCompletedOnce();
  }
});
</script>

<style lang="scss" scoped>
.join-gates {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.gate-title {
  margin: 0;
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.gate-text {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.notice-body {
  max-height: min(52vh, 420px);
  overflow: auto;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  white-space: pre-wrap;
}

.gate-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.gate-actions > button {
  flex: 1 1 140px;
}

.action-error {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}
</style>
