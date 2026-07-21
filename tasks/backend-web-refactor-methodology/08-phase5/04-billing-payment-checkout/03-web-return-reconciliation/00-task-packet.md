# 5-3.3 Web Return Reconciliation

## Status

**Complete.** The Web uses a session-scoped opaque lookup hint, retains
Checkout on every non-success result, and reuses the existing design-system
notice/button/dialog primitives.

## Objective

Keep Checkout on the authoritative backend reconciliation path across native
client return, redirect return, and page reload without persisting payment
truth in the browser.

## Exit

- a session-scoped attempt hint is only a PaymentTx lookup hint;
- success returns to Bill only after backend success;
- failed, closed, and query-error paths remain on Checkout with a distinct
  retry/re-confirm affordance;
- no new design-system primitive is necessary.
