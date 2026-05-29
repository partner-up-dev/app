# Commercial Demand Map

## Purpose

This issue should start from the commercial demands it must satisfy, then derive
capabilities, domains, contracts, and scenarios.

## Demand To Capability Map

| Commercial demand | Required capabilities | Owning domain group | System scenario |
| --- | --- | --- | --- |
| Relevant product/service recommendation inside PR detail | PR-context placement selection, typed placement instance, Button Placement projection inside Utility Actions, backend-authored target union to Offer/Order | Merchandising consumes PR context and offers sellable targets | Shared entry in every user loop |
| Admin merchandising operation | Admin CRUD for SPU/SKU, SPU sales/pricing policy, Offer SPU list, Placement Instance creative/matching, and SKU base cancellation policy | Merchandising plus Admin UI | `admin_merchandising_crud_loop` |
| 6C cooking-school shared kitchen reservation | Time-slot resource modeling, zone-specific user pricing, real-name/contact collection, advance-booking rule, WeChat Pay, SKU base cancellation policy snapshot, manual 6C booking, cancellation/refund, entry by phone/real name | Merchandising, Trade, Bill, Payment, Fulfillment | `time_slot_resource_reservation_loop` |
| Ride-hailing aggregation preparation | Quote/estimate, quote snapshot, order contract, bill/payment foundation | Merchandising, Trade, Bill, Payment | `ride_hailing_quote_order_loop` |
| Bill splitting across active participants | Participant BillLine obligation calculation and multiple PaymentTx attempts per line | Trade, Bill, Payment | Covered inside each paid loop |
| Independent commerce surfaces | Standalone route families, typed RPC contracts, frontend domain ownership | Frontend route/domain modules plus backend controllers | Covered by all system scenarios |

## Derived Functional Blocks

### Merchandising

Owns Product Catalog, Offer, and Placement. Product Catalog classifies
sellable substances through SPU/SKU with integer ids. SPU owns sales policy,
SKU-selection policy, quantity policy, type contract, and product-native
pricing policy. Offer defines an SPU list and optional ordered commercial
overlay rules. Placement owns campaign creative, matching, and backend-authored
targets for a context.

Placement is typed. This task implements only `BUTTON` Placement:

- UI location: inside PR Page Utility Actions.
- UI shape: one button for the matched placement instance.
- Creative: owned by Placement, not Offer.
- Target: backend-authored Offer or existing Order for the current PR.

The earlier below-Utility-Actions placement card is not implemented in this
task.

### Trade

Owns the in-scope order families: RentalOrder and RideHailingOrder.
User-facing language should stay inside the order flow. Current issue-231 loops
do not require a persisted TradeProposal because there is no asynchronous
multi-user selection or consensus step before order creation. GoodsOrder is out
of scope because group-buy coupon functionality has been removed from this
task.

Different SKU/product types select different ordering pages, order models, and
fulfillment mechanisms. One Offer may contain multiple SPUs, so Offer Detail
assembles the needed Ordering surface(s) from the Offer SPU list and each SPU's
sales policy.
Trade owns the resulting order family.

### Bill

Owns who owes how much and whether obligations are settled. Bill split
obligations are not payment transactions.

### Payment

Needed because external gateway money movement is a separate fact stream from
BillLine obligations and Order/Fulfillment state.

### Fulfillment

Owns Rental Fulfillment and RideHailing Fulfillment for this task. Fulfillment
is named by product type for consistency with Ordering and Order. Current
Rental Fulfillment is manually operated: platform staff contact 6C and record
booking/cancellation/result facts. RideHailing Fulfillment is a boundary only in
this issue; real provider dispatch remains out of scope.

Entitlement, Voucher Entitlement, and redemption flows are out of scope because
group-buy coupon functionality has been removed.

Restaurant group-buy coupon demand and its supporting features are out of scope
for this issue.

## Route Family Implication

Offer, Order, Product, Placement, and Bill/order-result routes should be
standalone route families. PR remains the contextual entry surface through a
Placement projection, not the parent route namespace for commerce objects.
If a future Trade coordination object is introduced, it should still be
surfaced to users as order coordination rather than a separate proposal route
by default.

Placement read contracts should also be Placement-owned. If PR detail later
embeds a placement projection for performance, that embedding is a page
composition detail and should not move placement selection rules into PR.
