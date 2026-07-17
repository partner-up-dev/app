<template>
  <AdminPageScaffold class="page" data-testid="admin-ride-hailing.page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel title="网约车服务商">
        <div class="rail-actions">
          <PuButton
            shape="pill"
            size="sm"
            data-testid="admin-ride-hailing.create"
            @click="startCreate"
          >
            新建实例
          </PuButton>
        </div>

        <div v-if="providerInstances.length === 0" class="hint">暂无 Provider Instance</div>
        <div v-else class="provider-rail-list">
          <PuCard
            v-for="record in providerInstances"
            :key="record.id"
            :active="selectedProviderId === record.id"
            data-testid="admin-ride-hailing.provider-card"
            @click="selectedProviderIdRaw = record.id"
            selectable
            variant="outline"
            padding="sm"
            gap="xs"
          >
            <span>{{ record.displayName }}</span>
            <small>{{ record.providerType }} / {{ record.instanceKey }}</small>
            <PuTag
              :text="providerStatusLabel(record.status)"
              :tone="providerStatusTagTone(record.status)"
              variant="outline"
              shape="rect"
              size="xs"
            />
          </PuCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState v-if="workspaceQuery.isLoading.value" :message="t('common.loading')" />
        <PuInlineNotice
          tone="error"
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
        />
        <template v-else>
          <BentoItem :title="formTitle" span="full">
            <form class="form-stack" @submit.prevent="handleSave">
              <div class="field-grid">
                <PuFormItem label="Provider" for-id="admin-ride-hailing-provider">
                  <PuSelect
                    id="admin-ride-hailing-provider"
                    v-model="providerTypeModel"
                    :options="providerTypeOptions"
                    disabled
                  />
                </PuFormItem>

                <PuFormItem label="Status" for-id="admin-ride-hailing-status">
                  <PuSelect
                    id="admin-ride-hailing-status"
                    v-model="providerStatusModel"
                    :options="providerStatusOptions"
                  />
                </PuFormItem>

                <label class="field">
                  <span class="field-label">Instance Key</span>
                  <input
                    v-model="form.instanceKey"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Display Name</span>
                  <input
                    v-model="form.displayName"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Client ID</span>
                  <input
                    v-model="form.caocaoClientId"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Sign Key</span>
                  <input
                    v-model="form.signKey"
                    class="text-input"
                    type="password"
                    autocomplete="new-password"
                    :placeholder="signKeyPlaceholder"
                  />
                </label>

                <label class="field field--wide">
                  <span class="field-label">Endpoint Base URL</span>
                  <input
                    v-model="form.endpointBaseUrl"
                    class="text-input"
                    type="url"
                    autocomplete="off"
                  />
                </label>

                <label class="field field--wide">
                  <span class="field-label">Callback Base URL</span>
                  <input
                    v-model="form.callbackBaseUrl"
                    class="text-input"
                    type="url"
                    autocomplete="off"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Request Timeout ms</span>
                  <input
                    v-model="form.requestTimeoutMs"
                    class="text-input"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    step="1"
                  />
                </label>
              </div>

              <div class="inline-actions">
                <PuButton
                  size="sm"
                  :action="{ native: 'submit' }"
                  :disabled="isSaving"
                  data-testid="admin-ride-hailing.save"
                >
                  {{ isSaving ? "保存中" : "保存" }}
                </PuButton>
              </div>
            </form>
          </BentoItem>

          <BentoItem v-if="showFakeCaocaoDevTools" title="开发调试" span="full">
            <div class="dev-tool-card">
              <p class="hint">
                直接调用当前 Provider Instance Endpoint 上的 fake Caocao 控制接口。
              </p>
              <div class="inline-actions">
                <PuButton
                  size="sm"
                  tone="neutral"
                  variant="outline"
                  :loading="isMutatingFakePhase"
                  :disabled="isMutatingFakePhase"
                  data-testid="admin-ride-hailing.dev.advance-phase"
                  @click="advanceFakeCaocaoPhase"
                >
                  推进最新订单状态
                </PuButton>
                <PuButton
                  size="sm"
                  tone="neutral"
                  variant="outline"
                  :loading="isMutatingFakePhase"
                  :disabled="isMutatingFakePhase"
                  data-testid="admin-ride-hailing.dev.retreat-phase"
                  @click="retreatFakeCaocaoPhase"
                >
                  回退最新订单状态
                </PuButton>
              </div>
              <PuInlineNotice
                v-if="fakePhaseControlResultMessage"
                tone="success"
                :message="fakePhaseControlResultMessage"
                data-testid="admin-ride-hailing.dev.phase-control.result"
              />
              <PuInlineNotice
                v-if="fakePhaseControlErrorMessage"
                tone="error"
                :message="fakePhaseControlErrorMessage"
                data-testid="admin-ride-hailing.dev.phase-control.error"
              />
            </div>
          </BentoItem>

          <BentoItem title="实例输出" span="full">
            <dl class="summary-grid">
              <div>
                <dt>Provider Instance ID</dt>
                <dd>{{ selectedProvider?.id ?? "-" }}</dd>
              </div>
              <div>
                <dt>Sign Key</dt>
                <dd>{{ signKeyStateLabel }}</dd>
              </div>
              <div>
                <dt>Callback URL</dt>
                <dd class="breakable">
                  {{ selectedProvider?.callbackUrl ?? "-" }}
                </dd>
              </div>
              <div>
                <dt>Updated At</dt>
                <dd>
                  {{ selectedProvider ? formatTimestamp(selectedProvider.updatedAt) : "-" }}
                </dd>
              </div>
            </dl>
          </BentoItem>

          <PuInlineNotice
            tone="error"
            dismissible
            v-if="pageErrorMessage"
            :message="pageErrorMessage"
            @close="clearErrors"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuCard,
  PuFormItem,
  PuInlineNotice,
  PuLoadingState,
  PuSelect,
  type PuSelectOption,
  type PuSelectValue,
  PuTag,
} from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  type AdminRideHailingProviderInstanceInput,
  type AdminRideHailingProviderWorkspaceResponse,
  useAdminRideHailingProviderWorkspace,
  useCreateAdminRideHailingProviderInstance,
  useUpdateAdminRideHailingProviderInstance,
} from "@/domains/admin-ride-hailing/queries/useAdminRideHailing";

