# RideHailing Listing Diagnostics

## Objective & Hypothesis

Diagnose why staging RideHailing offer listing returns `items: []` even though
Offer, SPU, SKU, and provider rows are active and aligned.

Current finding: runtime reaches provider estimate. After the API base URL was
fixed, Caocao returns HTTP 200 with `errno=10002` / `errmsg=参数签名错误` for
all ride-hailing SKU candidates.

Working hypothesis: the signer sorts keys correctly, but the estimate request
uses non-Caocao parameter names (`flat/flng/tlat/tlng/departure_at`). The adapter
must sign and send the official 2.6 estimate params
(`from_latitude/from_longitude/to_latitude/to_longitude/city_code/order_type`).

## Guardrails Touched

- Backend Caocao provider estimate request construction.
- Listing behavior remains candidate pruning on provider failure.
- Do not expand this slice to Caocao `orderCarV2`; createRide still needs a
  separate protocol-alignment pass.
- Do not touch unrelated local worktree changes.

## Verification

- `pnpm check:lint:backend` passed.
- `pnpm check:type:backend` passed.
- `pnpm test:unit:backend -- apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts` passed.
- Commit only intended backend diagnostic changes.

Latest local verification:

- `pnpm test:unit:backend -- apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts` passed.
