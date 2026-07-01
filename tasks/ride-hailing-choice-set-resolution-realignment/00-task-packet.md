# RideHailing Choice-Set Resolution Realignment

Date: 2026-06-30

## Objective & Hypothesis

- Objective: realign RideHailing order creation so a choice-set item's
  `resolution` means only the final service vehicle confirmed by the provider
  lifecycle, not the dispatch-time provider binding or dispatch policy choice.
- Hypothesis:
  - `RideHailingOrderContent` shows "服务车型" during `DISPATCHING` because
    create-order writes `trade_orders.items[*].resolution.sku` immediately after
    provider create succeeds.
  - This is a backend model boundary defect, not a frontend visibility-state
    defect.
  - Provider dispatch binding belongs with RideHailing execution facts, likely
    on `ride_hailing_orders` or a ride-hailing dispatch child record, not inside
    `trade_orders.items`.
  - `RideHailingProviderPort.createRide` should accept the user-authorized
    vehicle candidate set in a provider-neutral contract. CaoCao's current
    `/v2/common/orderCarV2` contract supports multi-vehicle dispatch through
    `is_simultaneously_call=1` and `service_type_price`; the local adapter's
    previous cheapest-candidate fallback was an implementation gap, not a
    provider capability boundary.

## Guardrails Touched

- Product truth:
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/ecommerce-contracts.md`
- Backend trade order model:
  - `apps/backend/src/domains/trade/model/order.ts`
  - `apps/backend/src/domains/trade/services/order-items.ts`
  - `apps/backend/src/domains/trade/use-cases/create-order.ts`
- Backend RideHailing execution facts:
  - `apps/backend/src/entities/ride-hailing-order.ts`
  - `apps/backend/src/repositories/RideHailingOrderRepository.ts`
  - `apps/backend/src/domains/trade/model/ride-hailing-order.ts`
  - `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
  - `apps/backend/src/domains/ride-hailing/use-cases/provider-execution-context.ts`
  - `apps/backend/src/domains/ride-hailing/use-cases/sync-ride-hailing-order-with-provider.ts`
- Provider port and CaoCao adapter:
  - `apps/backend/src/domains/ride-hailing/model/provider.ts`
  - `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts`
  - `apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
- Frontend order detail and system scenarios:
  - `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Current Understanding

- Input type: Reality / Constraint.
- Active mode: Execute / Verify.
- Source behavior before this fix:
  - builds a choice-set order item with all selected candidate vehicles and
    `resolution: null`;
  - selects `dispatchCandidate` in the trade use case by sorting selected
    candidates by quote amount;
  - calls `port.createRide()` with CaoCao-shaped `params.car_type`,
    `estimate_price`, and `estimate_price_key`;
  - after provider create succeeds, constructs a
    `RideHailingChoiceSetResolutionSnapshot` with `sku`, `quoteSnapshot`,
    `providerBinding`, `source: "DISPATCH_POLICY"`, and
    `candidateRelation: "IN_CANDIDATES"`;
  - updates the RideHailing execution phase to `DISPATCHING`;
  - replaces the order item with the resolved item.
- Frontend behavior before the fix was data-correct against the implemented
  model but product-wrong against the intended meaning of "服务车型".
- Scenario coverage before the fix incorrectly cemented that a `DISPATCHING` order
  should have `resolved-vehicle-section` visible.
- Previous Product TDD said provider binding is stored on the choice-set
  resolution. That is the pressure that forces premature resolution creation
  once provider create returns a provider order id.
- Previous provider port leaked provider-specific request shape:
  - `RideHailingProviderCreateRideInput` is `{ orderId, params: Record<...> }`;
  - CaoCao adapter requires `params.car_type`;
  - trade create-order therefore knows and chooses a single provider vehicle
    type before calling the port.

## Target Claims

- `trade_orders.items[*].resolution` means final service resolution only.
- Before provider acceptance / callback / detail confirms the final service
  vehicle, a RideHailing choice-set item remains unresolved.
- Provider binding and dispatch submission facts are RideHailing execution
  facts. Preferred storage is `ride_hailing_orders`, not
  `trade_orders.items`.
- The provider port should expose a provider-neutral create contract:
  - route, departure, rider/contact facts;
  - callback routing material;
  - user-authorized candidate vehicles with provider quote snapshots;
  - no raw CaoCao `car_type` at the trade use-case boundary.
- A provider adapter records which candidate(s) it actually submitted:
  - CaoCao should submit the selected candidate set to `/common/orderCarV2` as a
    multi-vehicle order using `service_type_price`;
  - only providers without multi-vehicle order capability choose a fallback
    candidate internally.
- The order detail page's dispatching candidate vehicle section remains valid
  and is not the problem being solved.

## Data Placement Decision

Recommended direction:

- Store dispatch binding on RideHailing execution state:
  - provider instance id;
  - provider type;
  - provider order id;
  - provider snapshot from create;
  - submitted candidate relation / submitted provider vehicle type(s);
  - provider quote id / estimate amount used for the create request when
    relevant.
