<template>
  <AdminPageScaffold class="page" data-testid="admin-ride-hailing.page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel title="网约车服务商">
        <div class="rail-actions">
          <Button
            appearance="pill"
            size="sm"
            type="button"
            data-testid="admin-ride-hailing.create"
            @click="startCreate"
          >
            新建实例
          </Button>
        </div>

        <div v-if="providerInstances.length === 0" class="hint">
          暂无 Provider Instance
        </div>
        <div v-else class="provider-rail-list">
          <ChoiceCard
            v-for="record in providerInstances"
            :key="record.id"
            :active="selectedProviderId === record.id"
            data-testid="admin-ride-hailing.provider-card"
            @click="selectedProviderIdRaw = record.id"
          >
            <span>{{ record.displayName }}</span>
            <small>{{ record.providerType }} / {{ record.instanceKey }}</small>
            <span class="status-pill" :class="{ 'is-disabled': record.status === 'DISABLED' }">
              {{ providerStatusLabel(record.status) }}
            </span>
          </ChoiceCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <ErrorToast
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
          persistent
        />
        <template v-else>
          <BentoItem :title="formTitle" span="full">
            <form class="form-stack" @submit.prevent="handleSave">
              <div class="field-grid">
                <label class="field">
                  <span class="field-label">Provider</span>
                  <select v-model="form.providerType" class="text-input" disabled>
                    <option value="CAOCAO">曹操 CAOCAO</option>
                  </select>
                </label>

                <label class="field">
                  <span class="field-label">Status</span>
                  <select v-model="form.status" class="text-input">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </label>

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
                <Button
                  size="sm"
                  type="submit"
                  :disabled="isSaving"
                  data-testid="admin-ride-hailing.save"
                >
                  {{ isSaving ? "保存中" : "保存" }}
                </Button>
              </div>
            </form>
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
                <dd class="breakable">{{ selectedProvider?.callbackUrl ?? "-" }}</dd>
              </div>
              <div>
                <dt>Updated At</dt>
                <dd>{{ selectedProvider ? formatTimestamp(selectedProvider.updatedAt) : "-" }}</dd>
              </div>
            </dl>
          </BentoItem>

          <ErrorToast
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
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  useAdminRideHailingProviderWorkspace,
  useCreateAdminRideHailingProviderInstance,
  useUpdateAdminRideHailingProviderInstance,
  type AdminRideHailingProviderInstanceInput,
  type AdminRideHailingProviderWorkspaceResponse,
} from "@/domains/admin-ride-hailing/queries/useAdminRideHailing";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import { PuLoadingState } from "@partner-up-dev/design-web";

const CREATE_PROVIDER_ID = "__create__";

type ProviderInstance =
  AdminRideHailingProviderWorkspaceResponse["providerInstances"][number];

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

const providerInstances = computed(
  () => workspaceQuery.data.value?.providerInstances ?? [],
);
const selectedProviderId = computed(
  () =>
    selectedProviderIdRaw.value ||
    providerInstances.value[0]?.id ||
    CREATE_PROVIDER_ID,
);
const selectedProvider = computed(
  () =>
    providerInstances.value.find(
      (record) => record.id === selectedProviderId.value,
    ) ?? null,
);
const isCreateMode = computed(() => selectedProviderId.value === CREATE_PROVIDER_ID);
const isSaving = computed(
  () => createMutation.isPending.value || updateMutation.isPending.value,
);
const formTitle = computed(() =>
  isCreateMode.value ? "新建 Provider Instance" : "编辑 Provider Instance",
);
const signKeyPlaceholder = computed(() =>
  isCreateMode.value ? "新建实例必填" : "留空则保留",
);
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
      provider.config.requestTimeoutMs === null ||
      provider.config.requestTimeoutMs === undefined
        ? ""
        : String(provider.config.requestTimeoutMs),
  };
}

const providerStatusLabel = (status: ProviderInstance["status"]): string =>
  status === "ACTIVE" ? "启用" : "停用";

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
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  createMutation.reset();
  updateMutation.reset();
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
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.stack,
.provider-rail-list,
.form-stack {
  display: flex;
  flex-direction: column;
}

.stack,
.provider-rail-list {
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

.status-pill {
  @include mx.pu-font(caption);
  display: inline-flex;
  width: fit-content;
  padding: calc(var(--sys-spacing-xsmall) / 2) var(--sys-spacing-xsmall);
  border: 1px solid var(--sys-color-primary);
  border-radius: var(--sys-radius-small);
  color: var(--sys-color-primary);
}

.status-pill.is-disabled {
  border-color: var(--sys-color-outline);
  color: var(--sys-color-on-surface-variant);
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
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .field-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
