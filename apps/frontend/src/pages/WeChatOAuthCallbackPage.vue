<template>
  <PageScaffoldCentered class="wechat-oauth-callback-page">
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

    <SurfaceCard class="wechat-oauth-callback-page__card">
      <LoadingIndicator
        v-if="status === 'processing'"
        :message="statusMessage"
      />
      <p v-else class="wechat-oauth-callback-page__error">
        {{ statusMessage }}
      </p>
    </SurfaceCard>
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { client } from "@/lib/rpc";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import { clearWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";

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

const handleCallback = async (): Promise<void> => {
  const { code, state } = resolveOAuthParams();
  if (!code || !state) {
    clearWeChatOAuthLoginPending();
    status.value = "failed";
    errorMessage.value = t("wechatOAuthCallbackPage.missingParams");
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
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      clearWeChatOAuthLoginPending();
      status.value = "failed";
      errorMessage.value =
        payload?.error ?? t("wechatOAuthCallbackPage.failed");
      return;
    }

    const payload = (await res.json()) as OAuthCallbackResponse;
    if (payload.ok && payload.returnTo) {
      if (payload.auth) {
        userSessionStore.applyAuthSession(payload.auth);
        clearWeChatOAuthLoginPending();
      }
      window.location.replace(payload.returnTo);
      return;
    }

    clearWeChatOAuthLoginPending();
    status.value = "failed";
    errorMessage.value =
      "error" in payload ? payload.error : t("wechatOAuthCallbackPage.failed");
  } catch (error) {
    clearWeChatOAuthLoginPending();
    status.value = "failed";
    errorMessage.value =
      error instanceof Error
        ? error.message
        : t("wechatOAuthCallbackPage.failed");
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
