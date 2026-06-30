export const normalizeUserPhoneNumberDraft = (value: string): string => value.trim();

export const isMainlandChinaMobilePhone = (value: string): boolean =>
  /^1\d{10}$/.test(normalizeUserPhoneNumberDraft(value));
