# RideHailing Navigation Route Diagnosis

## Objective & Hypothesis

- Reality: diagnose why `GET /api/commerce/orders/:orderId` returns
  `rideHailing.live.navigationRoute = null` in staging for an active
  RideHailing order while `rideHailing.live.vehicleLocation` is present.
- Initial hypotheses:
  - order-detail projection may be suppressing provider route queries for the
    observed execution phases
  - provider route query may be issued, but the CaoCao adapter may normalize
    the returned payload to `null`
  - staging provider callbacks / live detail may not contain the route fields
    the current adapter expects

## Guardrails Touched

- Backend order-detail read path:
  - `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- RideHailing provider contracts and adapter:
  - `apps/backend/src/domains/ride-hailing/model/provider.ts`
  - `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts`
- Scenario and unit truth:
  - `apps/backend/tests/ride-hailing/*.test.ts`
  - `docs/20-product-tdd/ecommerce-contracts.md`

## Verification

- Completed code-trace checks:
  - `buildRideHailingDetailProjection()` only assigns
    `live.navigationRoute = null` in two cases:
    - local `rideOrder.executionPhase` does not map to a live route query kind
    - `port.queryDriverRoute()` throws and `queryOptionalProviderLive()` swallows
      the error as `null`
  - `live.vehicleLocation` and `live.navigationRoute` share the same phase gate
    family:
    - `ACCEPTED`
    - `ARRIVED_AT_PICKUP`
    - `IN_TRIP`
  - therefore `vehicleLocation` present + `navigationRoute` null narrows the
    failure to the route query branch itself, not frontend rendering and not the
    top-level provider detail sync
  - current CaoCao adapter `queryDriverRoute()` does call the documented
    `POST /common/queryDriverPolylineV2` endpoint with `order_id`
  - current adapter parse path always returns a route object on successful
    provider response, even when polyline is empty; it does not return `null`
    on parse alone
- Remaining evidence gap:
  - route-query failures are fully swallowed and are not logged today, so the
    exact provider-side error code/message is not recoverable from current repo
    instrumentation alone
- Implemented and verified:
  - backend adapter now calls `POST /common/queryDriverPolyline`
  - adapter request includes `navigation_polyline_type`
  - fake CaoCao server contract now requires `navigation_polyline_type`
  - fake CaoCao route endpoint no longer models V2-only route querying
- Targeted validation completed:
  - `pnpm test:unit:backend -- apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test -- src/server.test.ts`

## Current Understanding

- Input type: Reality.
- Active mode: Execute.
- User-provided symptom is phase-sensitive:
  - `vehicleLocation` present
  - `navigationRoute` always null in staging
- Current investigation target is backend truth first, not frontend rendering.
- Evidence-backed conclusion:
  - the staging null does not come from frontend map code
  - it does not come from route-polyline parsing returning `null`
  - it comes from `queryDriverRoute()` failing at runtime and being downgraded
    to `null` by the backend catch-all wrapper
- External contract check:
  - current official CaoCao `queryDriverPolylineV2` docs document `order_id` as
    the request input for this endpoint; the earlier task-local suspicion about
    a required request-side `navigation_polyline_type` is not supported by the
    current official doc snapshot checked during this diagnosis
  - the older Python implementation at
    `/mnt/f/CODING/Project/Anana/main/ride_hailing/managers/service_provider/caocao.py`
    targets the older `/common/queryDriverPolyline` endpoint, not the current
    V2 endpoint:
    - request includes `navigationPolylineType`
    - route type is locally derived from provider status before the request
  - current TypeScript adapter targets `POST /common/queryDriverPolylineV2`
    and sends only `order_id`, which matches the current official V2 request
    contract
  - current TypeScript adapter still accepts a `routeKind` argument at the port
    boundary, but `CaocaoProviderAdapter.queryDriverRoute()` does not use it in
    the actual provider request; this looks like a leftover abstraction from an
    older route-query model, not current-request non-compliance
  - current response parsing is broadly aligned with the official V2 response:
    - reads `navigationPolylineType`
    - reads `steps`
    - falls back to `nextSteps`
    - reads `driverEtaInfoVO` / `nextDriverEtaInfoVO`
    - parses `lat` / `lng` into vehicle coordinates
  - one parser gap remains for future relay-order correctness:
    - official docs say relay orders can return both `steps`/`driverEtaInfoVO`
      and `nextSteps`/`nextDriverEtaInfoVO`
    - current adapter chooses `next*` only when `steps` is empty, so it cannot
      explicitly project the “next order” route while `steps` is also present
      for the previous order
  - staging evidence captured after diagnostic logging landed:
    - provider request reached `POST /common/queryDriverPolylineV2`
    - CaoCao returned business failure `code=453`
    - message: `app api config not existed or disabled`
    - conclusion: current staging provider credentials do not expose the V2
      polyline API capability
  - implementation decision:
    - stop using `queryDriverPolylineV2`
    - pin PartnerUp to `POST /common/queryDriverPolyline`
    - explicitly send `navigation_polyline_type`
    - treat this as a provider technical limitation, not a parser bug

## Next Step

- implement the v1 route-query contract everywhere it is authoritative:
  1. backend CaoCao adapter calls `POST /common/queryDriverPolyline`
  2. request includes `navigation_polyline_type=1|3`
  3. fake CaoCao server validates the v1 request shape and phase constraints
  4. tests assert the repo no longer depends on V2 route-query capability
