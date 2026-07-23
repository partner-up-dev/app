# `6-3.2c-2` Verification Log

## Focused Evidence

- `pnpm check:type:web` passed after the typed acknowledgement transport and
  visible-route workflow were added.
- `pnpm exec vitest run --project frontend-unit apps/web/src/domains/pr/use-cases/usePRMessageVisibleAcknowledgement.test.ts`
  passed: 1 file, 2 tests. It proves hidden cached data does not acknowledge
  until `visibilitychange` reaches `visible`, and a failed request retries the
  same cursor exactly once.
- The final changed-surface rerun of `pnpm check:type:web`,
  `pnpm check:lint:web` and this focused unit test passed after the equivalent
  `finally` control-flow cleanup. `pnpm test:unit:web` passed: 65 files, 213
  tests; the Web half of `pnpm check:build` passed.

## Boundary Confirmed

`PRMessageThread` no longer posts the legacy read-marker endpoint. It opts into
the workflow only when `PRMessagesPage` mounts the dedicated `/pr/:id/messages`
route. The workflow waits for component mount plus a render tick and a visible
document before invoking its typed semantic mutation; it has no optimistic
read/unread projection or unbounded retry loop.

## Remaining Gate

The backend compatibility endpoint and legacy response fields stay intact for
old deployed clients until `6-3.3`; this child removes only current Web usage.
