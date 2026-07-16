import { describe, expect, it } from "vitest";
import { normalizeCommunityQrUrl } from "./pr-type-community";

describe("normalizeCommunityQrUrl", () => {
  it("keeps only valid HTTP(S) URLs", () => {
    expect(normalizeCommunityQrUrl("https://example.com/community.png")).toBe(
      "https://example.com/community.png",
    );
    expect(normalizeCommunityQrUrl("http://example.com/community.png")).toBe(
      "http://example.com/community.png",
    );
  });

  it("rejects empty, malformed, and non-HTTP URLs", () => {
    expect(normalizeCommunityQrUrl(null)).toBeNull();
    expect(normalizeCommunityQrUrl("")).toBeNull();
    expect(normalizeCommunityQrUrl("not a URL")).toBeNull();
    expect(normalizeCommunityQrUrl("javascript:alert(1)")).toBeNull();
  });
});
