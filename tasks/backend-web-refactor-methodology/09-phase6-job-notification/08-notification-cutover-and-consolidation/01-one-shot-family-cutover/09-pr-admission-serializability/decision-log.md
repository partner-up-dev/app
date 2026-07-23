# `6-3.1c-2` Decision Log

| ID | Decision | Exit proof |
| --- | --- | --- |
| `6-3.1c-2-D1` | PR local capacity and queue ordering use a named serializable admission adapter, not caller-provided evidence or a generic transaction helper. | Parallel direct/promotion/queue-entry tests keep active count within max and preserve queue priority. |
| `6-3.1c-2-D2` | The selected active entrant is locked after the PR row; all covered active-add paths use that order. | A concurrent covered admission or user-state change cannot pass between final eligibility check and slot write. |
| `6-3.1c-2-D3` | A caller's outer eligibility check is feedback only. The transaction-local evaluator is authoritative and includes frequency policy for promotion. | An eligibility change produces a transaction-local skip/rejection rather than a stale promotion/direct admission. |
| `6-3.1c-2-D4` | Publish counts its creator as a new joined participant for future writes and persists that delta with DRAFT → OPEN and slot creation. | Publish rollback leaves no partial creator/status/reliability state; success increments once. |
| `6-3.1c-2-D5` | Reliability counters use atomic SQL deltas independent of admission serialization. | Concurrent deltas on one user retain both increments. |
| `6-3.1c-2-D6` | Content-edit release invokes the existing promotion trigger after its own commit, but release-to-promotion crash recovery remains a separate future slice. | The normal content-edit release path promotes/reconciles; no outbox/recovery claim is made. |
| `6-3.1c-2-D7` | Serializable retry stays bounded, but permits eight short delayed attempts because several different PRs can legitimately contend on one creator user row after taking their distinct PR locks. | The concurrent PR-type fixture publishes all distinct PRs instead of surfacing a final `40001` as HTTP 500. |
