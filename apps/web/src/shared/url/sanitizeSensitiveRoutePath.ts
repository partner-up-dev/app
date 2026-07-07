const SENSITIVE_ROUTE_PARAM_NAMES = [
  "access_token",
  "code",
  "state",
  "token",
  "wechatOAuthHandoff",
] as const;

const SENSITIVE_HASH_PATTERN =
  /(?:access_token|code|state|token|wechatOAuthHandoff)=/i;

export const sanitizeSensitiveRoutePath = (rawPath: string): string => {
  try {
    const parsed = new URL(rawPath, "https://partnerup.local");
    for (const paramName of SENSITIVE_ROUTE_PARAM_NAMES) {
      parsed.searchParams.delete(paramName);
    }

    const hash = parsed.hash;
    if (hash && SENSITIVE_HASH_PATTERN.test(hash)) {
      parsed.hash = "#redacted";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return rawPath;
  }
};
