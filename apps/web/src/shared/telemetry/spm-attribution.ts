import { resolveSpmFromUrl, sanitizeSpmValue } from "@/shared/url/spm";

const SPM_ATTRIBUTION_STORAGE_KEY = "__partner_up_analytics_spm__";

let cachedSpmAttribution: string | null | undefined;

const persistSpmAttribution = (spm: string): void => {
  cachedSpmAttribution = spm;
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SPM_ATTRIBUTION_STORAGE_KEY, spm);
  } catch {
    // Ignore sessionStorage write errors.
  }
};

const clearStoredSpmAttribution = (): void => {
  cachedSpmAttribution = null;
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(SPM_ATTRIBUTION_STORAGE_KEY);
  } catch {
    // Ignore sessionStorage write errors.
  }
};

export const resolveCurrentSpmAttribution = (): string | undefined => {
  if (cachedSpmAttribution !== undefined) {
    return cachedSpmAttribution ?? undefined;
  }
  if (typeof window === "undefined") {
    cachedSpmAttribution = null;
    return undefined;
  }

  try {
    const stored = sanitizeSpmValue(
      window.sessionStorage.getItem(SPM_ATTRIBUTION_STORAGE_KEY),
    );
    cachedSpmAttribution = stored;
    if (!stored) {
      window.sessionStorage.removeItem(SPM_ATTRIBUTION_STORAGE_KEY);
    }
    return stored ?? undefined;
  } catch {
    cachedSpmAttribution = null;
    return undefined;
  }
};

export const captureSpmAttributionFromUrl = (
  rawUrl: string,
  baseHref = rawUrl,
): string | undefined => {
  const incomingSpm = resolveSpmFromUrl(rawUrl, baseHref);
  if (incomingSpm) {
    persistSpmAttribution(incomingSpm);
    return incomingSpm;
  }

  return resolveCurrentSpmAttribution();
};

export const setCurrentSpmAttribution = (spm: string | null | undefined): void => {
  const sanitized = sanitizeSpmValue(spm);
  if (!sanitized) {
    clearStoredSpmAttribution();
    return;
  }
  persistSpmAttribution(sanitized);
};
