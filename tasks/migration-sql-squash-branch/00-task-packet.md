# Migration SQL Squash For Current Branch

## Objective & Hypothesis

Merge the schema migrations introduced by the current local branch relative to `origin/develop` into fewer forward-only SQL files before they are pushed.

Hypothesis: the branch migrations `apps/backend/drizzle/0070_*.sql` through `0080_*.sql` contain intermediate design states that can be collapsed because they have not been pushed or applied in shared environments.

## Guardrails Touched

- Backend database migration workflow.
- Custom migration runner ordering by global numeric SQL prefix.
- Forward-only staging/production migration discipline.

## Verification

- `pnpm db:lint` passed.
- Migration-only verification passed through the backend scenario DB helper:
  reset a temporary database schema and applied all migrations through
  `drizzle/0072_ride_hailing_order_foundation.sql`.
- `pnpm test:scenario:backend` was run after the migration merge. The suite
  reached test execution after migration setup, but existing/non-migration
  failures remain around PR status expectations and missing trade domain
  exports such as `createRentalOrder`.
