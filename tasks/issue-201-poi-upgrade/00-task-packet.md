# Issue 201 POI Upgrade

## Objective & Hypothesis

Upgrade POI from name-as-primary-key to an integer-id entity while preserving PR and Anchor Event location semantics.

Hypothesis: `POI.id` can become the durable integer identity, `POI.name` can carry the previous text identifier, and `PR.location` plus Anchor Event `locationPool` can keep using the same arbitrary string/name matching contract by routing location lookups through POI name service methods.

## Guardrails Touched

- Constraint input route: product behavior stays stable while the technical data contract changes.
- Product TDD owner: POI identity, PR/Event to POI lookup contract, public/admin POI API shape.
- Backend entity/repository/service/controller boundaries.
- Frontend typed RPC consumers for public POI gallery and Admin POI management.
- Forward-only migration and idempotent seed behavior.
- Admin POI Basic editor now needs an operator-facing coordinate picker while keeping the existing POI save command as the mutation boundary.

## Current Slice: Admin POI Coordinate Editing

Objective:

- Let Admin users edit a POI's map coordinate through the generic `LocationPicker` flow.

Implementation notes:

- Backend already accepts nullable `gcj02`, `wgs84`, `bd09`, and `fullAddress` through Admin POI create/upsert commands.
- Tencent `LocationPicker` returns a GCJ-02 coordinate. Admin POI coordinate picking should update the POI draft's `gcj02`, clear stale non-GCJ coordinate fields, and update `fullAddress` from the picked address.
- POI name remains the selected POI identity for this slice. Picker-returned name is used only inside the picker draft and does not rename the POI.
- The existing Admin POI save action remains responsible for persistence, so picker selection is reversible until save.

Implementation result on 2026-05-17:

- Admin POI Basic now shows a coordinate row with current coordinate text and actions to choose or clear coordinates.
- `PoiBasicSection` opens the generic `LocationPickerModal` for coordinate selection.
- `useAdminPoiEditor` maps picked locations into POI drafts by setting `gcj02`, updating `fullAddress`, clearing `wgs84` and `bd09`, and marking the selected POI dirty.
- Clearing coordinates clears all three coordinate-system fields in the local POI draft.

## Verification

- `pnpm db:lint`
- `pnpm test:unit:backend`
- `pnpm test:unit:frontend`
- Targeted review of PR/Event POI lookups to ensure PR `location` resolves by `POI.name`.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 for Admin POI coordinate editing.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17 for Admin POI coordinate editing.
- `pnpm test:unit:frontend`: passed on 2026-05-17 for Admin POI coordinate editing.
- `git diff --check`: passed on 2026-05-17 for Admin POI coordinate editing.
- Playwright smoke reached `https://partner-up.localhost/admin/login?redirect=/admin/pois?section=poi-basic`; default seed admin login returned 401, so authenticated POI Basic browser verification remains pending.
