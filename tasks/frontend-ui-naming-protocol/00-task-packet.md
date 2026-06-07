# Frontend UI Naming Protocol

## Objective & Hypothesis

Objective: organize frontend naming so component names, file names, root classes, internal classes, ids, and test ids use a shared UI role vocabulary where practical.

Hypothesis: the repo already has a strong domain-first structure and many good `BusinessObject + UIRole` names. A gradual naming protocol can improve readability without destabilizing route contracts, backend types, scenario selectors, or product vocabulary.

## Input Route And Mode

- Input route: Constraint / Artifact.
- Current mode: Execute Slice 3 audit script.
- Execution gate: user approved Slice 3 on 2026-06-07.
- Source discussion: ChatGPT shared conversation "Web开发UI术语表" at `https://chatgpt.com/share/6a250b58-c3d0-8320-90b4-ce86e0e2a454`.

## Guardrails Touched

- Frontend architecture and domain ownership: `apps/frontend/src/ARCHITECTURE.md`.
- Component naming and splitting guidance: `apps/frontend/src/AGENTS.components.md`.
- Shared UI primitive boundary: `apps/frontend/src/shared/ui/AGENTS.md`.
- Styling governance and class ownership: `apps/frontend/src/styles/AGENTS.md`.
- Scenario testability for stable `data-testid` selectors.
- Existing URL, route-name, backend type, and API contract stability.

## Current Understanding

- The shared conversation proposes one UI naming protocol across layers:
  - component names use PascalCase: `OrderPaymentSummaryCard`
  - file names usually follow component names: `OrderPaymentSummaryCard.vue`
  - root classes use kebab-case: `order-payment-summary-card`
  - internal classes use BEM-lite: `order-payment-summary-card__header`
  - variants use `--variant`
  - state uses `is-*` / `has-*`
- The useful naming shape is `[Feature][Entity][Purpose][UIRole]`, with missing parts omitted when redundant.
- The important part is a controlled UI role suffix vocabulary, not maximal name length.
- Weak terms should be avoided unless there is an explicit local meaning: `wrapper`, `container`, `content`, `info`, `box`, `component`, `common`, `base`, `main`, `left`, `right`, `top`, `bottom`, `inner`, `outer`.
- Role terms are preferred over position terms: `header`, `body`, `footer`, `aside`, `media`, `meta`, `actions`.
- This repo already follows much of the desired shape in examples such as `PRFactsCard`, `PRHeroHeader`, `PRPreviewCard`, `PRStatusBadge`, `RouteEditor`, and `LocationPickerPanel`.

## Controlled Vocabulary Draft

Keep the first protocol deliberately small. These are the default suffixes to reach for; use a rarer word only when none of these describes the component contract.

Core component / root suffixes:

| Suffix | Meaning | Boundary |
| --- | --- | --- |
| `Page` | Route entrypoint under `src/pages`; composes page context. | Not reusable domain UI. |
| `Layout` | Slot/region arrangement with little or no business behavior. | Arranges; does not orchestrate workflows. |
| `Section` | Thematic content region, usually page-local. | Groups content; weaker than `Panel`. |
| `Panel` | Bounded functional region with meaningful interaction/state. | Hosts tools, filters, editors, settings, panes. |
| `Card` | Compact self-contained object, preview, summary, or choice. | Good for repeated items; not a whole page region. |
| `List` | One-dimensional repeated collection. | Owns iteration and empty/loading placement. |
| `Row` | One horizontal record or editor line. | Use when row shape matters more than object preview. |
| `Form` | Complete submission unit. | Owns submit/validation boundary. |
| `Field` | One labeled input/value row. | Label + control + hint/error. |
| `Editor` | Structured modification surface for an entity/value. | Broader than `Form`; can contain sections and draft state. |
| `ActionBar` | Grouped workflow actions. | Commits actions; not tool/mode controls. |
| `Dialog` | Blocking or decision overlay. | Prefer over generic modal for confirm/cancel flows. |
| `Drawer` | Edge-entering secondary workflow/detail panel. | More substantial than a popover/dropdown. |