- Do not store this binding inside `choiceSet.resolution`.
- Keep `trade_orders.items` as commercial order content:
  - candidate set authorized by the user;
  - final resolution only after the service vehicle is known.

Chosen shape:

- Option A: add nullable `dispatch_binding` JSON snapshot to
  `ride_hailing_orders`.
- Option B: add a child `ride_hailing_dispatches` record if retries,
  multi-provider dispatch attempts, or dispatch history are in scope.

Decision: Option A for the smallest safe realignment. No retry/history record is
introduced in this slice.

## Implementation Notes

- `RideHailingProviderPort.createRide` now accepts a provider-neutral route,
  rider/contact facts, and candidate set instead of raw CaoCao params.
- CaoCao adapter submits multiple selected candidates through `orderCarV2`
  using `is_simultaneously_call=1` and `service_type_price`, then records
  `MULTI_CANDIDATE` when more than one candidate is submitted.
- create-order keeps the choice-set item unresolved after provider create and
  stores provider order binding on `ride_hailing_orders.dispatch_binding`.
- provider sync writes final choice-set resolution when the provider lifecycle
  confirms service has progressed to `ACCEPTED` or later and either the
  provider detail identifies the service vehicle type or the dispatch binding
  has only one submitted candidate.
- fake CaoCao server supports multi-vehicle `orderCarV2` and records submitted
  car types so system scenarios can prove adapter behavior through the real
  provider HTTP boundary.
- 2026-06-30 preview regression follow-up:
  - `RideHailingProviderOrderDetail.providerVehicleTypeCode` for CaoCao must be
    sourced only from official `basicOrderVO.requireLevel`;
  - fake CaoCao `queryOrderDetailV2` must expose `basicOrderVO.requireLevel` as
    the submitted/winning service vehicle code, not `0`;
  - `driverInfoVo.carType` is a vehicle model string in the fake server and must
    not be treated as a service vehicle code;
  - non-`requireLevel` fields such as `basicOrderVO.carType`,
    `basicOrderVO.serviceType`, and `driverInfoVo.serviceType` are not accepted
    as `providerVehicleTypeCode` inputs in this adapter slice.
- Order Detail therefore hides "服务车型" while the order is still
  `DISPATCHING`, but may show it after provider acceptance.

## Impact Handshake Draft

- Address and Object:
  - move provider binding source-of-truth from
    `trade_orders.items[*].resolution.providerBinding` to RideHailing execution
    storage;
  - make `choiceSet.resolution` absent while order is still only dispatching;
  - lift single-vehicle dispatch choice from trade create-order into provider
    adapter behavior.
- State Diff:
  - From: `DISPATCHING` + `item.resolution.sku` populated by dispatch policy.
  - To: `DISPATCHING` + `item.resolution = null`, with provider binding stored
    on RideHailing execution facts.
- Blast Radius Forecast:
  - backend order model and persistence;
  - provider context loading and cancellation / sync flows;
  - order detail projection;
  - frontend "服务车型" visibility through returned data;
  - scenario tests asserting resolved vehicle visibility.
- Invariants Check:
  - create-order still persists enough provider binding to cancel, sync, and
    poll provider order detail;
  - dispatching candidate vehicles remain visible on the order detail page;
  - provider create failure still cancels local order and returns ordering
    failure;
  - final bill remains based on provider final settlement.
- Verification:
  - focused backend tests for create-order persisted shape;
  - provider adapter test for single-provider fallback selection;
  - scenario update proving `DISPATCHING` order has dispatching candidates but
    no resolved service vehicle section;
  - existing cancellation and provider sync scenarios proving provider binding
    still works after moving storage.

## Verification Status

- Implementation complete.
- Completed:
  - `pnpm check:type:backend`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm test:unit:backend apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server exec vitest run src/server.test.ts src/state.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm test:scenario:backend apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts apps/backend/tests/ride-hailing/admin-ride-hailing-order.scenario.test.ts apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
  - `pnpm test:scenario:system tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm check:type:frontend`
  - `pnpm db:lint`
  - `pnpm db:check`
  - `pnpm check:format`
  - `pnpm check:lint`
  - `pnpm check:build:backend`
  - `pnpm check:build:frontend`
  - `git diff --check`
- Notes:
  - `pnpm check:lint` passed with existing report-only naming audit findings for
    `RideHailingOrderContent` and `RideHailingOrderingContent`.
  - 2026-06-30 correction after reviewing CaoCao docs: CaoCao supports
    multi-vehicle `orderCarV2`. Adapter, fake server, and system scenario were
    updated to prove multi-candidate dispatch.
  - The worktree also contains separate provider-cancellation order lifecycle
    changes tracked by
    `tasks/ride-hailing-dispatch-timeout-order-status-diagnosis/00-task-packet.md`;
    they were not reverted or folded into this packet.

## Next Step

- Human review of the model split and migration.
