export const prettyJson = (value: unknown): string =>
  JSON.stringify(value, null, 2);

export const parseJsonText = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} JSON 格式无效`);
  }
};
