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
- User reopened design discussion for `PRContextualActions` and `PRUtilityActions`.
- Added `70-contextual-utility-action-design.md` with a feature-region plus presentational-action-group proposal, keeping feature logic in PR-domain middle layers while keeping `PRPage` as route assembly.
- User asked to first map what `PRContextualActions` currently carries and what its child topology looks like.
- Added `71-current-pr-contextual-actions-topology.md` to record the current capability inventory, direct child graph, use-case graph, state graph, and pending replay graph.
- User proposed deleting `PRContextualActions` and replacing it with four peer feature components: join/exit, waitlist, confirmation, and check-in/feedback.
- Updated `70-contextual-utility-action-design.md` with the revised peer-component topology and the `prId`-only component contract.
- User observed that each action component would need `usePRDetail`, making a `prDetail` / PR object prop a better boundary.
- Updated the revised topology so `PRPage` keeps the canonical `usePRDetail` observer and passes `pr: PRDetailView` into peer action components, with mutations deriving `pr.id`.
- User decided live polling can be removed after usage showed little value.
- Updated the contextual action design so action success refresh relies on existing query invalidation, with `usePRLivePolling`, `resetLivePolling`, and page-level contextual `action-success` refetch wiring planned for removal.
- User confirmed the PR contextual action refactor may start, includes deleting live polling and related test mocks, and asked to record `PRJoinFlow`'s internal `usePRDetail` as later work.
- Added a durable `PRJoinEntryContext` context-erosion note to `docs/20-product-tdd/cross-unit-contracts.md`.
- Implemented the contextual action refactor by replacing `PRContextualActions` with four peer action components, removing `usePRLivePolling`, updating `PRPage`, and adding focused component tests.
- Committed the contextual action split as `556d6678 refactor(pr): split contextual PR actions`.
- User asked to continue with `PRUtilityActions` and add click telemetry for the split `PRPageEventPlazaEntry`.
- Added `73-utility-actions-refactor-slice.md` to track the utility action split.
- Deleted `PRUtilityActions` and replaced it with peer utility components: `PRBetaGroupAction`, `PRMessageThreadAction`, `PRShareAction`, `PRPageEventPlazaEntry`, and `PRNotificationSubscriptionsSection`.
- Updated `PRPage` to directly arrange these utility components and pass canonical share context into `PRShareAction`.
- Added `EVENT_PLAZA_ENTRY` telemetry for PR detail event-plaza clicks and covered the utility components with focused happy-dom tests.