const CREATE_PROVIDER_ID = "__create__";

type ProviderInstance = AdminRideHailingProviderWorkspaceResponse["providerInstances"][number];

type ProviderForm = {
  providerType: "CAOCAO";
  instanceKey: string;
  displayName: string;
  status: "ACTIVE" | "DISABLED";
  caocaoClientId: string;
  signKey: string;
  endpointBaseUrl: string;
  callbackBaseUrl: string;
  requestTimeoutMs: string;
};

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminRideHailingProviderWorkspace(isAdmin);
const createMutation = useCreateAdminRideHailingProviderInstance();
const updateMutation = useUpdateAdminRideHailingProviderInstance();

const selectedProviderIdRaw = ref("");
const form = ref<ProviderForm>(createBlankForm());
const localErrorMessage = ref<string | null>(null);
const isMutatingFakePhase = ref(false);
const fakePhaseControlResultMessage = ref<string | null>(null);
const fakePhaseControlErrorMessage = ref<string | null>(null);

const providerInstances = computed(() => workspaceQuery.data.value?.providerInstances ?? []);
const selectedProviderId = computed(
  () => selectedProviderIdRaw.value || providerInstances.value[0]?.id || CREATE_PROVIDER_ID,
);
const selectedProvider = computed(
  () => providerInstances.value.find((record) => record.id === selectedProviderId.value) ?? null,
);
const isCreateMode = computed(() => selectedProviderId.value === CREATE_PROVIDER_ID);
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value);
const showFakeCaocaoDevTools = computed(
  () => import.meta.env.DEV && selectedProvider.value !== null && !isCreateMode.value,
);
const formTitle = computed(() =>
  isCreateMode.value ? "新建 Provider Instance" : "编辑 Provider Instance",
);
const providerTypeOptions = computed<PuSelectOption[]>(() => [
  { label: "曹操 CAOCAO", value: "CAOCAO" },
]);
const providerStatusOptions = computed<PuSelectOption[]>(() => [
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "DISABLED", value: "DISABLED" },
]);
const signKeyPlaceholder = computed(() => (isCreateMode.value ? "新建实例必填" : "留空则保留"));
const signKeyStateLabel = computed(() => {
  if (isCreateMode.value) return "-";
  return selectedProvider.value?.config.signKeyConfigured ? "已配置" : "未配置";
});
const pageErrorMessage = computed(
  () =>
    localErrorMessage.value ||
    createMutation.error.value?.message ||
    updateMutation.error.value?.message ||
    null,
);

function createBlankForm(): ProviderForm {
  return {
    providerType: "CAOCAO",
    instanceKey: "",
    displayName: "",
    status: "ACTIVE",
    caocaoClientId: "",
    signKey: "",
    endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
    callbackBaseUrl: "",
    requestTimeoutMs: "",
  };
}

