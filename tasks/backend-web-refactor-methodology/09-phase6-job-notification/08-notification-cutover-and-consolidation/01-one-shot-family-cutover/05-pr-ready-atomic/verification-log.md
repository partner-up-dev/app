# `6-3.1e` Verification Log

## Result

`6-3.1e` is locally complete. The mutation covers only the PR-ready atomic
vertical; it does not claim retirement of `notification_deliveries` or the
remaining legacy Notification families.

## Focused Behavioral Proof

- Real PostgreSQL scenario: manual `PATCH /api/pr/:id/status` enters READY,
  persists one cycle, creates exactly one generic task per source-eligible
  active participant, omits source-ineligible participants, creates no PR-ready
  Opportunity, and makes a repeated READY request idempotent.
- Real PostgreSQL scenario: temporal join-lock entry commits through the same
  transition path and creates the same generic task shape without an
  Opportunity.
- Real PostgreSQL scenario: READY → OPEN skips old work; a later READY creates
  a different cycle and old work skips; READY → ACTIVE retains validity for the
  current cycle.
- Real PostgreSQL scenario: an injected Notification handoff failure rolls
  back both manual and temporal READY transitions, including status, cycle,
  generic Job and legacy Opportunity.
- Owner and channel units prove private once-per-cause identity, rendering,
  stale-cycle skip, limited-credit preservation, PR-ready provider mapping,
  unconfigured refusal, and `43101` recipient-permission classification.

## Commands And Results

| Command | Result |
| --- | --- |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| `pnpm db:lint` | passed |
| `pnpm db:check` | passed |
| `pnpm test:unit:backend` | passed: 100 files / 457 tests |
| `pnpm test:scenario:backend` | passed: 31 files / 105 tests |
| focused PR-ready scenario | passed: 1 file / 4 tests |
| focused owner + prepared-channel units | passed; later full unit includes the strengthened channel cases |
| `pnpm check:build:backend` | passed |
| `git diff --check` | passed after final packet/doc normalization |
| legacy-creation static inventory | passed: no source/test reference to the removed scheduler, collector, key builder, or schedule policy |

## Compatibility Inventory

- No new source calls the concrete PR-ready scheduler, source recipient
  collector, concrete creation key builder, or PR-ready schedule policy.
- `wechat.notification.pr-ready` handler registration, legacy payload decoder,
  and recipient-prefix cancellation remain only for pending-row drain.
- Existing `READY`/`ACTIVE` rows gain a backfilled cycle through migration
  `0092`; migration creates no retroactive Job or Opportunity.
