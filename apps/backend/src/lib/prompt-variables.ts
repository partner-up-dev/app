export type PromptJsonPrimitive = string | number | boolean | null;

export type PromptJsonValue = PromptJsonPrimitive | PromptJsonObject | PromptJsonArray;

export type PromptJsonObject = { readonly [key: string]: PromptJsonValue };

export type PromptJsonArray = readonly PromptJsonValue[];

export const toPromptJson = (value: PromptJsonValue): string => {
  return JSON.stringify(value, null, 2);
};
