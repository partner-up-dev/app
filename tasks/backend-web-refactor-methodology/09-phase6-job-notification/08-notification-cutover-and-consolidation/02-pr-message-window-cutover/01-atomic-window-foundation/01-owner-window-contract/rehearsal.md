# `6-3.2a-1` Rehearsal

- The creation key excludes a message ID so one HELD reservation can coalesce
  an entire attention window; released history does not block a later one.
- The task payload does not duplicate high-water. Job owns that control state.
- Dispatch can use `windowStartCursor` only after checking that its reservation
  remains held; a missing cursor or unavailable context safely skips.
- Existing concrete PR-message rows keep their legacy decoder and handler; no
  new generic path calls either.
- A terminal HELD window is not implicitly rearmed merely because a later
  credit is granted. `6-3.2b` owns the explicit release/rearm decision; this
  child records the gap rather than hiding it in a source scheduler.
