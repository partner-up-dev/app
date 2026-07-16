export const prDiscoveryPath = (): string => "/prd";

export const prDiscoveryTypePath = (type: string): string => {
  const normalizedType = type.trim();
  return normalizedType.length > 0
    ? `${prDiscoveryPath()}?type=${encodeURIComponent(normalizedType)}`
    : prDiscoveryPath();
};
