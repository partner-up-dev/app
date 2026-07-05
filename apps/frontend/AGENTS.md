# AGENTS.md of PartnerUp MVP-HA Frontend

This file stays frontend-operational only. Root request routing, typed input classification, and mode selection are owned by the repository root `AGENTS.md` plus `docs/00-meta/`.

## Tech Stacks

- Framework: Vue 3 (Script Setup)
- API Client: Hono RPC Client (`hc`)
- Async State: TanStack Vue Query (v5)
- Language: TypeScript (Strict Mode)

## Documents

Read the smallest useful set and keep durable docs current:

- Root route and mode guidance: `AGENTS.md`, then `docs/00-meta/*`
- Product truth: `docs/10-prd/**/*.md`
- Cross-unit technical truth: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>.md` only when a named hard-unit doc exists and is relevant
- Active task-local packets, evidence, and temporary reasoning: `tasks/*`
- Architecture: `src/ARCHITECTURE.md`
- Vue component guideline: `src/AGENTS.components.md`
- UI naming protocol: `src/AGENTS.naming.md`
- Styling rules: `src/styles/AGENTS.md`
- Data fetching local rules: `src/queries/AGENTS.md`

Useful commands:

- `pnpm check:lint:frontend`
- `pnpm check:type:frontend`
- `pnpm check:build:frontend`
- Package maintenance: `node scripts/sync-design-web-package.mjs` (or `node scripts/sync-design-web-package.mjs <version>`) for install/upgrade `@partner-up-dev/design-web`, Codex hook refresh, and packaged Agent Skill checks.

Focused local checks:

- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`
- `pnpm --filter @partner-up-dev/frontend audit:naming`

## Coding Guidelines

- RPC infer type: do not manually define interfaces for API returns; let TypeScript infer from the Hono client.
- Request params: if backend uses `zValidator`, mismatched param types will cause type errors; do not bypass with `as any`.
- Always use Hono RPC Client (`client`) for API requests instead of manual `fetch`.
- UnoCSS icon preset is configured; use icons by `class="i-mdi-icon-name"`.
- Styling governance: use direct `sys` tokens first; add `dcs` only for real governed outputs; extend shared primitives only for stable reusable treatments with a real component contract.
- Make use of SCSS features.
- Page layout reuse: prefer `src/shared/ui/layout/PageScaffold.vue`, `PageScaffoldFlow.vue`, `PageScaffoldCentered.vue`, and `DesktopPageScaffold.vue` for route pages; do not duplicate root safe-area container styles in page files.
- Shared UI reuse: before adding page-local shells or feedback widgets, check `src/shared/ui/AGENTS.md` and prefer package primitives such as `PuButton`, `PuCard`, `PuCell`, `PuDescriptionList`, `PuDescriptionItem`, `PuChip`, `PuChipGroup`, `PuTag`, `PuInlineNotice`, `PuEmptyState`, `PuLoadingState`, `PuTabs`, `PuModal`, `PuDialog`, and `PuDrawer` when the fit is real.
- Feature composition boundary: extract reusable feature UI plus business logic into dedicated feature components instead of leaving logic in page files.
- Container vs feature split: keep container components presentational-only; they should provide layout and shell and should not own feature side effects.
- Usage-site assembly: pages should assemble container plus feature components and only own page context such as visibility, section placement, and page-level error aggregation.
- Reuse-first rule: if a second page needs the same feature behavior, reuse the extracted feature component rather than duplicating handlers in page scope.
- Scenario testability: when implementing a route workflow that may be covered by scenario or E2E tests, add stable `data-testid` values to the semantic nodes the workflow needs: primary actions, modal actions, and result-state affordances.
- `data-testid` names should describe the route and workflow node, for example `pr-detail.join.open`, and should live on the real interactive element for actions.

## File Structure

Use `src/ARCHITECTURE.md` as the source of truth.

The active structure is:

```text
src/
├── app/                    # Application wiring
├── domains/                # Domain-owned code by business area
├── shared/                 # Cross-domain infrastructure and UI primitives
├── processes/              # Cross-domain workflows
├── pages/                  # Route entrypoints only
├── stores/                 # Legacy compatibility seams only
├── lib/                    # Legacy compatibility seams only
├── locales/
├── router/                 # Legacy compatibility seams only
├── styles/
└── ...
```

Rules:

- New domain-owned modules belong under `src/domains/<domain>/*`.
- New cross-domain primitives or infrastructure belong under `src/shared/*`.
- Cross-domain workflows belong under `src/processes/*`.
- App bootstrap, providers, and router wiring belong under `src/app/*`.
- Do not add new files under legacy buckets such as top-level `queries`, `features`, `entities`, or `widgets` unless explicitly maintaining a temporary compatibility seam.

## Product And Runtime Truth Sources

Keep this file operational and avoid using it as a feature-state mirror.

For durable truth, use:

- Product what/why, workflows, rules, and business vocabulary: `docs/10-prd/**/*.md`
- Cross-unit technical truth and contracts: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`

For volatile implementation status or migration notes:

- record them in active `tasks/<task>/` packets as task-local workspace state
- keep this file limited to stable frontend operating guidance
