export const normalizeUrl = (rawUrl: string, baseHref: string): string => {
  try {
    return new URL(rawUrl, baseHref).toString();
  } catch {
    return rawUrl;
  }
};
