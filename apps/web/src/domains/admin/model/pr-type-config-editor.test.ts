import { describe, expect, it } from "vitest";
import {
  applyJsonDraft,
  clonePRTypeConfigDraft,
  createEmptyPRTypeConfigDraft,
  createJsonDrafts,
  mergeSavedSlice,
  normalizeNullableNumber,
  resetPRTypeConfigDraft,
} from "./pr-type-config-editor";

describe("PR type config editor model", () => {
  it("keeps the last valid JSON model while text is intermediate", () => {
    const draft = createEmptyPRTypeConfigDraft("study");
    const drafts = createJsonDrafts(draft);
    const errors: Record<string, string> = {};
    const next = applyJsonDraft(draft, drafts, errors, "routePool", "[");

    expect(next.authoring.routePool).toEqual([]);
    expect(drafts.routePool).toBe("[");
    expect(errors.routePool).toBeTruthy();
  });

  it("applies valid JSON and clears its error", () => {
    const draft = createEmptyPRTypeConfigDraft("study");
    const drafts = createJsonDrafts(draft);
    const errors: Record<string, string> = { routePool: "invalid" };
    const next = applyJsonDraft(draft, drafts, errors, "routePool", '[{"label":"A"}]');

    expect(next.authoring.routePool).toEqual([{ label: "A" }]);
    expect(errors.routePool).toBeUndefined();
  });

  it("normalizes nullable number input without sending empty strings", () => {
    expect(normalizeNullableNumber("")).toBeNull();
    expect(normalizeNullableNumber("12")).toBe(12);
    expect(normalizeNullableNumber("12.5")).toBeUndefined();
    expect(normalizeNullableNumber("not-a-number")).toBeUndefined();
  });

  it("merges only the saved slice and preserves other drafts", () => {
    const draft = createEmptyPRTypeConfigDraft("study");
    draft.discovery.title = "unsaved title";
    const response = {
      ...clonePRTypeConfigDraft(draft),
      authoring: { ...draft.authoring, defaultNotes: "saved" },
    };
    const merged = mergeSavedSlice(draft, "authoring", response);

    expect(merged.authoring.defaultNotes).toBe("saved");
    expect(merged.discovery.title).toBe("unsaved title");
  });

  it("creates a fresh draft when type changes", () => {
    const previous = createEmptyPRTypeConfigDraft("study");
    previous.discovery.title = "unsaved";
    const fresh = resetPRTypeConfigDraft("hiking");
    expect(fresh.discovery.title).toBe("hiking");
    expect(fresh.authoring.timeWindowEditorDefaultMode).toBe("NORMAL");
    expect(fresh.discovery.communityQrCode).toBeNull();
    expect(resetPRTypeConfigDraft("study", previous).discovery.title).toBe("unsaved");
  });
});
