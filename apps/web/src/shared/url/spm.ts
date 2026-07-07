import { normalizeUrl } from "@/shared/url/normalizeUrl";

export const SPM_QUERY_PARAM = "spm";

const SPM_VALUE_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export type ShareSpmRouteKey =
  | "home"
  | "pr-create"
  | "pr"
  | "contact_support"
  | "contact_author";

export type ShareSpmMethodKey =
  | "web_share"
  | "wechat_share"
  | "xiaohongshu";

type NormalizePublicUrlOptions = {
  rawUrl: string;
  baseHref: string;
  removeSpm?: boolean;
};

type BuildProductShareUrlOptions = {
  rawUrl: string;
  baseHref: string;
  routeKey: ShareSpmRouteKey;
  methodKey: ShareSpmMethodKey;
};

const parseUrl = (rawUrl: string, baseHref: string): URL | null => {
  try {
    return new URL(rawUrl, baseHref);
  } catch {
    return null;
  }
};

export const sanitizeSpmValue = (
  value: string | null | undefined,
): string | null => {
  const normalized = value?.trim() ?? "";
  if (!SPM_VALUE_PATTERN.test(normalized)) return null;
  return normalized;
};

export const buildProductShareSpm = (
  routeKey: ShareSpmRouteKey,
  methodKey: ShareSpmMethodKey,
): string => `${routeKey}.${methodKey}`;

export const resolveSpmFromUrl = (
  rawUrl: string,
  baseHref: string,
): string | null => {
  const parsed = parseUrl(rawUrl, baseHref);
  if (!parsed) return null;
  return sanitizeSpmValue(parsed.searchParams.get(SPM_QUERY_PARAM));
};

export const normalizePublicUrl = ({
  rawUrl,
  baseHref,
  removeSpm = true,
}: NormalizePublicUrlOptions): string => {
  const parsed = parseUrl(rawUrl, baseHref);
  if (!parsed) {
    return normalizeUrl(rawUrl, baseHref);
  }

  parsed.hash = "";
  if (removeSpm) {
    parsed.searchParams.delete(SPM_QUERY_PARAM);
  }
  return parsed.toString();
};

export const buildProductShareUrl = ({
  rawUrl,
  baseHref,
  routeKey,
  methodKey,
}: BuildProductShareUrlOptions): string => {
  const baseUrl = normalizePublicUrl({
    rawUrl,
    baseHref,
    removeSpm: true,
  });
  const parsed = parseUrl(baseUrl, baseHref);
  if (!parsed) return baseUrl;

  parsed.searchParams.set(
    SPM_QUERY_PARAM,
    buildProductShareSpm(routeKey, methodKey),
  );
  return parsed.toString();
};
