# RideHailing Admin Provider Instance

Date: 2026-05-31

## Purpose

Define the admin surface for configuring RideHailing provider instances.

## Decision

Add a dedicated admin route:

- `/admin/ride-hailing`

This route manages RideHailing provider instances, starting with Caocao.

Do not change the SKU editor in this slice:

- RideHailing SKU editor continues to manually edit
  `rideHailingProviderInstanceId`.
- `providerVehicleTypeCode` also remains a SKU fact edited on the SKU.
- A provider-instance selector in SKU editor is deferred.

## Backend Boundary

Owner:

- `admin-ride-hailing-management` owns the provider-instance admin use cases and
  controller.
- The browser route is `/admin/ride-hailing`.

Data owner:

- `ride_hailing_provider_instances`

RideHailing provider config remains config-backed database state, not
environment variables.

## First-Cut Admin IA

List:

- Provider instance id.
- Provider type.
- Instance key.
- Display name.
- Status.
- Endpoint base URL.
- Callback base URL.
- Provider-instance callback URL.
- Created / updated time.

Edit:

- Provider type: first cut fixed to `CAOCAO`.
- Instance key.
- Display name.
- Status: `ACTIVE` / `DISABLED`.
- Caocao client id.
- Caocao API sign key.
- Endpoint base URL.
- Callback base URL.
- Request timeout.

Secret handling:

- `signKey` must not be returned in cleartext in the admin workspace response.
- Updating an existing provider instance should support leaving `signKey`
  blank to preserve the existing stored value.

## Verification

Implemented on 2026-05-31:

- Backend route:
  `/api/admin/ride-hailing/provider-instances/workspace`
- Backend mutations:
  - `POST /api/admin/ride-hailing/provider-instances`
  - `PATCH /api/admin/ride-hailing/provider-instances/:providerInstanceId`
- Frontend route: `/admin/ride-hailing`
- Admin navigation entry: RideHailing / Provider Instance
- Workspace response returns sanitized config; `signKey` is not returned in
  cleartext.
- Existing provider update preserves stored `signKey` when the admin submits a
  blank sign key.

Checks:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`
- `pnpm exec vitest run --project backend-scenario apps\backend\tests\ride-hailing\admin-ride-hailing-provider-instance.scenario.test.ts`
- `pnpm exec vitest run --project system-scenario tests\scenario\commerce\ride-hailing-ordering.scenario.test.ts`

Deferred:

- SKU editor provider-instance selector; SKU editor continues manual
  `rideHailingProviderInstanceId` entry.
