# `6-3` Decision Log

## Ratified Implementation Decisions

| ID | Decision | Reason and boundary | Exit proof |
| --- | --- | --- | --- |
| `6-3-D1` | Split `6-3` into independently verifiable micro-slices. Start with activity-start, then confirmation, then the transaction-bound atomic foundation before the remaining atomic families. | The old parent combines seven behaviorally different schedules, a message protocol and destructive state retirement. A family may not borrow another family's proof. | each child packet has a focused failure/behavior test before its successor |
| `6-3-D2` | Preserve the existing five-minute PR-message debounce. | No product decision authorizes a frequency change; the new Job reservation changes ownership/control, not user-visible timing. | first generic PR-message Job has `runAt = message.createdAt + 5m` |
| `6-3-D3` | Introduce a semantic attention-acknowledgment command/endpoint with `throughCursor`; retain `/read-marker` only as a legacy compatibility bridge while old PR-message rows drain. The legacy route never releases a generic held reservation. | “Visible thread acknowledged” is not a read receipt. Old clients may receive a bounded extra reminder during overlap rather than allowing an unrendered fetch to suppress the new window. | raw GET/legacy marker leave held generic Job intact; visible new route releases only a covered reservation |
| `6-3-D4` | Preserve a PRMessage-owned monotonic cursor through soft deletion/tombstone semantics; response exposes an acknowledgement cursor even when the latest visible message was deleted. | A held high-water must remain coverable. This is message-stream identity, not a new inbox/read-state owner. | delete highest message, ACK returned cursor, reservation releases without losing older attention semantics |
| `6-3-D5` | Atomic-required transitions use a named PR-owned transaction integration that calls Notification policy through a narrow transaction-bound scheduling port. It is not a public request field, generic outbox or generic cross-domain transaction helper. | The Job writer must share the business mutation transaction, while caller code still cannot choose Job type, key, provider fields or timing. | injected writer failure rolls back the named owner mutation and emits no Job |
| `6-3-D6` | A held window gains a neutral Job reservation release/invalidation primitive; Notification invokes it for opt-out, participant exit, PR termination and message invalidation. | Job owns only reservation control; Notification owns why it no longer represents user attention. | pending/running/terminal-held cases release without recreating inbox state |
| `6-3-D7` | Configuration and preference are revalidated at dispatch; PR-message creation preserves existing no-window behavior when the channel/recipient is not currently eligible. | Avoid silently changing legacy frequency/entitlement behavior or holding an unreleaseable window for a channel that cannot send. | no generic window for current ineligible recipient; current eligible window still skips safely if state changes later |
| `6-3-D8` | `notification_deliveries` remains in `6-3`; opportunities/waves/inbox can be retired only after replacement and active legacy compatibility gates. | Attempt rows need deployed O11y retention/query/recovery proof, while the other three have no target authority. | `6-5` evidence before delivery removal; `6-3.3` operator inventory/archive/drain before other drops |
| `6-3-D9` | A recipient subscription change uses Notification's semantic recipient-scope invalidation; a PR-owned pure current-participation reconciler rebuilds activity-start tasks through the ordinary Notification request command. | The controller must purge stale generic work without knowing a Job prefix, while PR remains the owner of current participant/time facts. No new concrete scheduler or controller-to-repository edge is introduced. | opt-out removes all pending/retry generic activity tasks for the recipient; renewed credit rebuilds only current active PR facts |
| `6-3-D10` | An activity-start reminder follows the current persisted activity start: a successful PR time change reconciles each remaining active participant, replacing a future task or removing one whose lead time is no longer future. | This follows the existing slice exit (“time/participation changes remove or replace active work”) and prevents a known stale-time defect; it does not alter the fixed 20-minute lead or user-visible notification frequency. | focused edit scenario shows one task at the new start; a too-late new start leaves no pending task |
| `6-3-D11` | During activity-start legacy Job drain, a subscription change may cancel existing legacy activity rows, but no caller rebuilds or creates a legacy activity Job. | Opt-out must still suppress pending old rows; routing new work back to the old scheduler would break cutover and can double-send. | source search finds no legacy activity schedule/rebuild caller; temporary user-level legacy cancellation has an explicit drain removal condition |
| `6-3-D12` | Notification runtime composition consumes only the narrow PR `notification-contexts` query entrypoint, never a broad PR barrel. | A broad query barrel re-entered legacy Notification wiring at module initialization and captured an uninitialized scheduling projection. The named query surface preserves the cross-owner boundary without repeating that cycle. | real app-bootstrap activity scenario invokes the configured global Notification owner successfully |
| `6-3-D13` | Confirmation reminder keeps its public business request as `{ prId, slotId, reminder }`. PR exposes only current confirmation anchors; Notification derives the trigger instant, while generic dispatch compares the private Job `runAt` with that current derivation. It preserves the current active-status behavior (`JOINED`/`CONFIRMED`/`ATTENDED`) rather than adding confirmation-action cancellation. | A mutable two-trigger task needs a claimed-versus-current schedule comparison, but callers must not choose timing. Current PRD evidence requires disabling reminders with confirmation policy, not suppressing them after confirmation; changing that behavior would be a product decision rather than cutover correctness. | stale claimed Job skips before channel I/O; request remains `{ prId, slotId, reminder }`; global ineligibility aggregate-cancels both triggers; no new `confirmSlot` cancellation edge |
| `6-3-D14` | The waitlist-promotion atomic handoff is one promoted candidate: conditional slot promotion, reliability delta, derived PR status and generic waitlist Job share a short PR transaction. It does not widen to the full exit, temporal-release or admin-release command. | The existing handoff debt begins only after those callers have exposed capacity; rolling their unrelated committed work into this slice would enlarge owner span and change failure semantics without a product rule. | injected Job writer failure leaves candidate pending with no generic Job; success commits the candidate facts and exactly one causal Job |
| `6-3-D15` | The candidate transaction locks its PR row before re-reading capacity and FIFO eligibility; Job retains its existing creation-key advisory lock. | Candidate capacity selection and task dedupe protect different invariants. A bounded PR-row lock avoids a new global lock abstraction while serializing competing promotions. | source uses the two narrow locks; repeat causal request remains one Job |
| `6-3-D16` | `6-3.2c` exposes `POST /api/pr/:id/messages/acknowledgement` with the response-shaped `{ acknowledgementCursor }` input and `{ ok: true }` result. PR validates current participation and an all-row cursor; Notification maps the semantic request to the private held-reservation ACK. New Web no longer posts `/read-marker`; only the dedicated rendered+visible messages route opts in. | The route name and payload distinguish attention frequency control from a read receipt. Returning no Job state prevents Web from becoming an execution-control client, while the PR/Notification split retains cursor and private-key ownership. | HTTP stale/covered/tombstone/nonparticipant proof, hidden/visible/retry Web proof, and a real browser scenario show the route is the only new ACK initiator. |
| `6-3-D17` | Supersede D8's active-compatibility gate for opportunity/wave/inbox and concrete legacy decoders: remove them under Sir's explicit forward cut-off without old-Job/client inventory or drain. Retain `notification_deliveries` and defer its O11y-backed retirement beyond Phase 6. | Old compatibility breakage is explicitly accepted. Audit-table replacement is a different concern and console output is not observability infrastructure. | current-source zero-reference search, forward migration fixtures, affected scenarios; delivery table remains |

