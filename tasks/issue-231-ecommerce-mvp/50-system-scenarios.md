# System Scenario Spine

## Principle

Each in-scope business loop gets one system scenario. The scenario should prove
the cross-unit user-visible loop, not every domain invariant. Domain invariants
belong to unit tests and backend scenario tests.

System scenarios should use real browser, real frontend, real backend HTTP, and
isolated Postgres state. Assertions must be black-box browser assertions:
visible UI state and browser interactions only. Do not assert by probing API
response bodies, database rows, repositories, or backend internals.

Restaurant group-buy coupon demand has been moved out of this issue. It should
not have a system scenario in this task.

## Scenario 1: Admin Merchandising CRUD

Name:

- `admin_merchandising_crud_loop`

File:

- `tests/scenario/admin/admin-merchandising-crud.scenario.test.ts`

User-visible flow:

1. Admin opens merchandising admin.
2. Admin creates SPU/SKU records for Rental or Ride Hailing.
3. Admin configures SPU sales/pricing policy and an Offer SPU list.
4. Admin configures a `BUTTON` Placement Instance with Button creative.
5. Admin configures SKU base cancellation policy where applicable.
6. Matching PR shows the configured Button Placement inside Utility Actions.

## Scenario 2: 6C Time Slot Resource Reservation

Derived from `sequence-diagram-rental.md`; only the steps below are in scope
for this issue.

Name:

- `time_slot_resource_reservation_loop`

File:

- `tests/scenario/time-slot-reservation/6c-time-slot-resource-reservation.scenario.test.ts`

User-visible flow:

1. Participant opens a matching "烹饪搭子" `/pr/:id`.
2. PR page shows a 6C Button Placement inside Utility Actions.
3. Participant opens `/offers/:offerId`.
4. Offer Detail assembles Rental Ordering from the Offer SPU list.
5. Before READY, create-order CTA is disabled.
6. PR reaches READY through the existing PR lifecycle.
7. PR creator submits selected zone, 3-hour time slot, contact, and real-name
   fields.
8. User invokes WeChat Pay APIv3 payment.
9. Frontend polling and backend callback jointly drive payment state until paid
    or terminal failure.
10. Operator-facing browser route records 6C booking success/failure.
11. User-facing order route displays reservation success/failure and phone or
    real-name entry guidance.

```mermaid
sequenceDiagram
  actor U as PR Creator
  participant PR as PR Page
  participant PL as Button Placement
  participant OF as Offer
  participant RO as RentalOrder
  participant BI as Bill
  participant PY as Payment
  participant PA as WeChat Pay APIv3
  participant RF as RentalFulfillment

  U->>PR: Open matching cooking PR
  PR->>PL: Render Button Placement inside Utility Actions
  PL-->>PR: 6C reservation offer or existing order target
  U->>OF: Open /offers/:offerId
  OF->>RO: Assemble Rental Ordering from Offer SPU list
  RO-->>U: Create-order CTA disabled until READY
  U->>PR: Reach READY through existing lifecycle
  U->>RO: Submit zone/time/count/contact/real-name info
  RO->>PR: Attach order to PR in same transaction
  PR-->>RO: Accept only if PR is READY; otherwise reject and roll back
  RO->>BI: If accepted, create Bill and BillShares
  BI->>PY: Request payment for payable shares
  PY->>PA: Create prepay
  U->>PA: Pay in WeChat
  par WeChat callback path
    PA-->>PY: Verified payment callback can mark PaymentTx paid
  and Browser polling path
    U->>PY: Browser polls payment/order state
    PY->>PA: Query WeChat Pay order if still pending
  end
  PY-->>BI: PaymentTx settled payable shares
  BI->>RO: Bill settled
  RO->>RF: Create manual 6C booking task
  RF->>RF: Staff records 6C confirmation or failure
  RF-->>RO: Success with phone/real-name entry info or failure reason
  RO-->>U: Order detail shows result
```

## Scenario 3: Ride Hailing Quote, Completion, And Final Billing

