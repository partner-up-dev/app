# `6-3.3` Mental Rehearsal

- A pending old Job appears just before handler removal: keep the definition and
  re-open its drain gate; no source deletion is allowed to strand it.
- Old inbox and wave rows disagree: archive them as compatibility data; target
  ACK begins from the declared cutover rule rather than guessed reconstruction.
- Migration drops a table while a controller response still references it:
  source/read/write inventory fails and the migration does not proceed.
- O11y lacks one attempt while delivery rows contain it: keep deliveries and
  repair the signal; Job control remains unchanged.
- Dead-code cleanup overlaps unrelated worktree files: narrow the change and do
  not stage/revert user work.
- A local source search says opportunity/wave have no target reader, but an old
  deployed runner can still write their legacy paths: source proof is not a
  deployment drain proof.
- A cached browser bundle posts `/read-marker` after the schema/API drop: use
  the old-client sunset evidence to keep the route or return a deliberately
  managed compatibility response; do not make a silent breaking change.
- A legacy PR-message Job still needs inbox state when it runs: it cannot share
  target ACK semantics by inference. Keep/drain/migrate it under the named
  `6-3.3b` strategy before dropping the inbox table.
