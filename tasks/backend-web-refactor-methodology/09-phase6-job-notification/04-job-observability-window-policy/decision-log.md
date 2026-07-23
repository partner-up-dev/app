# D6-J-02 Decision Log

Sir ratified these decisions on 2026-07-22. Ratification and durable-doc
promotion do not authorize source, schema, migration, or telemetry-backend
changes.

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D6-J2-01 | Do not create a durable `job_attempts` table while attempt history is pure audit; emit correlated traces/logs/metrics instead. | A second persistence ledger adds ownership and retention complexity without affecting product/control state. | Ratified |
| D6-J2-02 | Keep only generic task execution/recovery truth on Job: attempt count, lease/status, current or terminal disposition and bounded execution error/reason. Exclude provider-effect/business reconciliation state. | JobRunner must survive telemetry loss but must not become the semantic owner of its opaque payload's business outcome. | Ratified; owner correction by Sir |
| D6-J2-03 | Keep generic structured handler dispositions, and let JobRunner transition only generic task state. A real observability adapter may consume attempt signals later; Phase 6 does not create an ad-hoc console sink. | It prevents return/throw ambiguity without teaching JobRunner domain outcome vocabulary or pretending stdout is an observability backend. | Ratified; corrected 2026-07-23 |
| D6-J2-04 | Model PR-message wave as Job creation mode `UNTIL_ACKNOWLEDGED`, with a held reservation independent of execution terminality. | “Wave” is at-most-one task creation within an externally acknowledged window, not a Notification entity. | Ratified |
| D6-J2-05 | Atomically advance a held window's high-water cursor on coalesced messages; release it only when an explicit monotonic acknowledgment covers that high-water. The source message and coalesce must commit before that cursor is externally ACKable. | An ACK for an older rendered snapshot must not release already-coalesced unseen messages. Atomic source+reservation visibility also prevents ACK from releasing an old generation before delayed scheduling of an already-viewed cursor; otherwise a separate acknowledged-through watermark/key lock would be required. | Ratified; source-rehearsal implementation refinement |
| D6-J2-06 | Remove `pr_message_inbox_states` and retire the current backend-authoritative read-marker/unread-summary contract. Keep only a semantic visible-thread acknowledgment for the Notification Job window. | The current product does not expose durable unread/read-receipt behavior; the marker exists mainly to control notification frequency. ACK is a control fact, not a read receipt. | Ratified |
| D6-J2-07 | Keep `notification_deliveries` until a later observability-infrastructure phase proves correlation, queryability, retention and alert/recovery coverage; its retirement does not gate Phase 6 structural completion. | “Use O11y” is only real after operators can retrieve the evidence they currently query from SQL. | Ratified; deferred beyond Phase 6 on 2026-07-23 |
| D6-J2-08 | For a future bounded per-message viewed fact, prefer a message-owned `viewedByUserIds` set; extract an entity only after independent lifecycle, cardinality, query, concurrency, retention, or integrity needs are proven. | A fact should live with its semantic owner when it shares identity and lifecycle. Normalizing every collection into a table introduces concepts, joins and consistency work without adding capability. | Ratified architecture rule; no current viewed fact |
| D6-J2-09 | Provider ambiguity and reconciliation-required business outcomes belong to the semantic owner, not Job. Job receives only a generic complete/retry/fail/skip result and treats handler payload/reason as opaque. | A task container owns execution mechanics. Persisting domain uncertainty on Job would invert ownership and make infrastructure interpret business meaning. | Ratified by Sir on 2026-07-22 |
| D6-J2-10 | Do not add or retain `console`/raw-stdout diagnostics as Phase 6 observability. Remove the newly introduced Job attempt console sink and the legacy CaoCao debug stdout writes; do not treat redaction as observability infrastructure. | Structured console text still lacks a governed backend, correlation, retention, access policy, metrics/traces, alerts and failure visibility. Debug residue does not authorize more debug residue. | Ratified by Sir on 2026-07-23 |

## Target Boundary

```text
Notification chooses template, eligibility and creation mode
Job owns durable task + held/released creation reservation
JobRunner owns generic execution state
future O11y infrastructure owns attempt telemetry/history
semantic owner owns external-effect outcome and reconciliation
explicit thread acknowledgment releases the PR-message creation window
```
