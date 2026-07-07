<template>
  <PuPageScaffold content-placement="center" class="bi-entry-page">
    <section class="bi-entry-card">
      <h1>BI 登录</h1>

      <PuLoadingState v-if="isPending" message="正在进入 BI 看板" />

      <template v-else>
        <PuInlineNotice tone="error" v-if="errorMessage" :message="errorMessage" />
        <PuButton shape="pill" tone="neutral" variant="outline" @click="goHome">
          返回首页
        </PuButton>
      </template>
    </section>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAdminSessionStore } from "@/domains/admin/use-cases/useAdminSessionStore";
import { adminClient } from "@/lib/admin-rpc";
import { PuButton, PuInlineNotice, PuLoadingState, PuPageScaffold } from "@partner-up-dev/design-web";

const ANALYTICS_SEED_USER_ID = "00000000-0000-0000-0000-000000000002";

const route = useRoute();
const router = useRouter();
const adminSessionStore = useAdminSessionStore();

const isPending = ref(true);
const errorMessage = ref<string | null>(null);

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
};

const resolveCode = (): string | null => {
  const rawCode = route.query.code;
  if (typeof rawCode !== "string") {
    return null;
  }

  const code = rawCode.trim();
  return code.length > 0 ? code : null;
};

const enterBI = async (): Promise<void> => {
  const code = resolveCode();
  if (!code) {
    errorMessage.value = "BI 登录失败，请检查 code。";
    isPending.value = false;
    return;
  }

  try {
    const response = await adminClient.api.auth.admin.login.$post({
      json: {
        userId: ANALYTICS_SEED_USER_ID,
        password: code,
      },
    });

    if (!response.ok) {
      errorMessage.value = await readErrorMessage(
        response,
        "BI 登录失败，请检查 code。",
      );
      return;
    }

    const payload = await response.json();
    adminSessionStore.applyAuthSession({
      role: payload.role,
      roles: payload.roles,
      userId: payload.userId,
      accessToken: payload.accessToken,
    });
    await router.replace({ name: "admin-analytics" });
  } finally {
    isPending.value = false;
  }
};

const goHome = async (): Promise<void> => {
  await router.replace({ name: "home" });
};

onMounted(() => {
  void enterBI();
});
</script>

<style lang="scss" scoped>
.bi-entry-page {
  --pu-page-max-width: 720px;
}

.bi-entry-card {
  display: flex;
  width: min(100%, 28rem);
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-large);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
}

.bi-entry-card h1 {
  margin: 0;
  font-size: var(--dcs-typography-page-hero-size);
  font-weight: 700;
  line-height: 1.05;
}
</style>
