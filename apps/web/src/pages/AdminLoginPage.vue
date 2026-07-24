<template>
  <PuPageScaffold content-placement="center" class="admin-login-page">
    <template #header>
      <header class="admin-login-page__header">
        <p class="admin-login-page__eyebrow">{{ t("adminCommon.title") }}</p>
        <h1 class="admin-login-page__title">{{ t("adminLogin.title") }}</h1>
        <p class="admin-login-page__subtitle">{{ t("adminLogin.subtitle") }}</p>
      </header>
    </template>

    <section class="admin-login-card">
      <div class="admin-login-card__glow" aria-hidden="true" />

      <div class="admin-login-card__body">
        <label class="field">
          <span class="field__label">{{ t("adminLogin.userIdLabel") }}</span>
          <input
            v-model="form.userId"
            class="field__input"
            type="text"
            inputmode="text"
            autocomplete="username"
            :placeholder="t('adminLogin.userIdPlaceholder')"
          />
        </label>

        <label class="field">
          <span class="field__label">{{ t("adminLogin.passwordLabel") }}</span>
          <input
            v-model="form.password"
            class="field__input"
            type="password"
            autocomplete="current-password"
            :placeholder="t('adminLogin.passwordPlaceholder')"
            @keydown.enter="handleSubmit"
          />
        </label>

        <PuButton
          shape="pill"
          size="lg"
          :disabled="sessionLogin.isPending.value"
          @click="handleSubmit"
        >
          {{
            sessionLogin.isPending.value ? t("adminLogin.loggingIn") : t("adminLogin.loginAction")
          }}
        </PuButton>

        <p class="admin-login-card__hint">{{ t("adminLogin.seedHint") }}</p>
        <PuInlineNotice
          tone="error"
          v-if="sessionLogin.errorMessage.value"
          :message="sessionLogin.errorMessage.value"
        />
      </div>
    </section>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { reactive, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAdminSessionLogin } from "@/domains/admin/use-cases/useAdminSessionLogin";
import { useAdminSessionStore } from "@/domains/admin/use-cases/useAdminSessionStore";
import { PuButton, PuInlineNotice, PuPageScaffold } from "@partner-up-dev/design-web";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const adminSessionStore = useAdminSessionStore();
const sessionLogin = useAdminSessionLogin();
const form = reactive({
  userId: "",
  password: "",
});

const resolveRedirectTarget = (): string => {
  const redirect = route.query.redirect;
  if (typeof redirect === "string" && redirect.startsWith("/admin/")) {
    return redirect;
  }

  return "/admin/pr";
};

const handleSubmit = async () => {
  await sessionLogin.login({
    userId: form.userId.trim(),
    password: form.password,
  });

  form.password = "";
  await router.replace(resolveRedirectTarget());
};

watchEffect(() => {
  if (!adminSessionStore.hasAdminAccess) {
    return;
  }

  void router.replace(resolveRedirectTarget());
});
</script>

<style lang="scss" scoped>
.admin-login-page {
  --pu-page-max-width: 980px;
}

.admin-login-page__header,
.admin-login-card,
.admin-login-card__body,
.field {
  display: flex;
  flex-direction: column;
}

.admin-login-page__header {
  gap: var(--sys-spacing-small);
  align-items: center;
  text-align: center;
}

.admin-login-page__eyebrow {
  @include mx.pu-font(control);
  margin: 0;
  color: var(--sys-color-primary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-login-page__title,
.admin-login-page__subtitle,
.admin-login-card__hint,
.field__label {
  margin: 0;
}

.admin-login-page__title {
  font-size: var(--dcs-typography-page-hero-size);
  font-weight: 700;
  line-height: 1.05;
}

.admin-login-page__subtitle,
.admin-login-card__hint,
.field__label {
  color: var(--sys-color-on-surface-variant);
}

.admin-login-card {
  position: relative;
  width: min(100%, 30rem);
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background:
    radial-gradient(circle at top left, var(--sys-color-primary-container), transparent 42%),
    linear-gradient(180deg, var(--sys-color-surface), var(--sys-color-surface-container));
  box-shadow: var(--sys-shadow-2);
}

.admin-login-card__glow {
  position: absolute;
  inset: auto -10% -30% auto;
  width: 14rem;
  height: 14rem;
  border-radius: 999px;
  background: var(--sys-color-primary-container);
  filter: blur(36px);
}

.admin-login-card__body {
  position: relative;
  gap: var(--sys-spacing-medium);
  padding: calc(var(--sys-spacing-medium) + var(--sys-spacing-small));
}

.field {
  gap: var(--sys-spacing-small);
}

.field__label {
  @include mx.pu-font(control);
}

.field__input {
  width: 100%;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}
</style>