function formFromProvider(provider: ProviderInstance): ProviderForm {
  return {
    providerType: provider.providerType,
    instanceKey: provider.instanceKey,
    displayName: provider.displayName,
    status: provider.status,
    caocaoClientId: provider.config.caocaoClientId,
    signKey: "",
    endpointBaseUrl: provider.config.endpointBaseUrl,
    callbackBaseUrl: provider.config.callbackBaseUrl ?? "",
    requestTimeoutMs:
      provider.config.requestTimeoutMs === null || provider.config.requestTimeoutMs === undefined
        ? ""
        : String(provider.config.requestTimeoutMs),
  };
}

const providerStatusLabel = (status: ProviderInstance["status"]): string =>
  status === "ACTIVE" ? "启用" : "停用";

const providerStatusTagTone = (status: ProviderInstance["status"]) =>
  status === "ACTIVE" ? "primary" : "neutral";

const providerTypeModel = computed({
  get: () => form.value.providerType,
  set: (value: PuSelectValue) => {
    if (value === "CAOCAO") {
      form.value.providerType = value;
    }
  },
});

const providerStatusModel = computed({
  get: () => form.value.status,
  set: (value: PuSelectValue) => {
    if (value === "ACTIVE" || value === "DISABLED") {
      form.value.status = value;
    }
  },
});

const normalizeOptionalString = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseRequestTimeout = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Request Timeout ms 必须为正整数");
  }
  return parsed;
};

const buildInput = (): AdminRideHailingProviderInstanceInput => {
  const signKey = normalizeOptionalString(form.value.signKey);
  if (isCreateMode.value && !signKey) {
    throw new Error("新建实例需要填写 Sign Key");
  }

  return {
    providerType: form.value.providerType,
    instanceKey: form.value.instanceKey.trim(),
    displayName: form.value.displayName.trim(),
    status: form.value.status,
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: form.value.caocaoClientId.trim(),
      signKey,
      endpointBaseUrl: form.value.endpointBaseUrl.trim(),
      callbackBaseUrl: normalizeOptionalString(form.value.callbackBaseUrl),
      requestTimeoutMs: parseRequestTimeout(form.value.requestTimeoutMs),
    },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringField = (value: unknown, key: string): string | null =>
  isRecord(value) && typeof value[key] === "string" ? value[key] : null;

const readNumberField = (value: unknown, key: string): number | null =>
  isRecord(value) && typeof value[key] === "number" ? value[key] : null;

const buildFakeControlUrl = (provider: ProviderInstance, path: string): string => {
  const baseUrl = provider.config.endpointBaseUrl.trim();
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
};

const readFakeCaocaoCallbackErrorMessage = (payload: unknown): string | null => {
  if (!isRecord(payload) || !isRecord(payload.callback)) return null;
  const callbackMessage = readStringField(payload.callback, "message");
  const callbackStatus = readNumberField(payload.callback, "status");
  const callbackBodyPreview = readStringField(payload.callback, "bodyPreview");
  const deliveryMessage =
    callbackMessage ??
    (callbackStatus === null
      ? null
      : `Fake Caocao callback POST failed with HTTP ${callbackStatus}`);
  if (!deliveryMessage) return callbackBodyPreview;
  return callbackBodyPreview ? `${deliveryMessage}: ${callbackBodyPreview}` : deliveryMessage;
};

const readFakeCaocaoFailedOrderMessage = (payload: unknown): string | null => {
  if (!isRecord(payload) || !isRecord(payload.order)) return null;
  const providerOrderId = readStringField(payload.order, "providerOrderId");
  const phase = readStringField(payload.order, "phase");
  if (!providerOrderId || !phase) return null;
  return `fake provider 已变更 ${providerOrderId} 到 ${phase}`;
};

const readFakeCaocaoErrorMessage = (payload: unknown): string | null => {
  const baseMessage = readStringField(payload, "message") || readStringField(payload, "detail");
  const callbackMessage = readFakeCaocaoCallbackErrorMessage(payload);
  const failureMessage =
    baseMessage && callbackMessage
      ? `${baseMessage}: ${callbackMessage}`
      : (baseMessage ?? callbackMessage);
  const orderMessage = readFakeCaocaoFailedOrderMessage(payload);
  if (orderMessage && failureMessage) return `${orderMessage}；${failureMessage}`;
  return failureMessage ?? orderMessage;
};

const readFakeCaocaoCallbackSuccessMessage = (payload: unknown): string | null => {
  if (!isRecord(payload) || !isRecord(payload.callback)) return null;
  if (payload.callback.skipped === true) return "callback 未配置";
  if (payload.callback.ok === true) {
    const status = readNumberField(payload.callback, "status");
    return status === null ? "callback 已送达" : `callback HTTP ${status}`;
  }
  return null;
};

const readFakeCaocaoPhaseControlResult = (
  payload: unknown,
): {
  callbackMessage: string | null;
  providerOrderId: string;
  phase: string;
} => {
  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.order)) {
    throw new Error("Fake Caocao phase control response is invalid");
  }
  const providerOrderId = readStringField(payload.order, "providerOrderId");
  const phase = readStringField(payload.order, "phase");
  if (!providerOrderId || !phase) {
    throw new Error("Fake Caocao phase control response is incomplete");
  }
  return {
    callbackMessage: readFakeCaocaoCallbackSuccessMessage(payload),
    phase,
    providerOrderId,
  };
};