Derived from `sequence-diagram-ride-hailing.md`, but updated to reflect the
current scope decision: issue 231 should include the minimum execution truth
needed for usage-based final settlement after trip finish. Full provider
dispatch/monitoring UX and provider settlement remain future work.

Name:

- `ride_hailing_quote_order_loop`

File:

- `tests/scenario/ride-hailing/ride-hailing-quote-order.scenario.test.ts`

User-visible flow:

1. Participant opens a matching route-aware or ride-relevant PR.
2. PR page shows ride-hailing Button Placement inside Utility Actions.
3. Participant opens `/offers/:offerId`.
4. Offer Detail assembles Ride Hailing Ordering from the Offer SPU list.
5. Ordering page shows route map, vehicle option, rider, time, estimate, and
   price detail affordance.
6. Before READY, create-order CTA is disabled.
7. PR reaches READY through the existing PR lifecycle.
8. PR creator creates RideHailingOrder foundation from quote snapshot.
9. Order detail shows quote snapshot and order basis.
10. Trip finish commits final settlement input through RideHailing
    Fulfillment.
11. Final Bill is created only after that committed settlement input is priced
    against the frozen contract.
12. Full provider dispatch/monitoring UX and provider settlement are not
    implemented in this task unless separately confirmed.

```mermaid
sequenceDiagram
  actor U as PR Creator
  participant PR as PR Page
  participant PL as Button Placement
  participant OF as Offer
  participant RH as RideHailingOrder
  participant HF as RideHailingFulfillment
  participant BI as Bill
  participant PY as Payment

  U->>PR: Open matching ride-relevant PR
  PR->>PL: Render Button Placement inside Utility Actions
  PL-->>PR: Ride-hailing offer or existing order target
  U->>OF: Open /offers/:offerId
  OF->>RH: Assemble Ride Hailing Ordering from Offer SPU list
  RH-->>U: Show map, vehicle, rider, time, estimate, price details
  RH-->>U: Create-order CTA disabled until READY
  U->>PR: Reach READY through existing lifecycle
  U->>RH: Create order from quote snapshot
  RH->>PR: Attach order to PR in same transaction
  PR-->>RH: Accept only if PR is READY; otherwise reject and roll back
  RH->>HF: Record minimum execution truth boundary
  HF->>HF: Commit final settlement input
  HF->>RH: Trade resolves final pricing from frozen contract
  RH->>BI: Create final Bill only after final pricing is resolved
  BI->>PY: Request final payment
  RH-->>U: Order detail shows quote snapshot, fulfillment result, and final bill
```

## Shared Scenario Expectations

- Placement type is backend-authored.
- This task implements only `BUTTON` Placement.
- Button Placement is displayed inside PR Page Utility Actions.
- Button Placement creative is owned by Placement.
- Placement target is backend-authored.
- Offer Detail assembles Ordering surface(s) from the Offer SPU list and each
  SPU's sales policy.
- Different SKU types have different ordering pages, order models, and
  fulfillment mechanisms.
- Non-active PR participants do not see PR-context placements. Active PR
  participants can see existing PR-attached order targets.
- PR-context create-order CTA is disabled until READY and enabled only for the
  PR creator after READY.
- Backend supporting tests should prove order creation and PR attachment are
  atomic: if PR domain rejects the attachment because the PR is not READY, no
  partial order is left behind.
- Browser assertions should use stable `data-testid` nodes for:
  - utility-action button placement
  - offer detail root
  - SKU-specific ordering root
  - order create action
  - order detail root
  - bill/payment result affordance
  - rental/ride-hailing order result root
- System scenarios may use fake WeChat Pay and Rental Fulfillment
  manual-operation test doubles, but the user path must still interact through
  browser-visible surfaces.
  Full ride-hailing provider dispatch/monitoring UX is not part of this task
  unless separately confirmed. The in-scope RideHailing Fulfillment work is the
  minimum execution truth needed for usage-based final settlement.
