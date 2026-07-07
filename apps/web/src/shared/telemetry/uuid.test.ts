import { afterEach, describe, expect, test, vi } from "vitest";
import { createUuid } from "@/shared/telemetry/uuid";

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createUuid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("uses native randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
    });

    expect(createUuid()).toBe("11111111-2222-4333-8444-555555555555");
  });

  test("formats a UUID when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array): Uint8Array => {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = index;
        }
        return bytes;
      },
    });

    expect(createUuid()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  test("returns a UUID-shaped value without Web Crypto APIs", () => {
    vi.stubGlobal("crypto", undefined);

    expect(createUuid()).toMatch(uuidV4Pattern);
  });
});