## Explicit Non-Decisions

- No provider retry is broadened: generic non-`43101` outcomes remain
  ambiguous/non-retrying until an adapter proves safe repetition.
- No historical inbox/wave row is translated into target ACK state; it is
  removed under the accepted cut-off.
- No generic outbox, global transaction utility or Notification Intent is
  introduced.

## Durable Contract Promotion

- `6-3-D3` and `6-3-D4` are promoted to
  [`docs/20-product-tdd/pr-messaging-contracts.md`](../../../../docs/20-product-tdd/pr-messaging-contracts.md)
  and [`docs/20-product-tdd/notification-contracts.md`](../../../../docs/20-product-tdd/notification-contracts.md):
  an attention ACK is semantic rather than a read receipt, and a PRMessage
  tombstone/monotonic acknowledgement cursor keeps a held high-water
  coverable without reviving inbox state.
- The general future viewed-membership placement rule is already promoted in
  [`architecture-objectives-and-decision-rules.md`](../../../../docs/20-product-tdd/architecture-objectives-and-decision-rules.md):
  use a message-owned bounded `viewedByUserIds` collection before inventing a
  separate viewed/inbox relation.
- `6-3-D12` is promoted to
  [`unit-topology.md`](../../../../docs/20-product-tdd/unit-topology.md):
  cross-owner Notification composition uses a narrowly named PR projection
  entrypoint rather than a broad import barrel.
- `6-3-D13` is promoted to
  [`notification-contracts.md`](../../../../docs/20-product-tdd/notification-contracts.md)
  and [`unit-topology.md`](../../../../docs/20-product-tdd/unit-topology.md):
  confirmation reminder timing is Notification-derived from PR-owned anchors;
  Job `runAt` remains a private stale-work fence, not a cross-owner request
  field.
