import { describe, expect, it } from "vitest";
import { isMainlandChinaMobilePhone, normalizeUserPhoneNumberDraft } from "./phone-number";

describe("user phone number model", () => {
  it("normalizes surrounding whitespace", () => {
    expect(normalizeUserPhoneNumberDraft(" 13800138000 ")).toBe("13800138000");
  });

  it("accepts complete mainland China mobile phone numbers only", () => {
    expect(isMainlandChinaMobilePhone("1380013800")).toBe(false);
    expect(isMainlandChinaMobilePhone("13800138000")).toBe(true);
  });
});
