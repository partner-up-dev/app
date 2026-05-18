export type PRJoinEntrySurface = "form_mode_matched" | "pr_detail";

// Temporary context bridge for join/waitlist attribution.
// See docs/20-product-tdd/cross-unit-contracts.md for the context erosion note.
export type PRJoinEntryContext = {
  routeEventId: number | null;
  joinEntrySurface: PRJoinEntrySurface;
};
