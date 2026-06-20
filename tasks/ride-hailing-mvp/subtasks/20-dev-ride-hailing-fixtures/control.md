# Dev Ride Hailing Fixtures

## Status

Prepared as a development fixture slice.

Runtime application to the local dev database is environment-dependent in this
workspace because the latest recorded `pnpm db:migrate:dev` attempt was blocked
by `CONNECT_TIMEOUT ws-win.hadream.localhost:5436`.

## Objective & Hypothesis

Objective:

- provide stable local RideHailing provider/catalog/offer/placement data so the
  web journey can be entered from a real PR Button Placement

Hypothesis:

- realistic UI discussion and runtime validation need provider-backed mock data,
  not hand-constructed session storage payloads

## Guardrails Touched

- dev-only data migration owner:
  `apps/backend/data-migrations/`
- task-local manual seed owner:
  `tasks/ride-hailing-mvp/dev-ride-hailing-ordering-seed.sql`
- task-local patch owners:
  `tasks/ride-hailing-mvp/dev-ride-hailing-portless-endpoint-patch.sql`
  `tasks/ride-hailing-mvp/dev-ride-hailing-placement-type-patch.sql`

## Confirmed Outcome

- stable fake Caocao provider/catalog/offer/placement setup belongs to a
  development-only data migration.
- task-local SQL remains only for manual-test PR setup or append-only repair of
  earlier task seed mistakes.
- the temporary RideHailing Button Placement matches real PR type
  `RIDE_HAILING`.
- provider URLs follow the portless dev shape:
  `https://fake-caocao.localhost` and
  `https://api.partner-up.localhost`.

## Verification

Recorded verification:

- environment-aware data migration parsing is covered by
  `apps/backend/src/scripts/db/shared.test.ts`
- `pnpm db:lint`
- backend type/config checks
- FC migration bundle build

Remaining runtime proof:

- rerun `pnpm db:migrate:dev` in an environment where the dev DB is reachable
- open a PR Page and confirm the RideHailing Button Placement resolves
  `/order/new`

## Next Step

Treat fixtures as available for planning. Recheck live DB reachability only when
manual browser validation starts.
