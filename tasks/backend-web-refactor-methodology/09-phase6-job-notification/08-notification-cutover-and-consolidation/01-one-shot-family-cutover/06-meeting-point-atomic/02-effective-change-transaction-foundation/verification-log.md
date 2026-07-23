# `6-3.1f-02` Verification Log

## Result

Effective-point resolution now accepts caller-bound readers, so an atomic
source can use transaction-local PR-type/POI observations without reintroducing
a global scheduler dependency. The named Notification handoff accepts only
event facts and a roster, filters source-time eligibility, and writes through
the supplied transactional Job writer.

## Focused Proof

- Resolver unit proves a caller-bound type/location result wins without a
  global POI fallback read.
- Pure change-detector unit proves effective delta extraction has no scheduling
  side effect and preserves no-description suppression.
- Transaction-port unit proves a duplicate candidate roster is deduplicated,
  disabled users are filtered, immutable payload/cause/correlation are
  retained, and only the supplied writer receives a generic Job request.

## Commands And Results

| Command | Result |
| --- | --- |
| focused resolver/change-detector/transaction-port/owner/channel Vitest selection | passed: 5 files / 24 tests |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| focused `oxfmt --check` | passed |

## Deferred To Source Slices

The existing three source families still call the legacy creation scheduler.
Sub-tasks 03 through 05 must use this foundation inside source-owned
transactions before that compatibility edge can be removed.
