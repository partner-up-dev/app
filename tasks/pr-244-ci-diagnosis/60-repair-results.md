# Repair Results

Date: 2026-06-02

## Frontend Gate

Cause:

- Token governance rejected `MultiStopToggle.vue` because it was not listed as a component contract path.
- `ButtonPlacement.vue` referenced undefined token `--sys-color-text-secondary`.

Repair:

- Added `shared/ui/forms/MultiStopToggle.vue` to the token governance component contract allowlist.
- Replaced the undefined commerce placement color token with `--sys-color-on-surface-variant`.

Verification:

- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`
- `pnpm test:unit:frontend`
- `pnpm --filter @partner-up-dev/frontend build`

## Backend Gate

Cause:

- Anchor Event scenario fixtures still sent legacy `startAt` payloads to a route that now expects `timeWindows`.
- Commerce scenario tests imported trade foundation helpers that no longer existed as exported runtime functions.

Repair:

- Updated Anchor Event scenario payloads to `timeWindows`.
- Restored intentional `createRentalOrder` and `createRideHailingOrderFoundation` helpers around the current trade persistence contracts.

Verification:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm lint:backend`
- `pnpm test:unit:backend`
- `pnpm db:lint`
- `pnpm test:scenario:backend`

## E2E Gate

Cause:

- Anchor Event form-mode scenarios expected stable test IDs that the current time editor did not expose.
- Rental ordering non-creator copy drifted from the scenario expectation.
- Ride-hailing ordering could not quote before contact completion because evaluate reused create-order input validation; placement route bindings also overwrote the normalized ride route snapshot.
- Ride-hailing vehicle selection was reset to the default option after quote refresh.
- E2E CI did not set WeChat ability mock env, while local scenario env did.
- Frontend PRPage unit fixtures were missing the current `editCapability` API field.

Repair:

- Added explicit form-mode time editor test-id props and wired the form-mode IDs.
- Aligned PR order creator-required copy.
- Split evaluate and create schemas for ride-hailing contact requirements.
- Let placement ordering entries expose normalized route snapshots, viewer contact phone, and stable order participants.
- Split ride-hailing evaluation output from final create output, defaulted contact from the viewer binding, and preserved the selected vehicle across quote refreshes.
- Added WeChat mock env to `e2e-gate.yml`.
- Updated PRPage unit fixture to include `editCapability`.

Verification:

- `pnpm test:scenario:system`
