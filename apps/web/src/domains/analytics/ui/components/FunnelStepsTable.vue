<template>
  <div class="analytics-table-wrap">
    <table class="analytics-table">
      <thead>
        <tr>
          <th>{{ t("adminAnalytics.funnelStepColumn") }}</th>
          <th>{{ t("adminAnalytics.journeysColumn") }}</th>
          <th>{{ t("adminAnalytics.eventsColumn") }}</th>
          <th>{{ t("adminAnalytics.previousRateLabel") }}</th>
          <th>{{ t("adminAnalytics.startRateLabel") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="step in steps" :key="step.stepKey">
          <td>
            <strong>{{ step.label }}</strong
            ><span v-if="step.behavior" class="analytics-table__hint">{{ step.behavior }}</span>
          </td>
          <td>{{ formatCount(step.journeyCount) }}</td>
          <td>{{ formatCount(step.eventCount) }}</td>
          <td>{{ formatNullableRate(step.conversionFromPrevious) }}</td>
          <td>{{ formatRate(step.conversionFromStart) }}</td>
        </tr>
        <tr v-if="steps.length === 0">
          <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { formatCount, formatNullableRate, formatRate } from "../../model/presentation";

defineProps<{
  steps: readonly {
    stepKey: string;
    label: string;
    behavior?: string;
    journeyCount: number;
    eventCount: number;
    conversionFromPrevious: number | null;
    conversionFromStart: number;
  }[];
}>();
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.analytics-table-wrap {
  min-width: 0;
  overflow-x: auto;
}
.analytics-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}
.analytics-table th,
.analytics-table td {
  @include mx.pu-font(body);
  padding: var(--sys-spacing-small);
  border-bottom: 1px solid var(--sys-color-outline-variant);
  text-align: left;
  vertical-align: middle;
}
.analytics-table th {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}
.analytics-table__hint {
  @include mx.pu-font(support);
  display: block;
  margin-top: calc(var(--sys-spacing-xsmall) / 2);
  color: var(--sys-color-on-surface-variant);
}
</style>
