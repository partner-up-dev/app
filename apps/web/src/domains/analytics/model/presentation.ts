export type AnalyticsTranslator = (key: string, params?: Record<string, unknown>) => string;

export const createNumberFormatter = () => new Intl.NumberFormat("zh-CN");
export const createPercentFormatter = () =>
  new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 1 });

export const formatCount = (value: number, formatter = createNumberFormatter()): string =>
  formatter.format(value);

export const formatRate = (value: number, formatter = createPercentFormatter()): string =>
  formatter.format(value);

export const formatNullableRate = (
  value: number | null,
  formatter = createPercentFormatter(),
): string => (value === null ? "-" : formatRate(value, formatter));

export const formatStatus = (status: string, t: AnalyticsTranslator): string =>
  t(`adminAnalytics.prStatus.${status}`);

export const formatCreatePath = (path: string, t: AnalyticsTranslator): string =>
  t(`adminAnalytics.prCreatePath.${path}`);

export const formatActiveFilterSummary = (
  filters: { startAt?: string; endAt?: string; viewMode?: string | null },
  t: AnalyticsTranslator,
): string => {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return t("adminAnalytics.activeTimeFilterSummary", {
    start: filters.startAt ? formatter.format(new Date(filters.startAt)) : "-",
    end: filters.endAt ? formatter.format(new Date(filters.endAt)) : "-",
    mode: filters.viewMode ?? t("adminAnalytics.allModesOption"),
  });
};