const phaseLabel = (phase: string): string => {
  if (phase === "CREATED") return "已创建";
  if (phase === "ACCEPTED") return "接客中";
  if (phase === "IN_TRIP") return "行程中";
  if (phase === "FINISHED") return "已完成";
  if (phase === "CANCELLED") return "已取消";
  return phase;
};

const startCreate = () => {
  selectedProviderIdRaw.value = CREATE_PROVIDER_ID;
};

const handleSave = async () => {
  clearErrors();
  try {
    const input = buildInput();
    const saved = isCreateMode.value
      ? await createMutation.mutateAsync(input)
      : await updateMutation.mutateAsync({
          providerInstanceId: selectedProviderId.value,
          input,
        });
    selectedProviderIdRaw.value = saved.id;
    form.value = formFromProvider(saved);
  } catch (error) {
    localErrorMessage.value = error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  createMutation.reset();
  updateMutation.reset();
};

const clearFakePhaseControlFeedback = () => {
  fakePhaseControlResultMessage.value = null;
  fakePhaseControlErrorMessage.value = null;
};

type FakeCaocaoPhaseControlAction = "advance" | "retreat";

const fakeCaocaoPhaseControlActionLabel = (action: FakeCaocaoPhaseControlAction): string =>
  action === "advance" ? "推进" : "回退";

const mutateFakeCaocaoPhase = async (action: FakeCaocaoPhaseControlAction): Promise<void> => {
  clearFakePhaseControlFeedback();
  const provider = selectedProvider.value;
  if (!provider) return;
  isMutatingFakePhase.value = true;
  const actionLabel = fakeCaocaoPhaseControlActionLabel(action);
  try {
    const response = await fetch(
      buildFakeControlUrl(provider, `/__fake_caocao/orders/latest/${action}`),
      {
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new Error(
        readFakeCaocaoErrorMessage(payload) ?? `${actionLabel} fake 曹操订单状态失败`,
      );
    }
    const result = readFakeCaocaoPhaseControlResult(payload);
    const callbackSuffix = result.callbackMessage ? `（${result.callbackMessage}）` : "";
    fakePhaseControlResultMessage.value = `已${actionLabel} ${result.providerOrderId} 到 ${phaseLabel(result.phase)}${callbackSuffix}`;
  } catch (error) {
    fakePhaseControlErrorMessage.value =
      error instanceof Error ? error.message : `${actionLabel} fake 曹操订单状态失败`;
  } finally {
    isMutatingFakePhase.value = false;
  }
};

const advanceFakeCaocaoPhase = async (): Promise<void> => {
  await mutateFakeCaocaoPhase("advance");
};

const retreatFakeCaocaoPhase = async (): Promise<void> => {
  await mutateFakeCaocaoPhase("retreat");
};

const formatTimestamp = (value: Date | string): string =>
  new Date(value).toLocaleString("zh-CN", { hour12: false });

watch(
  providerInstances,
  (nextInstances) => {
    if (
      selectedProviderIdRaw.value &&
      selectedProviderIdRaw.value !== CREATE_PROVIDER_ID &&
      !nextInstances.some((record) => record.id === selectedProviderIdRaw.value)
    ) {
      selectedProviderIdRaw.value = "";
    }
  },
  { immediate: true },
);

watch(
  selectedProviderId,
  () => {
    form.value = selectedProvider.value
      ? formFromProvider(selectedProvider.value)
      : createBlankForm();
    clearErrors();
    clearFakePhaseControlFeedback();
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.stack,
.provider-rail-list,
.form-stack,
.dev-tool-card {
  display: flex;
  flex-direction: column;
}

.stack,
.provider-rail-list,
.dev-tool-card {
  gap: var(--sys-spacing-medium);
}

.form-stack {
  gap: var(--sys-spacing-large);
}

.rail-actions {
  display: flex;
  justify-content: flex-end;
}

.field-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
}

.summary-grid {
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field--wide {
  grid-column: 1 / -1;
}

.field-label,
.hint,
small,
.summary-grid dt {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.summary-grid dd {
  min-width: 0;
  margin: 0;
  @include mx.pu-font(section);
}

.breakable {
  overflow-wrap: anywhere;
}

.text-input {
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.inline-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .field-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
