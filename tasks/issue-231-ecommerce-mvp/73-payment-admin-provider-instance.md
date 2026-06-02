# Payment Admin Provider Instance

Date: 2026-05-31

## Objective & Hypothesis

Implement the first Payment Admin surface for managing Payment Provider
Instances only.

The first cut should mirror the RideHailing provider-instance admin topology
while preserving Payment-specific credential redaction rules.

## Guardrails Touched

- Payment owns external money movement and gateway-facing provider state.
- `payment_provider_instances` remains the provider execution configuration
  source of truth.
- WeChatPay APIv3 is the only in-scope Payment provider.
- Admin mutations derive `instanceKey` from WeChatPay `mchId + appId`; admins
  do not manually author the provider instance key.
- Existing provider instance `appId` and `mchId` are identity fields and are
  not editable through the Admin update flow.
- Admin read APIs must not return credential material in cleartext.
- Updating an existing provider instance may leave credential inputs blank to
  preserve stored values.
- `platformCertificates` are not edited in this slice; existing downloaded or
  registered certificates are preserved across admin updates.

## Scope

Backend:

- `GET /api/admin/payment/provider-instances/workspace`
- `POST /api/admin/payment/provider-instances`
- `PATCH /api/admin/payment/provider-instances/:providerInstanceId`

Frontend:

- `/admin/payment`
- Admin navigation entry under `Payment`
- Provider instance list, create, edit, and sanitized summary

Out of scope:

- PaymentTx management.
- Bill, refund, reconciliation, or provider event admin.
- Editing WeChatPay platform certificates directly.

## Verification

Implemented on 2026-05-31:

- Backend route:
  `/api/admin/payment/provider-instances/workspace`
- Backend mutations:
  - `POST /api/admin/payment/provider-instances`
  - `PATCH /api/admin/payment/provider-instances/:providerInstanceId`
- Frontend route: `/admin/payment`
- Admin navigation entry: Payment / Provider Instance
- Workspace and mutation responses return sanitized config with no cleartext
  `apiV3Key`, merchant private key, merchant certificate PEM, or platform
  certificate PEM.
- Existing provider update preserves stored credential values when the admin
  submits blank credential inputs.
- Existing `platformCertificates` are preserved across admin updates.
- Payment Provider Instance Admin derives `instanceKey` as
  `mch:{mchId}:app:{appId}` and rejects update attempts that change the
  existing instance `appId` or `mchId`.

Checks:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`
- `pnpm exec vitest run --project backend-scenario apps\backend\tests\payment\admin-payment-provider-instance.scenario.test.ts`
