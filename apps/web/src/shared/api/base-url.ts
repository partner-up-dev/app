export const API_URL = import.meta.env?.VITE_API_URL || "";

export const resolveApiUrl = (path: string, query?: URLSearchParams): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const suffix = query ? `?${query.toString()}` : "";
  if (!API_URL) {
    return `${normalizedPath}${suffix}`;
  }

  return new URL(`${normalizedPath}${suffix}`, API_URL).toString();
};
