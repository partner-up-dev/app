<template>
  <AdminPageScaffold class="page" data-testid="admin-payment.page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel title="支付服务商">
        <div class="rail-actions">
          <Button
            appearance="pill"
            size="sm"
            type="button"
            data-testid="admin-payment.create"
            @click="startCreate"
          >
            新建实例
          </Button>
        </div>

        <div v-if="providerInstances.length === 0" class="hint">
          暂无 Payment Provider Instance
        </div>
        <div v-else class="provider-rail-list">
          <ChoiceCard
            v-for="record in providerInstances"
            :key="record.id"
            :active="selectedProviderId === record.id"
            data-testid="admin-payment.provider-card"
            @click="selectedProviderIdRaw = record.id"
          >
            <span>{{ record.displayName }}</span>
            <small>{{ record.providerType }} / {{ record.clientId }}</small>
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
                    <option value="WECHAT_PAY">微信支付 WECHAT_PAY</option>
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
                    v-model="form.clientId"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Charge Mode</span>
                  <select v-model="form.chargeMode" class="text-input">
                    <option value="JSAPI">JSAPI</option>
                    <option value="H5">H5</option>
                  </select>
                </label>

                <label class="field">
                  <span class="field-label">App ID</span>
                  <input
                    v-model="form.appId"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                    :disabled="!isCreateMode"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Mch ID</span>
                  <input
                    v-model="form.mchId"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                    :disabled="!isCreateMode"
                  />
                </label>

                <div class="field">
                  <span class="field-label">Instance Key</span>
                  <output class="read-only-output">{{ derivedInstanceKey }}</output>
                </div>

                <label class="field field--wide">
                  <span class="field-label">Endpoint Base URL</span>
                  <input
                    v-model="form.endpointBaseUrl"
                    class="text-input"
                    type="url"
                    autocomplete="off"
                  />
                </label>

                <label class="field">
                  <span class="field-label">API v3 Key</span>
                  <input
                    v-model="form.apiV3Key"
                    class="text-input"
                    type="password"
                    autocomplete="new-password"
                    :placeholder="secretPlaceholder"
                  />
                </label>

                <label class="field">
                  <span class="field-label">Merchant Cert Serial</span>
                  <input
                    v-model="form.merchantCertificateSerialNo"
                    class="text-input"
                    type="text"
                    autocomplete="off"
                  />
                </label>

                <label class="field field--wide">
                  <span class="field-label">Merchant Private Key PEM</span>
                  <textarea
                    v-model="form.merchantPrivateKeyPem"
                    class="text-area"
                    autocomplete="off"
                    spellcheck="false"
                    :placeholder="secretPlaceholder"
                  />
                </label>

                <label class="field field--wide">
                  <span class="field-label">Merchant Certificate PEM</span>
                  <textarea
                    v-model="form.merchantCertificatePem"
                    class="text-area"
                    autocomplete="off"
                    spellcheck="false"
                    :placeholder="optionalSecretPlaceholder"
                  />
                </label>
              </div>

              <div class="inline-actions">
                <Button
                  size="sm"
                  type="submit"
                  :disabled="isSaving"
                  data-testid="admin-payment.save"
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
                <dt>Client ID</dt>
                <dd>{{ selectedProvider?.clientId ?? "-" }}</dd>
              </div>
              <div>
                <dt>Instance Key</dt>
                <dd class="breakable">{{ selectedProvider?.instanceKey ?? "-" }}</dd>
              </div>
              <div>
                <dt>API v3 Key</dt>
                <dd>{{ apiV3KeyStateLabel }}</dd>
              </div>
              <div>
                <dt>Merchant Private Key</dt>
                <dd>{{ merchantPrivateKeyStateLabel }}</dd>
              </div>
              <div>
                <dt>Merchant Certificate</dt>
                <dd>{{ merchantCertificateStateLabel }}</dd>
              </div>
              <div>
                <dt>Platform Certificates</dt>
                <dd>{{ platformCertificateStateLabel }}</dd>
              </div>
              <div>
                <dt>Charge Notify URL</dt>
                <dd class="breakable">{{ selectedProvider?.chargeNotifyUrl ?? "-" }}</dd>
              </div>
              <div>
                <dt>Refund Notify URL</dt>
                <dd class="breakable">{{ selectedProvider?.refundNotifyUrl ?? "-" }}</dd>
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
  useAdminPaymentProviderWorkspace,
  useCreateAdminPaymentProviderInstance,
  useUpdateAdminPaymentProviderInstance,
  type AdminPaymentProviderInstanceInput,
  type AdminPaymentProviderWorkspaceResponse,
} from "@/domains/admin-payment/queries/useAdminPayment";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import { PuLoadingState } from "@partner-up-dev/design-web";

const CREATE_PROVIDER_ID = "__create__";

type ProviderInstance =
  AdminPaymentProviderWorkspaceResponse["providerInstances"][number];

