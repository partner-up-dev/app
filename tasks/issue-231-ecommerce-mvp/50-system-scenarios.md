# System Scenario Spine

## Principle

Each in-scope business loop gets one system scenario. The scenario should prove
the cross-unit user-visible loop, not every domain invariant. Domain invariants
belong to unit tests and backend scenario tests.

System scenarios should use real browser, real frontend, real backend HTTP, and
isolated Postgres state. Assertions must be black-box browser assertions:
visible UI state and browser interactions only. Do not assert by probing API
response bodies, database rows, repositories, or backend internals.

Phase 3 begins with the Rental browser scenario before the corresponding
baseline frontend UI is considered complete. Where payment or manual
fulfillment is not yet real, use deliberately simple browser-visible fake
actions and still keep the user path black-box and user-visible.

Full RideHailing browser scenario completion is deferred to the RideHailing
phase. The RideHailing scenario remains documented as the later target because
its topology affects current abstractions, but it is not a Phase 3 completion
requirement.

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
3. Participant opens Ordering Detail.
4. Ordering Detail assembles Rental Ordering from the Offer SPU list.
5. Before READY, create-order CTA is disabled.
6. PR reaches READY through the existing PR lifecycle.
7. PR creator submits selected zone, 3-hour time slot, contact, and real-name
   fields.
8. User opens Bill Detail and sees participant BillLines.
9. User opens Payment Checkout for their own payable BillLine.
10. User invokes WeChatPay APIv3 charge.
11. Frontend polling and backend callback jointly drive PaymentTx state until paid
    or terminal failure.
12. Bill settlement notifies the source Rental Order; Rental Order then starts
    Rental Fulfillment explicitly.
13. Operator-facing browser route records 6C booking success/failure.
14. User-facing order route displays reservation success/failure and phone or
    real-name entry guidance.

```mermaid
sequenceDiagram
  actor U as PR Creator
  participant PR as PR Page
  participant PL as Button Placement
  participant OF as Offer
  participant RO as RentalOrder
  participant BI as Bill
  participant BD as Bill Detail
  participant PC as Payment Checkout
  participant PY as Payment
  participant PA as WeChatPay APIv3
  participant RF as RentalFulfillment

  U->>PR: Open matching cooking PR
  PR->>PL: Render Button Placement inside Utility Actions
  PL-->>PR: 6C reservation offer or existing order target
  U->>RO: Open Ordering Detail from backend-authored Placement target
  RO->>OF: Backend reads Offer and SPU/SKU truth for Rental Ordering
  RO-->>U: Create-order CTA disabled until READY
  U->>PR: Reach READY through existing lifecycle
  U->>RO: Submit zone/time/count/contact/real-name info
  RO->>PR: Attach order to PR in same transaction
  PR-->>RO: Accept only if PR is READY; otherwise reject and roll back
  RO->>BI: If accepted, create Bill and BillLines
  U->>BD: Open Bill Detail
  BD-->>U: Show participant BillLines
  U->>PC: Checkout current user's BillLine
  PC->>PY: Create or reuse PaymentTx
  PY->>PA: Create JSAPI prepay
  U->>PA: Pay in WeChat
  par WeChat callback path
    PA-->>PY: Verified payment callback can mark PaymentTx paid
  and Browser polling path
    PC->>PY: Browser polls PaymentTx / syncs provider state
    PY->>PA: Query WeChatPay order if still pending
  end
  PY-->>BI: PaymentTx settled one BillLine
  BI->>RO: Notify prepaid Bill fully settled
  RO->>RF: Explicitly create manual 6C booking task
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
3. Participant opens Ordering Detail.
4. Ordering Detail assembles Ride Hailing Ordering from the Offer SPU list.
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
  U->>RH: Open Ordering Detail from backend-authored Placement target
  RH->>OF: Backend reads Offer and SPU/SKU truth for RideHailing Ordering
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
- Ordering Detail displays a backend-resolved read model assembled from
  existing owner refs. Offer remains an upstream backend owner, not the public
  pre-order page contract.
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
  - ordering root
  - SKU-specific ordering controls
  - locked ordering facts such as participant count and service time
  - displayed product/service copy from SPU presentation
  - price preview before and after SKU/zone selection changes
  - cancellation-policy summary and price-detail affordance
  - order create action
  - order detail root
  - frozen order item, participant count, and total price
  - existing-order target routing from Button Placement back to Order Detail
  - bill detail entry
  - bill detail participant BillLines and current-user payable state
  - payment checkout pending/success/failure state for one BillLine
  - disabled create-order states for non-READY PR and non-creator viewer
  - rental cancellation result projection
  - rental/ride-hailing order result root
- System scenarios may use fake WeChatPay and Rental Fulfillment
  manual-operation test doubles, but the user path must still interact through
  browser-visible surfaces.
  Full ride-hailing provider dispatch/monitoring UX is not part of this task
  unless separately confirmed. The in-scope RideHailing Fulfillment work is the
  minimum execution truth needed for usage-based final settlement.
