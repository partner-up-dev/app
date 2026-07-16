export type PRJoinEntrySurface =
  | "pr_discovery_form_match"
  | "pr_discovery_form_candidate"
  | "pr_detail";

// Caller-owned attribution for join and waitlist actions.
export type PRJoinEntryContext = {
  joinEntrySurface: PRJoinEntrySurface;
};
