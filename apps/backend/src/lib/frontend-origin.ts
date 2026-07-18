const isHttpProtocol = (protocol: string): boolean => protocol === "http:" || protocol === "https:";

const parseHttpUrl = (rawUrl: string | undefined): URL | null => {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    return isHttpProtocol(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
};

export const resolveConfiguredFrontendOrigin = (frontendUrl: string | undefined): string | null =>
  parseHttpUrl(frontendUrl)?.origin ?? null;

export const resolveCredentialedCorsOrigin = (
  requestOrigin: string,
  frontendUrl: string | undefined,
): string | null => {
  const configuredOrigin = resolveConfiguredFrontendOrigin(frontendUrl);
  return configuredOrigin === requestOrigin ? configuredOrigin : null;
};

export const resolveConfiguredFrontendReturnTo = (
  rawReturnTo: string | undefined,
  frontendUrl: string | undefined,
): string => {
  const configuredFrontendUrl = parseHttpUrl(frontendUrl);
  if (!configuredFrontendUrl) {
    throw new Error("OAuth returnTo is not configured");
  }

  const trimmedReturnTo = rawReturnTo?.trim();
  if (!trimmedReturnTo) {
    return configuredFrontendUrl.toString();
  }

  let parsedReturnTo: URL;
  try {
    parsedReturnTo = new URL(trimmedReturnTo, configuredFrontendUrl);
  } catch {
    throw new Error("Invalid returnTo");
  }

  if (!isHttpProtocol(parsedReturnTo.protocol)) {
    throw new Error("Invalid returnTo protocol");
  }

  if (parsedReturnTo.origin !== configuredFrontendUrl.origin) {
    throw new Error("returnTo origin is not allowed");
  }

  return parsedReturnTo.toString();
};