type ProviderForm = {
  providerType: "WECHAT_PAY";
  displayName: string;
  status: "ACTIVE" | "DISABLED";
  clientId: string;
  appId: string;
  mchId: string;
  chargeMode: "JSAPI" | "H5";
  endpointBaseUrl: string;
  apiV3Key: string;
  merchantCertificateSerialNo: string;
  merchantPrivateKeyPem: string;
  merchantCertificatePem: string;
};

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminPaymentProviderWorkspace(isAdmin);
const createMutation = useCreateAdminPaymentProviderInstance();
const updateMutation = useUpdateAdminPaymentProviderInstance();

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
  isCreateMode.value ? "新建 Payment Provider Instance" : "编辑 Payment Provider Instance",
);
const derivedInstanceKey = computed(() => {
  const mchId = form.value.mchId.trim();
  const appId = form.value.appId.trim();
  if (!mchId || !appId) return "-";
  return `mch:${mchId}:app:${appId}`;
});
const secretPlaceholder = computed(() =>
  isCreateMode.value ? "新建实例必填" : "留空则保留",
);
const optionalSecretPlaceholder = computed(() =>
  isCreateMode.value ? "可选" : "留空则保留",
);
const apiV3KeyStateLabel = computed(() => {
  if (isCreateMode.value) return "-";
  return selectedProvider.value?.config.apiV3KeyConfigured ? "已配置" : "未配置";
});
const merchantPrivateKeyStateLabel = computed(() => {
  if (isCreateMode.value) return "-";
  return selectedProvider.value?.config.merchantCertificate
    .privateKeyPemConfigured
    ? "已配置"
    : "未配置";
});
const merchantCertificateStateLabel = computed(() => {
  if (isCreateMode.value) return "-";
  return selectedProvider.value?.config.merchantCertificate
    .certificatePemConfigured
    ? "已配置"
    : "未配置";
});
const platformCertificateStateLabel = computed(() => {
  const count = selectedProvider.value?.config.platformCertificates.count ?? 0;
  return count > 0 ? `${count} 张` : "未配置";
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
    providerType: "WECHAT_PAY",
    displayName: "",
    status: "ACTIVE",
    clientId: "web",
    appId: "",
    mchId: "",
    chargeMode: "JSAPI",
    endpointBaseUrl: "",
    apiV3Key: "",
    merchantCertificateSerialNo: "",
    merchantPrivateKeyPem: "",
    merchantCertificatePem: "",
  };
}

function formFromProvider(provider: ProviderInstance): ProviderForm {
  return {
    providerType: provider.providerType,
    displayName: provider.displayName,
    status: provider.status,
    clientId: provider.clientId,
    appId: provider.config.appId,
    mchId: provider.config.mchId,
    chargeMode: provider.config.chargeMode,
    endpointBaseUrl: provider.config.endpointBaseUrl ?? "",
    apiV3Key: "",
    merchantCertificateSerialNo:
      provider.config.merchantCertificate.serialNo,
    merchantPrivateKeyPem: "",
    merchantCertificatePem: "",
  };
}

const providerStatusLabel = (status: ProviderInstance["status"]): string =>
  status === "ACTIVE" ? "启用" : "停用";

const normalizeOptionalString = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const requireCreateSecret = (value: string, label: string): void => {
  if (isCreateMode.value && !normalizeOptionalString(value)) {
    throw new Error(`新建实例需要填写 ${label}`);
  }
};

const buildInput = (): AdminPaymentProviderInstanceInput => {
  requireCreateSecret(form.value.apiV3Key, "API v3 Key");
  requireCreateSecret(form.value.merchantPrivateKeyPem, "Merchant Private Key PEM");

  return {
    providerType: form.value.providerType,
    displayName: form.value.displayName.trim(),
    status: form.value.status,
    clientId: form.value.clientId.trim(),
    config: {
      adapterMode: "WECHAT_PAY_API_V3",
      appId: form.value.appId.trim(),
      mchId: form.value.mchId.trim(),
      chargeMode: form.value.chargeMode,
      endpointBaseUrl: normalizeOptionalString(form.value.endpointBaseUrl),
      apiV3Key: normalizeOptionalString(form.value.apiV3Key),
      merchantCertificate: {
        serialNo: form.value.merchantCertificateSerialNo.trim(),
        privateKeyPem: normalizeOptionalString(
          form.value.merchantPrivateKeyPem,
        ),
        certificatePem: normalizeOptionalString(
          form.value.merchantCertificatePem,
        ),
      },
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

.text-input,
.text-area,
.read-only-output {
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.text-input:disabled {
  color: var(--sys-color-on-surface-variant);
}

.read-only-output {
  display: block;
  overflow-wrap: anywhere;
  background: var(--sys-color-surface-container);
}

.text-area {
  resize: vertical;
  font-family: var(--sys-font-family-mono, monospace);
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
