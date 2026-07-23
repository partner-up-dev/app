# `6-3.2c-3` Verification Log

## Focused Cross-Unit Evidence

- `pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-message-attention.scenario.test.ts`
  passed: 1 file, 1 scenario. The real browser waits for the visible
  `pr-messages.thread`, observes the semantic POST with the returned cursor,
  and the isolated Postgres probe sees held → released/canceled → later held
  generation after another source message.
- The backend scenario records the overlap boundary independently: raw GET and
  legacy read-marker do not release generic work; stale/covering/tombstoned
  semantic cursor behavior is exercised over real HTTP and Postgres.
- The happy-dom workflow proof records the hidden-document and bounded retry
  fences without a browser/network dependency.
- A final targeted system rerun after the Web control-flow cleanup passed:
  `pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-message-attention.scenario.test.ts`
  (1 file, 1 test).

## Durable Promotion

The exact semantic route, response, current-Web behavior, owner split and
`6-3.3` deferral are promoted to `pr-messaging-contracts.md`; the private
Notification-to-Job mapping and visible-route conditions are promoted to
`notification-contracts.md` and `system-state-and-authority.md`.

## Remaining Gate

The proof makes the replacement path credible. It does not establish a
production old-client inventory, historical data drain/retention completion or
permission to remove legacy persistence/transport; those are `6-3.3` work.

## Full System-Suite Exception

`pnpm test:scenario:system` completed with 10 passing files / 37 passing tests
and one failing Auth scenario (`auth/public-user-session.scenario.test.ts`). An
isolated rerun also fails, but the observed assertion varies between replacement
UUID persistence and replacement token creation. This slice does not modify the
test or its Auth/session bootstrap path, while the exact PR-message system
scenario above passes. Treat it as a separate global Auth baseline defect; it
prevents a claim that the entire repository system suite is green, not a claim
that `6-3.2c` lacks its required proof.
