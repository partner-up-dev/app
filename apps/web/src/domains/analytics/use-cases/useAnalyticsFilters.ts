import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  createDefaultRange,
  parseLocalInputValue,
  toAppliedFilters,
  type AnalyticsDashboardKind,
  type AnalyticsDraftFilters,
  type AnalyticsFilters,
} from "../model/filters";
import { formatActiveFilterSummary } from "../model/presentation";

export const useAnalyticsFilters = () => {
  const initial = createDefaultRange();
  const { t } = useI18n();
  const draft = ref<AnalyticsDraftFilters>(initial);
  const applied = ref<AnalyticsFilters>({
    startAt: parseLocalInputValue(initial.startAt)?.toISOString(),
    endAt: parseLocalInputValue(initial.endAt)?.toISOString(),
  });
  const filterError = ref<string | null>(null);

  const apply = (): boolean => {
    const next = toAppliedFilters(draft.value);
    if (!next) {
      const start = parseLocalInputValue(draft.value.startAt);
      const end = parseLocalInputValue(draft.value.endAt);
      filterError.value =
        !start || !end ? "adminAnalytics.invalidDateRange" : "adminAnalytics.invalidDateOrder";
      return false;
    }
    filterError.value = null;
    applied.value = next;
    return true;
  };

  const reset = (): void => {
    const next = createDefaultRange();
    Object.assign(draft.value, next);
    applied.value = {
      startAt: parseLocalInputValue(next.startAt)?.toISOString(),
      endAt: parseLocalInputValue(next.endAt)?.toISOString(),
    };
    filterError.value = null;
  };

  const showsDiscoveryDimensions = (kind: AnalyticsDashboardKind): boolean =>
    kind === "pr-discovery";
  const activeFilterSummary = computed(() =>
    formatActiveFilterSummary(applied.value, (key, params) => (params ? t(key, params) : t(key))),
  );

  return {
    draft,
    applied,
    filterError,
    apply,
    reset,
    showsDiscoveryDimensions,
    activeFilterSummary,
  };
};
