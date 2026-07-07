<template>
  <article
    class="ordering-support-summary-card"
    :class="{ 'ordering-support-summary-card--fluid': fluid }"
    data-testid="ordering.support.summary-card"
  >
    <header class="ordering-support-summary-card__header">
      <span class="ordering-support-summary-card__eyebrow">
        {{ t("ordering.summary.eyebrow") }}
      </span>
      <h2>{{ summary.title }}</h2>
      <p v-if="summary.subtitle">{{ summary.subtitle }}</p>
    </header>

    <div class="ordering-support-summary-card__price">
      <span>{{ t("ordering.summary.priceLabel") }}</span>
      <strong>{{ summary.priceLabel }}</strong>
    </div>

    <section
      v-for="section in summary.sections"
      :key="section.title"
      class="ordering-support-summary-card__section"
    >
      <h3>{{ section.title }}</h3>
      <dl>
        <div v-for="line in section.lines" :key="`${section.title}-${line.label}`">
          <dt>{{ line.label }}</dt>
          <dd>{{ line.value }}</dd>
        </div>
      </dl>
    </section>

    <footer class="ordering-support-summary-card__footer">
      <span>{{ t("ordering.summary.footer") }}</span>
      <small>{{ generatedAtLabel }}</small>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { OrderingSupportHandoffPayload } from "@/domains/commerce/model/ordering-support-handoff";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    summary: OrderingSupportHandoffPayload;
    fluid?: boolean;
  }>(),
  {
    fluid: false,
  },
);

const generatedAtLabel = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(props.summary.createdAt)),
);
</script>

<style scoped lang="scss">
.ordering-support-summary-card {
  box-sizing: border-box;
  display: grid;
  gap: var(--sys-spacing-medium);
  width: 420px;
  min-height: 640px;
  padding: var(--sys-spacing-large);
  border: 1px solid #d8dde4;
  border-radius: var(--sys-radius-large);
  background: #ffffff;
  color: #152033;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.ordering-support-summary-card--fluid {
  width: min(420px, 100%);
  min-height: auto;
}

.ordering-support-summary-card__header {
  display: grid;
  gap: var(--sys-spacing-xsmall);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title);
    line-height: 1.22;
    font-weight: 750;
    overflow-wrap: anywhere;
  }

  p {
    @include mx.pu-font(body);
    line-height: 1.45;
    color: #5c6675;
    overflow-wrap: anywhere;
  }
}

.ordering-support-summary-card__eyebrow {
  width: fit-content;
  border-radius: 999px;
  padding: calc(var(--sys-spacing-xsmall) / 2) var(--sys-spacing-small);
  background: #eaf4ee;
  color: #236645;
  @include mx.pu-font(control);
  font-weight: 700;
}

.ordering-support-summary-card__price {
  display: grid;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: #18263a;
  color: #ffffff;

  span {
    @include mx.pu-font(control);
    color: #c8d4e4;
  }

  strong {
    @include mx.pu-font(hero);
    line-height: 1.15;
    font-weight: 800;
    overflow-wrap: anywhere;
  }
}

.ordering-support-summary-card__section {
  display: grid;
  gap: var(--sys-spacing-small);

  h3 {
    @include mx.pu-font(section);
    margin: 0;
    line-height: 1.3;
    color: #236645;
  }

  dl {
    display: grid;
    gap: var(--sys-spacing-xsmall);
    margin: 0;
  }

  div {
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    gap: var(--sys-spacing-small);
    align-items: start;
  }

  dt,
  dd {
    @include mx.pu-font(body);
    margin: 0;
    line-height: 1.5;
  }

  dt {
    color: #788393;
  }

  dd {
    color: #152033;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
}

.ordering-support-summary-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #e6ebf0;
  color: #5c6675;

  span,
  small {
    @include mx.pu-font(support);
    line-height: 1.4;
  }

  span {
    font-weight: 700;
  }

  small {
    white-space: nowrap;
  }
}
</style>
