# AGENTS.md of PartnerUp MVP-HA Web

This file stays web-client operational only. Root request routing, typed input classification, and mode selection are owned by the repository root `AGENTS.md` plus `docs/00-meta/`.

## Tech Stacks

- Framework: Vue 3 (Script Setup)
- API Client: Hono RPC Client (`hc`)
- Async State: TanStack Vue Query (v5)
- Language: TypeScript (Strict Mode)

## Documents

Follow root `AGENTS.md` for request routing, typed input classification, and durable doc ownership.

Web-local entrypoints:

- Architecture: `src/ARCHITECTURE.md`
- Vue component guidance: `src/AGENTS.components.md`
- UI naming protocol: `src/AGENTS.naming.md`
- Styling rules: `src/AGENTS.styles.md`
- Data fetching local rules: `src/queries/AGENTS.md`
- Shared UI primitive ownership: `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
- Named Unit TDD docs under `docs/30-unit-tdd/<unit>.md` only when relevant.
- Active task-local packet under `tasks/` for volatile implementation state.

Useful commands:

- `pnpm check:lint:web`
- `pnpm check:type:web`
- `pnpm check:build:web`
- Package maintenance: `node scripts/sync-design-web-package.mjs` (or `node scripts/sync-design-web-package.mjs <version>`) for install/upgrade `@partner-up-dev/design-web`, Codex hook refresh, and packaged Agent Skill checks.

Focused local checks:

- `pnpm --filter @partner-up-dev/web lint:tokens`
- `pnpm --filter @partner-up-dev/web lint:tokens:strict`
- `pnpm --filter @partner-up-dev/web audit:naming`

## Coding Guidelines

- RPC infer type: do not manually define interfaces for API returns; let TypeScript infer from the Hono client.
- Request params: if backend uses `zValidator`, mismatched param types will cause type errors; do not bypass with `as any`.
- Always use Hono RPC Client (`client`) for API requests instead of manual `fetch`.
- UnoCSS icon preset is configured; use icons by `class="i-mdi-icon-name"`.
- Styling governance lives in `src/AGENTS.styles.md`.
- Make use of SCSS features.
- Component ownership lives in `src/AGENTS.components.md`; shared primitive ownership lives in `docs/30-unit-tdd/frontend-shared-ui-primitives.md`.
- Use `@partner-up-dev/design-web#design-web` when package component selection, props, slots, events, imports, or caveats matter.
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
├── lib/                    # Narrow existing compatibility/util seams only
├── locales/
├── styles/
└── ...
```

Rules:

- New domain-owned modules belong under `src/domains/<domain>/*`.
- New cross-domain primitives or infrastructure belong under `src/shared/*`.
- Cross-domain workflows belong under `src/processes/*`.
- App bootstrap, providers, and router wiring belong under `src/app/*`.
- The retired top-level `router` and `stores` bridges must not be recreated;
  session state belongs under `shared/auth`.
- Do not add new files under legacy buckets such as top-level `queries`, `features`, `entities`, or `widgets` unless explicitly maintaining a temporary compatibility seam.
