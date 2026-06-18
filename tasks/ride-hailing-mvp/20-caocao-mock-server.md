# Caocao Mock Server

## Objective

Enable real frontend/backend local development against a deterministic fake
 Caocao provider, so UI and flow work can be validated without paper-only
 reasoning.

## Current Asset

An existing workspace package already exists:

- `packages/fake-caocao-server/`

Current implemented fake provider behavior includes:

- estimate price
- create ride
- query order detail with phase progression
- query cancel fee
- cancel ride
- fee confirm
- callback posting
- state reset and failure injection endpoints

## Evidence

- package entry: `packages/fake-caocao-server/src/index.ts`
- runtime server: `packages/fake-caocao-server/src/server.ts`
- routes: `packages/fake-caocao-server/src/routes.ts`
- in-memory state machine: `packages/fake-caocao-server/src/state.ts`
- scenario startup already uses it in
  `tests/scenario/_infra/vitest/global-setup.ts`

## Comparison With Fake WeChatPay

`fake-wechatpay-server` is more dev-ready today because it has:

- a `dev` script
- a CLI entry under `bin/`
- first-class package import usage
- dedicated tests

`fake-caocao-server` originally lacked at least:

- a `dev` script
- a CLI/bin entry for easy standalone local startup
- dedicated package tests
- documented stdout / fixture contract for developers
- consistent package import usage; scenario setup still imports its `src/index`
  path directly instead of consuming the package boundary

## Maintainable Direction

Do not create a second fake Caocao implementation inside `apps/` or `tests/`.

Preferred route:

1. Promote `packages/fake-caocao-server` into a first-class dev package.
2. Make local dev consume that package boundary directly.
3. Reuse the same fake across:
   - system scenarios
   - local manual UI development
   - targeted backend/provider verification

## Minimum Dev-Ready Work

- add package `dev` script
- add `bin/fake-caocao-server.ts`
- expose startup output similar to fake WeChatPay for easy provider instance
  registration
- add targeted package tests for route/signature and state progression
- switch scenario setup to the package import boundary
- run manual local fake provider work through the root
  `pnpm dev:portless:fake-caocao` helper, matching the backend/frontend
  portless wrapper pattern

## Why This Matters Before UI Work

- the ordering page and order detail page both depend on provider-backed state
  changes
- without a stable local fake, UI iteration will either stall or regress toward
  hardcoded placeholder behavior

## Likely First Infrastructure Slice

Completed infra mutation:

- harden `packages/fake-caocao-server`
- make it locally runnable
- make scenarios consume the package boundary directly

## Verification

- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`

This is an enabling slice, not the main product correction slice.
