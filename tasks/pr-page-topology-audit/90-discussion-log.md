# Discussion Log

## 2026-05-16

- User asked to first organize current PR Page UI and data topology because boundary erosion is hurting maintainability.
- User suggested establishing a task packet, avoiding a monofile, and updating the packet through discussion.
- Initial classification: `Artifact`, active mode `Explore`.
- Created split packet under `tasks/pr-page-topology-audit/`.
- UI sub-agent mapped the direct component graph and identified repeated detail observers, pending replay, handoff geometry, scroll locks, and contextual action density.
- First data sub-agent attempt exceeded context; a narrower data sub-agent mapped PR query/mutation/invalidation hooks successfully.
- Current local mapping added:
  - `20-current-ui-topology.md`
  - `30-current-data-topology.md`
  - `40-boundary-pressure-map.md`

## 2026-05-17

- User identified `PRContextualActions` and `PRUtilityActions` as the largest frontend component boundary erosion points because they mix many PR sub-features inside components that should act like simple button groups.
- User identified `PRCreatorHeaderActions` as over-abstracted because edit content and update status buttons/modals are route-scoped and can be assembled by `PRPage`.
- User suggested decomposing `EditPRContentModal` and `UpdatePRStatusModal` because modal shells should carry modal structure while `PRContentForm` / `UpdatePRStatusForm` carry form behavior.
- Added `50-target-topology.md` as a discussion draft for the target component ownership shape.
- Updated `40-boundary-pressure-map.md` to prioritize action component decomposition.
- User chose `PRCreatorHeaderActions` and `EditPRContentModal` / `UpdatePRStatusModal` as the first candidate slice.
- User raised a constraint for `PRContextualActions` and `PRUtilityActions`: reducing them to button groups would remove their abstraction value if all scattered business logic flows back into `PRPage`.
- Updated `50-target-topology.md` to keep contextual / utility decomposition in discussion and avoid a route-level logic sink.
- Added `60-creator-actions-first-slice.md` to solidify the first executable slice before implementation.
- User explicitly started `Creator Actions First Slice`.
- Implemented the slice by inlining creator header action assembly in `PRPage`, adding `usePRCreatorActions`, adding `UpdatePRStatusForm`, and removing `PRCreatorHeaderActions` plus the two old creator modal wrappers.
- Verified with frontend build, token governance lint, stale-reference search, and `git diff --check`.
- User requested integration / unit coverage for when PR Page shows or hides creator edit/status actions, with `data-testid` support and a DOM-like test environment.
- Added `happy-dom`, root Vue SFC Vitest support, and `PRPage.creator-actions.test.ts` covering creator draft/open/ready and visitor open/draft visibility states.
