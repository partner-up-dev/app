# `6-3.1f` Rehearsal

- **One PR-content update.** The source bridge locks and rereads the PR,
  resolves its pre-write effective point using transaction-local dependencies,
  writes requested core fields, resolves the post-write point, and exits
  without a task if the preserved detector says no effective change. Otherwise
  it generates one UUID and timestamp in the transaction, freezes candidates,
  and asks Notification to create recipient tasks. A writer error rolls back
  the PR write and all task rows.
- **One PR-type coordination update.** The transaction locks the config and
  sees all PRs of that type. PR-local overrides, location-specific type rules,
  and POI fallbacks are resolved before and after the config write. A single
  source mutation UUID groups the operation, while each changed PR receives a
  per-PR causation and fan-out; unchanged fallbacks emit nothing.
- **One POI rename/update.** The transaction locks the POI, unions requests
  referencing both its old and new names, then resolves effective points
  before and after the POI write. This keeps a rename from silently dropping
  one side of its impact set.
- **Two rapid updates.** Even if timestamps are identical at application
  precision, each committed source mutation generates a different UUID. Their
  creation keys do not coalesce, and each task keeps its own description and
  timestamp.
- **A participant leaves after commit.** The task remains an honest record of
  the source event. Dispatch sees membership is gone and skips without
  provider I/O or credit consumption; it does not mutate the historic event
  into the latest meeting point.
- **Channel or preference changes.** The source transaction never depends on
  a provider call. Current option/channel state is checked at dispatch.
  Limited generic credit decrements while retaining preference; known WeChat
  permission revocation clears both.
- **Boundary failure.** If any source writer still performs effective
  before/after work outside its source transaction, the cutover is incomplete.
  Do not retain a post-commit scheduler as a compatibility fallback; keep only
  old pending-row execution.
