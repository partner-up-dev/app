# CaoCao Callback Routing

## Objective & Hypothesis

- Objective: design a temporary-to-durable routing scheme so one CaoCao callback URL can safely dispatch callbacks to preview or production while CaoCao URL changes are delayed.
- Hypothesis: nginx should route by a stable discriminator present in signed CaoCao callback input or by an edge-owned tokenized path; backend should remain the authority for business idempotency and order-state mutation.

## Guardrails Touched

- RideHailing provider callback authenticity and idempotency.
- Production / preview environment isolation.
- Deployment edge routing and rollback.

## Verification

- Confirm CaoCao callback payload and signature shape from local API/mock material.
- Confirm current provider instance config, callback URL construction, and callback route.
- Confirm deployment edge capabilities and whether nginx can read the required request attribute without breaking signature validation.

## Current Understanding

- Input type: Constraint. Product behavior stays the same; external callback address cannot change quickly.
- Active mode: Execute.
- Durable owner spans deployment docs and backend RideHailing provider contract; mutation proceeded after explicit user confirmation.
- Current backend has a provider-instance callback route:
  `POST /api/ride-hailing/caocao/:providerInstanceId/callback/order-status`.
- Current backend also keeps a legacy alias:
  `POST /api/v1/service_provider/caocao/callback/order`; it resolves the first active CaoCao provider instance and should not be used as the primary multi-environment topology.
- CaoCao callback signature covers all received form fields except `sign`; nginx must not mutate callback body or add body fields.
- Current repo create-order sends `callback_url` to `orderCarV2`; the callback URL is derived from the provider instance `callbackBaseUrl` and includes the concrete provider instance id.
- Current public CaoCao docs for `orderCarV2` do not list `callback_url`; they list fixed callback delivery to the address supplied by the integrator and support `callback_info` as status-notification pass-through.
- Callback body fields confirmed by implementation / fake provider: `order_id`, `ext_order_id`, `event`, `timestamp`, `sign`, plus optional driver, vehicle, and final amount fields.
- `ext_order_id` is `rh` + base36-compressed local order UUID. It maps to the local order, not directly to an environment unless order id ranges or an external registry are introduced.

## Open Questions

- Which exact callback URL is already registered at CaoCao.
- Whether preview and production use distinct CaoCao client/account identifiers.

## Implemented Direction

- Prefer edge routing by signed/pass-through `callback_info` when the CaoCao-registered callback address cannot change.
- Encode a short route token in `callback_info`: `pu.rhc.v1.<routing-token>.<providerInstanceId>`.
- Supported routing tokens: `stg`, `prod`, `dev`.
- nginx/OpenResty reads but does not mutate the form body, then proxies the original request to staging or production.
- The backend legacy fixed callback route can now load the concrete provider instance from valid `callback_info`; absent `callback_info` still falls back to the historical first-active CaoCao provider instance for compatibility.
- Backend remains the final safety gate by verifying signature against that environment's provider instance and checking `ext_order_id` plus `providerBinding.providerInstanceId/providerOrderId`.

## Verification Results

- `pnpm --filter @partner-up-dev/fake-caocao-server test` passed.
- `pnpm exec vitest run apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts --config vitest.backend.config.ts --project backend-unit` passed.
- `pnpm exec vitest run apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts --config vitest.backend.config.ts --project backend-scenario` passed.
- `pnpm check:type:backend` passed.
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck` passed.
- `pnpm exec biome lint <changed CaoCao/backend/fake files>` passed.
- `pnpm exec vitest run tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts --project system-scenario` passed.
- A broad `pnpm test:scenario:backend -- ...` attempt did not filter to the intended file and ran 25 backend scenario files; it failed in unrelated `admin_payment_provider_instance_rejects_duplicate_active_client`.
