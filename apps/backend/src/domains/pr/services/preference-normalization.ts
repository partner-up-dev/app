const CATEGORY_SEPARATOR = ":";

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

export const normalizePRPreferenceLabel = (value: string): string =>
  collapseWhitespace(value).slice(0, 80);

export const normalizePRPreferenceLabels = (values: readonly string[]): string[] => {
  const unique = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizePRPreferenceLabel(value);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("zh-CN");
    if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.values()];
};

export const derivePRPreferenceCategory = (label: string): string | null => {
  const normalized = normalizePRPreferenceLabel(label);
  if (!normalized.includes(CATEGORY_SEPARATOR)) return null;
  const category = collapseWhitespace(normalized.split(CATEGORY_SEPARATOR, 1)[0] ?? "");
  return category || null;
};
