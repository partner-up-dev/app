# `6-3.2c-1` Verification Log

## Focused Evidence

- `pnpm check:type:backend` passed after the new Notification acknowledgement
  contract, PR command and controller route were introduced.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/notification/owner/pr-message-summary-notification-owner.test.ts`
  passed: 1 file, 9 tests. The owner maps only semantic PR aggregate/recipient
  input to the private creation key and forwards the supplied cursor.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr/pr-message-semantic-acknowledgement.scenario.test.ts`
  passed: 1 file, 1 scenario. It proves raw GET and legacy read-marker leave a
  generic reservation held; stale ACK holds; covering ACK releases; an
  all-row tombstoned cursor is accepted; invalid cursor is `400`; an outsider
  is `403`.
- `pnpm check:lint:backend` passed for the changed backend surface.
- Full backend verification subsequently passed: `pnpm test:unit:backend`
  (108 files, 497 tests), `pnpm test:scenario:backend` (44 files, 137 tests),
  and the backend half of `pnpm check:build`.

## Boundary Confirmed

`POST /api/pr/:id/messages/acknowledgement` accepts only
`{ acknowledgementCursor }` and returns `{ ok: true }`. PR validates active
participant access and PR-local all-row cursor identity; Notification owns the
private generic Job mapping. The endpoint does not expose Job/reservation state.

## Remaining Gate

The legacy read-marker endpoint remains for old-client and historical concrete
row overlap. Its runtime/data retirement belongs to `6-3.3`, not this child.
