# Fake Caocao Local Dev

## Status

Completed as an enabling infrastructure slice.

## Objective & Hypothesis

Objective:

- make Caocao provider behavior available in local development through the
  existing `packages/fake-caocao-server` workspace package

Hypothesis:

- UI and order lifecycle work need deterministic provider behavior
- maintaining one first-class fake provider is safer than creating task-local or
  app-local duplicate mocks

## Guardrails Touched

- package owner: `packages/fake-caocao-server/`
- scenario infra owner: `tests/scenario/_infra/vitest/global-setup.ts`
- dev entry owner: root `package.json` / portless dev scripts

## Confirmed Outcome

- fake Caocao is promoted into a first-class dev package.
- local development can run it through the portless app name
  `fake-caocao`.
- scenario setup consumes the package boundary.
- package tests and typecheck cover the fake provider contract.

## Verification

Completed verification recorded in the parent packet:

- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`

## Next Step

Use this service as the provider runtime when discussing and later validating
ordering-page and order-detail UI.
