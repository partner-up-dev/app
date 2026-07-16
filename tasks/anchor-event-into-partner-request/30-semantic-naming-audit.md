# Semantic Naming Audit

## Method

The audit used AST structure, type declarations, imports, call sites, and data flow across controllers, repositories, use cases, Vue pages/processes, query keys, telemetry, tests, and migrations. Text search was used only as a residual inventory.

Key evidence:

- `findOneByType` call flow shows current PR creation, meeting-point, frequency, read, and notification behavior resolving configuration from `PartnerRequest.type`.
- frontend import/process flow forms a closed chain: landing page → view assignment/query → recommend/create/materialize → handoff → PR join/waitlist telemetry.
- router objects expose four Event route families; changing one path string cannot remove the domain dependency.
- AST property scan found `type`, `kind`, `mode`, `status`, `state`, `source`, and `context` reused by many unrelated owners. The answer is qualification and owner consistency, not one global replacement word.

## Canonical Vocabulary Rules

| Word | Canonical use | Required qualification / forbidden use |
|---|---|---|
| `type` | Existing `PR.type` business classification/resolution key | Preserve field/API name. Do not use it as a generic union discriminator or rename it to scenario/category. Protocol-owned `type` fields remain local exceptions. |
| `kind` | A scoped tagged-union variant | Prefer owner-qualified concepts such as `placeKind`, `gateKind`, `entryKind`; nested `place.kind` is acceptable. It is never a synonym for `PR.type`. |
| `mode` | A qualified mutually exclusive operating/presentation choice | Use `viewMode`, `partnerBoundsMode`, `availabilityRuleMode`; avoid a cross-domain bare `mode`. External provider fields remain unchanged. |
| `status` | A durable/resource lifecycle value | Qualify `prStatus`, `visibilityStatus`, application/tag status. Never merge the Anchor catalog status machine with `PR.status`. |
| `state` | Transient UI/workflow or internal computation state | Use `uiState`, `resultState`, `rosterState`, `slotState`, `pricingState`; do not use as an alternate persisted PR status. |
| `source` | Provenance, producer, or entry path | Use `createSource`, `entrySource`, `identitySource`, `meetingPointSource`, `sourceQr`; never use as identity. |
| `context` | An ambient evaluation/read projection with a stated owner | Use `journeyContext`, `discoveryScope`, provider/rule context. Do not hide identity, policy, or a god DTO behind bare `Context`. |
| `scope` | A concrete inclusion/filter boundary | Prefer `discoveryScope`, `matchesTimeWindow`, `isAllowedPlace`; do not use ownership language for matching. |
| `event` | Telemetry event, DOM event, provider callback, or explicit historical compatibility | Business `AnchorEvent` vocabulary is removed. Never bulk-delete legitimate telemetry/DOM/provider terms. |
| `batch` | Only a real persisted/operational batch | Old Anchor Event batch tables and APIs are retired; time-window grouping must not be called a batch. |
| `category` | A real taxonomy owned by a domain | Current preference parsing may use `preferenceCategory`; do not make category another name for `PR.type`. |

## Concrete High-value Corrections

| Current name | Observed meaning | Target name/direction |
|---|---|---|
| `hasEventStarted(pr.time)` | Whether the PR time window has started | `hasPRTimeWindowStarted`. |
| `eventOwnsTimeWindow(event, time)` | Type config time-window membership | `matchesConfiguredTimeWindow` / `matchesPRTypeTimeWindow`; no ownership claim. |
| `isPublicEventScopedLocation` | Configured place membership plus POI visibility | `isPublicConfiguredPlace` or other owner-qualified predicate. |
| `isJoinableStatus` | Only PR `OPEN` is accepted in relevant commands | `isPRJoinable`. |
| `isActiveVisiblePRStatus` | PR is eligible for active discovery | `isPRActiveForDiscovery`. |
| `isPublicVisiblePRStatus` | PR may be read publicly, including history | `isPRPubliclyReadable`. |
| `batchStartTimestamp` | Start timestamp of a PR time-window group | `timeWindowStartTimestamp`. |
| `AnchorEventDummyPR` | Transient creation suggestion without PR id/status | `PRCreationSuggestion` / `PRDiscoveryOpportunity`. |
| `AnchorEventRealPRBrowseItem` | Existing discoverable PR | `PRDiscoveryCandidate`. |
| `EventPRCreateCard` | Assisted PR authoring control | `PRAssistedCreateCard`. |
| `activityType`, `scenarioType`, `event.type` in one flow | The same `PR.type` value under different labels | Canonical internal variable `prType`; boundary field remains `type`. |
| `AnchorEventPRContextRepository` | Synthesized PR + config projection | Split into purpose-named readers/resolvers; repository remains persistence-only. |

## Legitimate Differences That Must Stay Different

- `place.kind = location | route`, join-gate `kind`, and start-rule `kind` are separate tagged unions.
- Problem Details `type`, feedback-answer `type`, commerce/payment/provider `type`, and telemetry `eventName` are protocol-owned meanings.
- POI availability `mode`, pricing rounding `mode`, provider submission `mode`, and PR Discovery `viewMode` are not one enum.
- `PartnerRequest.status`, visibility status, partner/slot state, route-application status, and preference-tag status are separate state machines.
- Telemetry/DOM/provider “event” remains valid; only the Anchor Event business meaning is removed.

## Naming Migration Rule

Rename a semantic cluster atomically across definition, callers, DTOs, tests, telemetry adapters, and documentation. Do not leave aliases on both sides unless a named compatibility boundary owns and expires them.

The final residual check must be structural:

1. no frontend imports from `domains/event` or admin Anchor Event UI;
2. no router component or query key owned by Event;
3. no frontend DTO or process state carrying `eventId`, `fromEvent`, or assignment revision;
4. no Event-prefixed testids/i18n/CSS in canonical views;
5. allowlisted `event` occurrences are classified as telemetry, DOM, provider protocol, historical migration, or temporary compatibility.
