# `6-0` Rehearsal

## Ratified Slice Inputs Before Execution

| Slice | Closed design / remaining input | Planned branch | Stop condition |
| --- | --- | --- | --- |
| `6-1` JobRunner | owner model closed; source characterization and explicit start remain | additive generic disposition + creation-reservation foundation with legacy compatibility | migration cannot preserve pending Jobs, or Job requires business semantics |
| `6-2` Notification surface | template/owner model closed; waits for stable `6-1` contract | business-template command + generic handler + `WAITLIST_PROMOTED` vertical exemplar | caller must expose provider/Job internals or eligibility imports another domain's internals |
| `6-3` Notification convergence | waits for `6-2`; each template still needs atomic-required vs recoverable-best-effort classification | one-shot cutover, PR-message window/ACK, then opportunity/wave/inbox retirement | handoff can split invisibly, stale ACK can release newer work, or legacy Job becomes unknown |
| `6-4` F-02 | owner/state sequence ratified; provider idempotency/query and allowance inputs remain evidence gates | owner-gated same-generation retry only when definitely not applied; ambiguity → owner `UNKNOWN`; operator retry → new generation/Job | replay could duplicate provider effect or inputs would be invented |
| `6-5` runtime proof | waits for source slices plus configured cadence/auth/O11y observation access | local proof, deployed O11y proof, then compatibility retirement/review | deployed O11y cannot replace current diagnostic queries or environment authority is unavailable |

## Mental Simulation Rules

1. For every proposed durable work item, simulate: business transition commits;
   process stops before scheduling; job is claimed twice/lease expires; provider
   accepts but response is lost; operator replays; notification eligibility
   changes before dispatch.
2. A design is rejected if it cannot name the durable state that resolves each
   branch or if retry would duplicate an external consequence.
3. Source work is batched only when it preserves a valid replacement path and
   can be proven with focused tests plus one cross-unit/runtime layer.
4. `notification_deliveries` remains until deployed O11y proves correlation,
   queryability, retention and alert/recovery parity; local logs are not enough.
