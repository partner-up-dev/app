# Caocao OpenAPI Alignment Review

## Status

Completed for the minimum official surface; one residual contract note remains
recorded below.

## Objective & Hypothesis

Objective:

- audit `packages/fake-caocao-server` against the current CaoCao OpenAPI travel
  docs, define the minimum official surface, and rebuild the fake server around
  spec-driven validation plus minimal behavior

Hypothesis:

- the fake server has drifted from the documented contract beyond the recently
  fixed estimate-price fields
- the highest-risk drift is where backend code still passes because it accepts
  multiple field aliases, while the fake server no longer reflects the provider
  contract truth

## Guardrails Touched

- package owner: `packages/fake-caocao-server/`
- backend adapter reference: `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts`
- external authority: CaoCao OpenAPI travel docs

## Verification

- inspect fake server route implementations and tests
- inspect backend adapter request and response expectations
- compare each implemented fake provider endpoint to the current official docs
- run fake-server package tests
- run backend unit and backend scenario tests
- run system-scenario ride-hailing ordering flow to prove the fake server is in
  the real test path

## Current Understanding

- the fake server now exposes the minimum provider-facing official surface:
  - `/common/queryCity`
  - `/common/estimatePriceWithDetail`
  - `/common/orderCarV2`
  - `/common/queryOrderDetailV2`
  - `/common/queryDriverLocationByOrderId`
  - `/common/queryDriverPolylineV2`
  - `/common/queryCancelFee`
  - `/common/cancelOrderV3`
  - `/common/feeConfirm`
  - `notifyOrderStatus` as an OpenAPI webhook contract used to validate emitted
    callbacks
- provider-facing request and response validation is now driven from local
  OpenAPI sources under `packages/fake-caocao-server/openapi/`
- backend adapter and test data now use official CaoCao field names and numeric
  enum/code values instead of fake aliases

## Outcome Snapshot

- fake server was rebuilt around Hono plus OpenAPI-driven request/response
  validation, with provider contracts separated from fake-only control
  contracts
- `/common/queryCity` is now implemented, which unblocks backend city-code
  fallback during estimate and create-order flows
- estimate, create-order, cancel, route, detail, and callback contracts now use
  documented field names and documented enum/code values
- backend adapter no longer sends fake-only aliases such as `flat` / `flng`,
  `price_token`, `callback_url`, or `navigation_polyline_type`
- backend tests, backend scenario tests, system scenarios, and dev-only ride-
  hailing baseline data now use official numeric vehicle codes `3` and `5`
- dev-only fixture baseline was corrected at `0077`; the temporary forward
  migration was removed after it collided with the shared numeric migration
  prefix ledger
- current-doc note: I did not find a request-side `require_level` enum in the
  current 2026-06-29 CaoCao travel docs used for this task; no such request
  constraint was implemented without a source anchor

## Verification Update

- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck` passed
- `pnpm --filter @partner-up-dev/fake-caocao-server test` passed
- `pnpm --filter @partner-up-dev/backend typecheck` passed
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts apps/backend/src/domains/trade/services/order-pricing-execution.test.ts apps/backend/src/domains/merchandising/services/catalog-contract.test.ts` passed
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/commerce/offer-quote-resolution.scenario.test.ts apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts` passed
- `pnpm test:scenario:system -- tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts` passed with 45 tests green
- `pnpm db:lint` passed after folding dev-only vehicle-code alignment back into
  `0077`

## Residual Note

- official docs currently allow a wider `car_type` set on `orderCarV2`
  (`2,3,4,5,7,12,14,15`) than on `estimatePriceWithDetail`
  (`2,3,5,7,14,15`); the local provider spec preserves that difference, and the
  fake state still keeps default estimate records for `4` and `12` to avoid
  needlessly shrinking order-car coverage beyond the documented order contract

## Proposed Rebuild Shape

### Provider-facing minimum official surface

- `GET /common/queryCity`
- `GET /common/estimatePriceWithDetail`
- `POST /common/orderCarV2`
- `GET /common/queryOrderDetailV2`
- `GET /common/queryDriverLocationByOrderId`
- `POST /common/queryDriverPolylineV2`
- `POST /common/cancelOrderV3`
- `GET /common/queryCancelFee`
- `POST /common/feeConfirm`
- callback form contract for `2.13 notifyOrderStatus`

Reason:

- this is the smallest set that covers current backend provider adapter methods,
  current ordering/order-detail scenario flow, and settlement/cancellation
  paths

### Non-provider fake control surface that must remain

- `POST /__fake_caocao/reset`
- `POST /__fake_caocao/create-failure/next`
- `POST /__fake_caocao/estimates`
- `POST /__fake_caocao/estimates/availability`
- `GET /__fake_caocao/state`
- `POST /__fake_caocao/orders/latest/advance`
- `POST /__fake_caocao/orders/latest/retreat`
- `POST /__fake_caocao/orders/:providerOrderId/advance`
- `POST /__fake_caocao/orders/:providerOrderId/retreat`
- `POST /__fake_caocao/orders/:providerOrderId/phase`

Reason:

- current system scenarios and fake-server package tests use these controls to
  deterministically move provider state

### Rebuild sequence

1. write official provider-facing contracts as OpenAPI sources under a dedicated
   fake-caocao spec area
2. generate or hand-wire runtime validation from those specs so fake server
   stops accepting repo-invented aliases and invalid enum values
3. reimplement fake provider handlers as:
   - validated transport layer from OpenAPI
   - minimal stateful service layer for estimate/create/detail/route/cancel
     behavior
   - separate fake-only control handlers under `__fake_caocao`
4. update backend and scenario fixtures away from invented values where current
   system code still emits them
5. prove system scenarios still hit fake server by explicit assertions on fake
   state and callback-driven order progression

### Horizontal sub-agent split for pre-implementation work

1. shared-contracts lane
   - common signature params
   - common response envelopes
   - shared enums and naming inconsistencies
2. pricing-ordering lane
   - `queryCity`
   - `estimatePriceWithDetail`
   - `orderCarV2`
3. lifecycle-settlement lane
   - `cancelOrderV3`
   - `queryCancelFee`
   - `feeConfirm`
   - `notifyOrderStatus`
4. live-observation lane
   - `queryOrderDetailV2`
   - `queryDriverLocationByOrderId`
   - `queryDriverPolylineV2`

Guardrail:

- sub-agents stay read-only and produce OpenAPI-ready contract material,
  verification checklists, and evidence summaries only
- fake server implementation and integration remain in the main thread