Allowed extension suffixes, use only when they are exact:

- `View`: screen-sized mode inside a page/workspace.
- `Shell`: persistent app/feature frame; stronger than `Layout`.
- `Header` / `Footer`: reusable top/bottom region component.
- `Aside`: secondary contextual region next to the main flow.
- `Table`: columnar comparison data.
- `Grid`: repeated items where two-dimensional placement matters.
- `Picker`: focused chooser, often with modal/page/native handoff.
- `Selector`: inline visible option selection.
- `Toolbar`: compact tool/mode controls.
- `FilterBar`: controls that constrain a result set.
- `Badge` / `Chip` / `Avatar` / `Map`: stable display primitives.

State-surface names are exceptions, not structural suffixes:

- `EmptyState`, `ErrorState`, `LoadingState`, and `Skeleton` are allowed only when the component exclusively renders that result/loading state.
- Do not use these to name ordinary content regions that merely contain an empty/loading/error branch.
- `Notice` is a message primitive name when the component is literally a notice; it is not part of the general suffix protocol.

Avoid as component suffixes unless there is a documented local meaning:

- `Wrapper`, `Container`, `Content`, `Info`, `Box`, `Component`, `Common`, `Base`, `Main`, `Left`, `Right`, `Top`, `Bottom`, `Inner`, `Outer`.

## Internal Element Roles

Default internal roles:

- `header`, `body`, `footer`
- `title`, `description`, `summary`, `meta`
- `media`, `icon`, `badge`
- `leading`, `trailing`
- `actions`, `primary-action`, `secondary-action`
- `list`, `item`, `empty`, `error`, `loading`

Rules:

- Prefer `leading` / `trailing` over `left` / `right`.
- Prefer `body`, `summary`, `meta`, `media`, or `actions` over generic `content` when the role is known.
- Use `main` only inside page/layout/shell structures with a sibling `nav`, `aside`, or similar region.
- `content` is acceptable for a generic slot or existing contract, but weak as a root/component name.
- `id` is rare and reserved for anchors, form label/for, aria relationships, or explicit DOM integration.
- `data-testid` is a test contract. Rename only with scenario/unit test updates and explicit blast-radius review.

## Confirmed Constraints

- Do not rename product or backend vocabulary just to satisfy UI naming style. `PR`, `PartnerRequest`, route payload fields, and backend-inferred types remain contract-owned.
- Do not change user-facing route paths such as `/pr/:id`, `/pr/new`, `/routes/apply`, `/locations/pick`.
- Do not change scenario-owned `data-testid` values in a cosmetic pass.
- Treat `route` carefully because it has two meanings:
  - Vue/router navigation route
  - business route / itinerary domain under `src/domains/route`
- Keep changes reviewable and scoped. Broad mechanical renames need a separate impact handshake.
- Existing dirty worktree entries are unrelated and must not be reverted.

## Candidate Findings From Initial Read

Likely low-risk internal cleanup candidates:

- `apps/frontend/src/app/router.ts`: local lazy import alias `NewOrderPage` points to `OrderingFromPlacementPage.vue`; the alias can likely be aligned to the file/page meaning.
- Page-local root layout classes such as `page-main` in `MyPRsPage.vue` and `PRCreatePage.vue` could become page-scoped BEM names.
- `domains/route/ui/RouteItemRow.vue` uses `route-item-wrapper`; likely better as a row-level root or action-shell role.
- `domains/commerce/ui/ordering/RideHailingSkuCard.vue` uses `__left` and `__right`; likely better as `__media` / `__summary` / `__price` / `__meta` depending on final read.

Needs semantic review before changing:

- `OrderingFromPlacementPage.vue`: may be a valid route-entry name if the page is specifically created from placement context.
- `AdminCommerce*Content.vue`: `Content` may represent an internal product-management workspace region rather than a reusable component shape.
- `MiniumCommonFooter.vue`, `FullCommonFooter.vue`: `Common` is weak, but footer ownership spans support/landing and may require product naming judgement.
- `processes/route-handoff`: route-level process naming is deliberate and tied to event Form Mode handoff.

