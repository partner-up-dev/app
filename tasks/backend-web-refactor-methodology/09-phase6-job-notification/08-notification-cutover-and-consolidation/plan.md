# `6-3` Execution Plan

## Entry Revision — 2026-07-22

The source inventory closed a material planning error in the original three
large sub-tasks: they were too broad to make a single failure proof meaningful.
The executable order is now in `slice-map.md`; the first source mutation is
only `6-3.1a` activity-start recovery. The decision log fixes the PR-message
debounce, semantic ACK/legacy bridge, cursor/tombstone, narrow atomic bridge,
reservation invalidation and state-retirement boundaries before implementation.

## Sub-Task 1 — One-Shot Family Cutover

1. Freeze a per-template matrix: caller, semantic payload, timing, creation
   policy, eligibility, option/credit consequence, provider binding, handoff
   class and existing tests.
2. Cut over in micro-slice risk order: activity-start, confirmation,
   transaction-bound scheduling foundation + WAITLIST_PROMOTED debt closure,
   new-partner, PR-ready, meeting-point, then waitlist-alternative. Each has
   its own folder and focused proof; no family is bundled merely because its
   provider is WeChat.
3. Add each recoverable family's named reconciliation query/command before
   accepting separate commits; add the narrow named transaction adapter before
   each atomic-required mutation moves.
4. Add missing typed definitions/policies/bindings to the `6-2` registry.
5. For each family, migrate domain callers and WeChat controller schedule/
   cancel/rebuild side effects, then preserve the old definition for pending
   Jobs.
6. Consolidate duplicated render/revalidation glue only after focused parity
   tests pass for that family.
7. Stop new opportunity writes; retain existing data until sub-task 3.

## Sub-Task 2 — PR Message Window Cutover

1. Freeze current message mutation, recipient eligibility, delayed summary,
   Web render and hidden-prefetch behavior.
2. Add a named transaction adapter that inserts the message and every eligible
   recipient's HELD/high-water write through the transaction-bound Job writer;
   roll back the message if any required reservation write fails.
3. Implement handler content recomputation and reservation recheck.
4. Add semantic ACK API through the PR/application edge without exposing the
   private Job key.
5. Change Web so only the mounted messages route, after render commit and while
   `document.visibilityState === "visible"`, ACKs its latest rendered cursor;
   an ACK failure must permit retry of the same cursor.
6. Prove both schedule/ACK serialization orders and execution-terminal/held
   behavior before removing old gate use.
7. Implement leave/termination invalidation and later-rejoin/new-message reopen
   without retroactive absence-period notification.

## Sub-Task 3 — Legacy State Retirement

1. Apply Sir's explicit old-Job/client forward cut-off; do not collect
   production inventory, retain decoders or wait for client sunset.
2. Add forward migration/fixtures for opportunity, wave and inbox removal; do
   not reconstruct their state from current Job reservations.
3. Remove obsolete repositories/entities/services/API fields and concrete
   scheduler/decoder imports after current-source replacement proof.
4. Retain `notification_deliveries`; interpret its legacy `sentAt` as attempt
   timestamp on failed/skipped rows; defer real O11y replacement beyond Phase
   6.
5. Run dependency/dead-code searches and cross-unit scenarios; update durable
   current/compatibility wording only after source proof.

## Stop Conditions

- A template has no agreed semantic timing/eligibility owner.
- Message scheduling and business mutation can split with no accepted recovery
  rule.
- A committed PR message is externally visible before its reservation
  high-water commits.
- Web hidden fetch can release the attention window.
- Web suppresses retry after a failed ACK for the same cursor.
- Current source still creates or reads retiring inbox/opportunity/wave state.
- Delivery-table removal or console-as-O11y is proposed inside Phase 6.
- Consolidation produces a broad switch with template-specific business logic
  inside JobRunner.
