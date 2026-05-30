# Implementation Slices

## Slice 0: Domain And Flow Solidification

Goal: turn issue 231 product decisions into explicit topology, state ownership,
route-family decisions, placement type contracts, PR order-attachment gate, and
scenario contracts.

Outputs:

- domain topology
- sequence diagrams for rental and ride-hailing loops
- one system scenario skeleton per in-scope business loop
- Product technical-design updates for cross-unit ownership and route/API
  contracts
- PR READY order-attachment gate and transaction contract

Exit condition:

- The system scenarios can be written without guessing domain ownership,
  placement UI type, PR readiness rules, or payment state authority.

## Slice 1: Admin Merchandising CRUD

System scenario design:

- `tests/scenario/admin/admin-merchandising-crud.scenario.test.ts`
- scenario: `admin_merchandising_crud_loop`

Domains expected in the path:

- Merchandising
- Admin UI

Supporting tests:

- SPU/SKU CRUD tests
- Offer CRUD and offer snapshot tests
- Placement Instance CRUD tests
- Button Placement configuration tests
- SKU base cancellation policy CRUD/validation tests
- frontend admin form and list tests

Exit condition:

- Operators can configure products, offers, typed Button Placement instances
  with creative payloads, and SKU base cancellation policies without direct
  database edits.

## Slice 2: PR READY Order Attach Guard

System scenario design:

- covered inside rental and ride-hailing scenarios
- backend scenario candidate: `apps/backend/tests/pr-core/pr-ready-ordering-gate.scenario.test.ts`

Domains expected in the path:

- PR Core
- Trade
- Merchandising

Supporting tests:

- create-order gate tests: disabled before READY, enabled only for PR creator
  after READY
- PR domain attach-guard tests: reject attach when PR is not READY
- transaction rollback tests: rejected attach leaves no partial order, bill,
  payment, or fulfillment records
- successful attach tests: READY PR plus PR creator authority can attach the
  created order

Exit condition:

- PR-context order creation cannot attach an order to a non-READY PR; rejection
  is atomic and leaves no partial commerce records.

## Slice 3: 6C Time Slot Resource Reservation Loop

System scenario design:

- `tests/scenario/time-slot-reservation/6c-time-slot-resource-reservation.scenario.test.ts`
- scenario: `time_slot_resource_reservation_loop`

Domains expected in the path:

- Merchandising
- Trade
- Bill
- Payment
- Fulfillment

Supporting tests:

- TimeSlotResource merchandising tests
- Button Placement in Utility Actions tests
- Rental Ordering component tests
- 6C zone line-item pricing, advance-booking, and resolved SKU + Offer
  cancellation policy tests
- Trade rental order real-name/contact required-attribute tests
- WeChatPay APIv3 payment query tests
- WeChatPay APIv3 callback transition tests
- Rental Fulfillment manual booking and cancellation-buffer tests
- Rental Fulfillment success/failure tests
- frontend rental order form and result-route tests

Exit condition:

- A 6C Button Placement can lead to Offer Detail, Rental Ordering, RentalOrder,
  Bill, WeChatPay charge, Rental Fulfillment manual booking/result, and
  reservation result. Merchant deposit, supplier pricing, and
  inventory/capacity management are out of scope.

## Slice 4: Ride Hailing Quote, Completion, And Final Billing

System scenario design:

- `tests/scenario/ride-hailing/ride-hailing-quote-order.scenario.test.ts`
- scenario: `ride_hailing_quote_order_loop`

Domains expected in the path:

- Merchandising
- Trade
- Fulfillment
- Bill
- Payment

Supporting tests:

- Ride Hailing Button Placement tests
- Ride Hailing Ordering component tests
- quote request and quote snapshot tests
- ride order lifecycle tests
- ride-hailing fulfillment completion / cancellation billability tests
- final usage-based bill creation tests
- bill/payment foundation tests
- frontend quote and order-detail route tests

Exit condition:

- Ride-hailing Button Placement can lead to Offer Detail, Ride Hailing Ordering,
  quote estimation, RideHailingOrder snapshot, minimum fulfillment completion
  truth, and final usage-based billing. Full provider dispatch/monitoring UX and
  provider settlement accounting remain out of scope unless separately
  confirmed.

## Slice 5: Payment Adapter Boundary

Goal: integrate WeChatPay APIv3 without changing Bill/Order/Fulfillment
invariants.

Detailed implementation plan:

- `71-phase-4-payment-implementation-plan.md`

Primary tests:

- WeChatPay APIv3 adapter contract tests with fake WeChatPay gateway
- provider-instance and client-binding routing tests
- provider-instance credential config persistence and redaction tests
- config-driven provider registration idempotency tests
- SDK dependency audit tests, including axios override / malicious-version
  rejection if axios enters the tree
- frontend-visible Bill Detail and Payment Checkout polling tests
- callback transition and idempotency tests as a first-class state driver
- backend scenario for repeated WeChat callback

Exit condition:

- PaymentTx records external money movement against exactly one BillLine without
  corrupting BillLine obligations.
- Current-user checkout pays only the current user's own BillLine; creator
  paying for other participants is out of scope.
- Rental Fulfillment starts only through explicit Trade/application-service
  orchestration after the prepaid Bill is fully settled, not through a generic
  Fulfillment listener.

## Slice 6: Product Fulfillment And Operations

Goal: add the minimum operational tooling needed by the in-scope loops.

Primary tests:

- manual Rental Fulfillment booking result scenario for 6C
- Rental Fulfillment result scenario for 6C
- RideHailing Fulfillment boundary tests without real provider dispatch
- RideHailing Fulfillment final-billing boundary tests
- operation log and audit proof tests

Exit condition:

- Staff can execute the shipped MVP workflows without direct database edits.

## Out Of Scope

- Restaurant group-buy coupon commercial loop.
- Voucher Entitlement, entitlement redemption, QR redemption, and GoodsOrder.
- Below-Utility-Actions placement card UI.
- Full ride-hailing provider dispatch/monitoring UX unless separately
  confirmed.
