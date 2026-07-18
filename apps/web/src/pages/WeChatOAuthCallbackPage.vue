<template>
  <PuPageScaffold content-placement="center" class="wechat-oauth-callback-page">
    <template #header>
      <header class="wechat-oauth-callback-page__header">
        <h1 class="wechat-oauth-callback-page__title">
          {{ t("wechatOAuthCallbackPage.title") }}
        </h1>
        <p class="wechat-oauth-callback-page__subtitle">
          {{ t("wechatOAuthCallbackPage.subtitle") }}
        </p>
      </header>
    </template>

    <PuCard as="section" class="wechat-oauth-callback-page__card">
      <PuLoadingState v-if="status === 'processing'" :message="statusMessage" />
      <p v-else class="wechat-oauth-callback-page__error">
        {{ statusMessage }}
      </p>
    </PuCard>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { PuCard, PuLoadingState, PuPageScaffold } from "@partner-up-dev/design-web";
import { client } from "@/lib/rpc";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { useUserSessionStore, type AuthSessionPayload } from "@/shared/auth/useUserSessionStore";
import { clearWeChatOAuthSensitiveParamsFromAddressBar } from "@/processes/wechat/oauth-login";
import { clearWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";
import { clearWeChatOAuthTrace } from "@/processes/wechat/oauth-trace";

const { t } = useI18n();

const status = ref<"processing" | "failed">("processing");
const errorMessage = ref<string | null>(null);
const userSessionStore = useUserSessionStore();

const statusMessage = computed(() => {
  if (status.value === "failed") {
    return errorMessage.value
      ? t("wechatOAuthCallbackPage.failedWithMessage", {
          message: errorMessage.value,
        })
      : t("wechatOAuthCallbackPage.failed");
  }
  return t("wechatOAuthCallbackPage.processing");
});

const resolveOAuthParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    code: searchParams.get("code"),
    state: searchParams.get("state"),
  };
};

type OAuthCallbackResponse =
  | {
      ok: true;
      returnTo: string;
      auth?: AuthSessionPayload;
    }
  | {
      ok: false;
      error: string;
      returnTo?: string;
    };

const completeCallback = (): void => {
  clearWeChatOAuthLoginPending();
  clearWeChatOAuthTrace();
};

const failCallback = (message: string): void => {
  completeCallback();
  status.value = "failed";
  errorMessage.value = message;
};

const handleCallback = async (): Promise<void> => {
  const { code, state } = resolveOAuthParams();
  clearWeChatOAuthSensitiveParamsFromAddressBar();

  if (!code || !state) {
    failCallback(t("wechatOAuthCallbackPage.missingParams"));
    return;
  }

  try {
    const res = await client.api.wechat.oauth.callback.$get(
      {
        query: { code, state },
      },
      {
        init: {
          credentials: "include",
        },
      },
    );

    if (!res.ok) {
      const payload = await readApiErrorPayload(res);
      failCallback(resolveApiErrorMessage(payload, t("wechatOAuthCallbackPage.failed")));
      return;
    }

    const payload = (await res.json()) as OAuthCallbackResponse;
    if (payload.ok && payload.returnTo) {
      if (payload.auth) {
        userSessionStore.applyAuthSession(payload.auth);
      }
      completeCallback();
      window.location.replace(payload.returnTo);
      return;
    }

    failCallback(
      "error" in payload && payload.error ? payload.error : t("wechatOAuthCallbackPage.failed"),
    );
  } catch {
    failCallback(t("wechatOAuthCallbackPage.failed"));
  }
};

onMounted(() => {
  void handleCallback();
});
</script>

<style scoped lang="scss">
.wechat-oauth-callback-page {
  --pu-page-max-width: 42rem;
}

.wechat-oauth-callback-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  align-items: center;
  text-align: center;
}

.wechat-oauth-callback-page__title,
.wechat-oauth-callback-page__subtitle {
  margin: 0;
}

.wechat-oauth-callback-page__title {
  @include mx.pu-font(title);
  color: var(--sys-color-on-surface);
}

.wechat-oauth-callback-page__subtitle {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.wechat-oauth-callback-page__card {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 8rem;
  text-align: center;
}

.wechat-oauth-callback-page__error {
  @include mx.pu-font(body);
  color: var(--sys-color-error);
  margin: 0;
}
</style>
