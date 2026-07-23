# `6-3.1` — One-Shot Notification Family Cutover

Owner: Notification application/domain integration.

## Status

**`6-3.1a`, `6-3.1b`, `6-3.1c` core, `6-3.1c-1`, `6-3.1c-2`, `6-3.1d`,
`6-3.1e`, `6-3.1f`, and `6-3.1g` are locally complete.** The original six-family parent was split
because recoverable timing reconciliation, atomic source handoff and pure
waitlist-alternative eligibility need different proofs. See
`../slice-map.md` and the child packets below.

Migrate the six one-shot families remaining after the `WAITLIST_PROMOTED`
exemplar. Work family-by-family from a frozen timing/eligibility/handoff matrix;
do not touch PR-message window semantics in this sub-task. Completion requires
focused parity proof and removal of new writes to Notification Opportunity for
each migrated family while legacy pending Jobs remain executable.

Sub-task execution files:

- [`plan.md`](./plan.md)
- [`rehearsal.md`](./rehearsal.md)
- [`01-activity-start-recovery/`](./01-activity-start-recovery/)
- [`02-confirmation-recovery/`](./02-confirmation-recovery/)
- [`03-transactional-handoff-foundation/`](./03-transactional-handoff-foundation/)
- [`08-waitlist-cycle-causation/`](./08-waitlist-cycle-causation/)
- [`09-pr-admission-serializability/`](./09-pr-admission-serializability/)
- [`04-new-partner-atomic/`](./04-new-partner-atomic/)
- [`05-pr-ready-atomic/`](./05-pr-ready-atomic/)
- [`06-meeting-point-atomic/`](./06-meeting-point-atomic/)
- [`07-waitlist-alternative-recovery/`](./07-waitlist-alternative-recovery/)

Parent contract: [`../spec.md`](../spec.md).
