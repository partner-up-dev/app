# 5-2.1 Implementation Log — Placement Admission

## Result

Complete. The Placement ordering-entry endpoint now returns one backend-authored outcome:

- `EXISTING_ORDER` with Order ID;
- `CREATOR_ELIGIBLE` with the ordering entry payload;
- `NON_CREATOR`;
- `INACTIVE`.

The PR-owned query decides active participation, PR creator, orderable PR status, and existing matching active Order.
Existing Order wins before a new-order eligibility decision. Web removed its separate PR-order lookup and routes only
from the outcome; the create-order creator guard remains defense in depth.

## Proof Recorded

- backend focused admission tests: 3/3 pass;
- Web flow tests: 4/4 pass;
- RideHailing browser scenario: creator/no-order enters `/order/new`, non-creator/no-order stays on PR, and active
  non-creator with an existing order opens that Order Detail: 1 pass / 8 skipped;
- `pnpm check:type:backend`, `pnpm check:type:web`, `pnpm check:lint:backend`, and `pnpm check:lint:web` pass;
- scoped `git diff --check` passes.

## Compatibility / Follow-Up

`INACTIVE` intentionally groups inactive Placement, inactive participant, and non-orderable PR status. The existing
`/pr/:id/orders` route remains available as a compatibility/read surface, but the Placement Web flow no longer uses
it. Rental scenarios are not the lasting proof of D1 because `5-4` retires Rental runtime traffic.