## Progressive Plan

### Slice 0 - Protocol Solidification

- Add a compact durable naming protocol section to `apps/frontend/src/AGENTS.components.md` or a nearer frontend doc.
- Keep it as guidance, not an enforcement script.
- Prefer the core suffix table; keep extension terms secondary and narrow.
- Verification:
  - documentation diff review
  - no code behavior tests required

Exit criteria:

- The compact core vocabulary and weak-term rules are written in one discoverable frontend source.
- Status: implemented in `apps/frontend/src/AGENTS.naming.md`; `apps/frontend/src/AGENTS.components.md` links to it.

### Slice 0B - Guidance Split

- Compress `apps/frontend/src/AGENTS.components.md` to global component rules only.
- Move naming protocol to `apps/frontend/src/AGENTS.naming.md`.
- Move shared primitive catalog to `apps/frontend/src/shared/ui/AGENTS.md`.
- Move domain component indexes to nearer domain `ui/AGENTS.md` files.
- Move shared upload helper contracts to `apps/frontend/src/shared/upload/AGENTS.md`.
- Verification:
  - documentation diff review
  - `git diff --check`

Exit criteria:

- Global component guidance is small and navigational.
- Detailed contracts live with the folders that own them.

### Slice 1 - Local Alias And Class Cleanup

- Rename only local imports, local constants, and scoped class names where no filename or public selector changes are needed.
- Avoid `data-testid`, route names, route paths, exported types, and backend-owned names.
- Target files:
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/pages/MyPRsPage.vue`
  - `apps/frontend/src/pages/PRCreatePage.vue`
  - `apps/frontend/src/domains/route/ui/RouteItemRow.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue`
- Applied changes:
  - `NewOrderPage` local router alias -> `OrderingFromPlacementPage`
  - page-local generic classes in `MyPRsPage.vue` and `PRCreatePage.vue` -> page-scoped BEM-lite roles
  - `RouteItemRow.vue` wrapper/item classes -> `route-item-row` root and role-based internals
  - `RideHailingSkuCard.vue` positional `__left` / `__right` -> `__summary` / `__pricing`
- Verification:
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - targeted unit tests if touched files have adjacent tests
  - `pnpm test:unit:frontend` if changes fan out

Exit criteria:

- Internal names read as role-based UI structure without changing public behavior or test selectors.
- Status: implemented and verified.

### Slice 2 - Component/File Rename Candidates

- Review ambiguous component names one by one and only rename when the new name improves ownership or UI-role clarity.
- Update imports and adjacent tests atomically.
- Applied renames:
  - `MiniumCommonFooter.vue` -> `SupportNavFooter.vue`
  - `FullCommonFooter.vue` -> `LandingFooter.vue`
  - `OrderingFromPlacementPage.vue` -> `OrderingSupportPage.vue`
  - `AdminCommerceProductActionsContent.vue` -> `AdminCommerceProductActionBar.vue`
  - `AdminCommerceProductRailContent.vue` -> `AdminCommerceProductRailList.vue`
  - `AdminCommerceSkuRailContent.vue` -> `AdminCommerceSkuRailList.vue`
  - `AdminCommerceSpuEditorContent.vue` -> `AdminCommerceSpuEditor.vue`
  - `AdminCommerceSkuEditorContent.vue` -> `AdminCommerceSkuEditor.vue`
  - `AdminCommerceCancellationPolicyEditorContent.vue` -> `AdminCommerceCancellationPolicyEditor.vue`
  - `AdminCommerceProductErrorContent.vue` -> `AdminCommerceProductErrorToast.vue`
- Deliberate non-renames:
  - `AdminCommerceProductWorkspaceGate.vue`: `Gate` already communicates the conditional workspace boundary.
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm test:unit:frontend`
  - scenario tests only if selectors or route workflows change

Exit criteria:

- Each rename has an explicit before/after reason and a bounded import/test diff.
- Status: implemented and verified.

