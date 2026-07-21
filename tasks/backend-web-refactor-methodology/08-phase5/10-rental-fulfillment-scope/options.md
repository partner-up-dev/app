# Scope Options And Selected Boundary

| Scope | New Rental traffic | Historical records | Risk / recommendation |
| --- | --- | --- | --- |
| R0 — runtime clean cut-off | no Placement, listing, quote, order, payment, booking, cancellation, guidance, or fulfillment writes | no production Rental order is reported; physical deletion is a later data-reclamation decision | **selected**; avoids a paid-without-service route and removes the active Trade→Fulfillment edge |
| A — retain historical projection while retiring new traffic | no Placement, listing, quote, order, payment, or fulfillment writes | retain rows and Bills read-only; physical deletion is a later data-retention decision | viable where historical records exist; no longer needed for the stated production condition |
| B — continue order/payment without fulfillment | allow quote, order, and payment; show unsupported fulfillment | retain all records | rejected by default: accepting payment without a defined service/refund policy creates the highest product risk |
| C — read-only Rental placeholder | no new Placement, listing, quote, order, payment, booking, cancellation, or guidance writes; show a retired/unsupported state | retain rows, Order Detail, and Bill Detail read-only | suitable migration default where history exists; not selected for the stated production condition |

## Decision Recorded

Sir selected **R0**. The reported lack of production Rental orders means no historical-order or paid-but-unfulfilled
transition policy is needed to retire runtime traffic. The implementation must still verify that assertion before any
irreversible data operation; no such data operation is in this Phase.

## Explicit Non-Selection

`B` is rejected because it preserves a paid-without-service path. `A`/`C` remain valid migration shapes for a future
environment with historical Rental data, but they are not the current runtime delivery target.