### Slice 3 - Optional Enforcement / Audit

- Add a lightweight report-only audit script after the protocol stabilizes through manual use.
- The first version reports naming and split-boundary candidates, but does not fail CI.
- Implemented command:
  - `pnpm --filter @partner-up-dev/frontend audit:naming`
- Implemented script:
  - `apps/frontend/scripts/audit-ui-naming.mjs`
- Default checks:
  - weak component-name words, excluding known product/platform false positives
  - semantic-role split candidates where multiple components share the same role/root tag without a variant API
  - domain `Shared*ActionBar` style naming, when present
- Optional check:
  - pass `--include-root-class` to inspect root class drift; disabled by default because the first dry run showed it is too noisy for normal review.
- Verification:
  - script dry run
  - false-positive review

Exit criteria:

- Any enforcement proposal has low false-positive rate and clear exceptions.
- Status: implemented and verified.

## Impact Handshake For First Code Slice

- Address and Object:
  - frontend component guidance doc
  - local frontend SFC classes and local route lazy-import aliases only
- State Diff:
  - weak structural names -> controlled UI role names
- Blast Radius Forecast:
  - CSS selectors inside scoped SFC styles
  - local imports/constants
  - adjacent unit tests if selectors are directly queried
- Invariants Check:
  - route paths and route names remain unchanged
  - user-visible copy remains unchanged
  - backend/API types remain unchanged
  - scenario `data-testid` selectors remain unchanged
- Verification:
  - token lint for style-governed frontend changes
  - frontend unit tests where touched
  - frontend build for file/component renames

## Verification Log

- 2026-06-07: shared conversation read through browser automation; relevant naming protocol extracted.
- 2026-06-07: initial frontend read only; no production code modified.
- 2026-06-07: task packet created.
- 2026-06-07: suffix and internal role semantics added to reduce boundary ambiguity.
- 2026-06-07: vocabulary compressed into a small core table plus narrow extension terms.
- 2026-06-07: state-surface names removed from core suffixes and documented as exceptions only.
- 2026-06-07: Slice 0 protocol section added to `apps/frontend/src/AGENTS.components.md`.
- 2026-06-07: documentation split started after user feedback that `AGENTS.components.md` was too large.
- 2026-06-07: naming protocol moved to `apps/frontend/src/AGENTS.naming.md`; shared and domain component indexes moved to nearer `AGENTS.md` files.
- 2026-06-07: Slice 1 local alias and scoped class cleanup applied to router, MyPRsPage, PRCreatePage, RouteItemRow, and RideHailingSkuCard.
- 2026-06-07: Slice 1 verification passed:
  - exact old-name residue checks returned no matches
  - `data-testid` selectors remained unchanged
  - `git diff --check` passed
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` passed
  - `pnpm --filter @partner-up-dev/frontend build` passed
- 2026-06-07: Slice 2 component/file renames applied; route paths/names, user-facing copy, API types, and `data-testid` selectors were left unchanged.
- 2026-06-07: Slice 2 verification passed:
  - old component names, old import paths, old footer class prefixes, and old footer CSS variables returned no matches
  - `git diff --check` passed
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` passed
  - `pnpm --filter @partner-up-dev/frontend build` passed
  - `pnpm exec vitest run --project frontend-unit apps/frontend/src/pages/PRPage.creator-actions.test.ts` passed
  - `pnpm test:unit:frontend` passed
- 2026-06-07: Slice 3 audit script added and dry-run reviewed.
  - default report scans 236 Vue components
  - default report returns 6 findings: one footer split candidate, four `Content` naming candidates, and one low-severity `Info` naming candidate
  - first `root-class-drift` draft returned 123 findings and was moved behind `--include-root-class`
  - `node --check apps/frontend/scripts/audit-ui-naming.mjs` passed
  - `pnpm --filter @partner-up-dev/frontend audit:naming` passed
  - `pnpm --filter @partner-up-dev/frontend audit:naming -- --json` passed

## Next Step

Review the six audit findings and decide whether to correct the footer boundary first.
