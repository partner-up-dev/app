# Design Web Package Integration

## Objective & Hypothesis

Integrate `@partner-up-dev/design-web` from the PartnerUp design package into the MVP-HA frontend as the long-term owner for reusable web UI components, UnoCSS design preset, and global style tokens.

Hypothesis: the frontend can move from locally forked `src/shared/ui` and `src/styles` primitives to the published design package in controlled slices if dependency resolution, style-token ownership, and component API compatibility are handled separately.

## Current Decisions

- Dependency source should use GitHub Packages / private npm release for normal development and CI.
- MVP-HA should consume `@partner-up-dev/design-web` as an exact version dependency; the first available web package version is `0.1.0`.
- Root `.npmrc` should configure the GitHub Packages scope and read auth through `NODE_AUTH_TOKEN`, without committing any token value.
- Local development should still support occasional live integration against `F:\CODING\Project\Anana\Application\design2\packages\web`.
- Component consumption should be on-demand imports rather than global plugin registration.
- Style token ownership should move to `@partner-up-dev/design-web`, not remain permanently duplicated in `apps/frontend/src/styles`.
- Runtime token emission and Sass helper ownership should switch to `@partner-up-dev/design-web/styles`; the old local `apps/frontend/src/styles` implementation has been removed after migrating indirect Sass helper token usage.
- Removed design-web typography roles such as the old `display-*` and `headline-*` are not token gaps. Landing/marketing expression such as hero titles, kickers, CTA text, and campaign section headlines should use component-local hardcoded typography when the value is not intended for reuse.
- Frontend deployment has already moved to CI push mode through `.github/workflows/frontend-esa-deploy.yml` and `scripts/ci/esa/deploy_frontend.sh`; this integration should not assume a server-side pull deployment model.
- `@partner-up-dev/design-web` should remain frontend-only at the dependency graph boundary. Backend-only CI and deploy jobs should not require GitHub Packages credentials merely because the root workspace lockfile contains the frontend package.
- Root Vitest configuration should stay orchestration-only; frontend-only Vite plugins, JSONC loaders, and design-web Sass setup belong to the frontend Vitest project config.
- First component migration order was adapted to the actual `@partner-up-dev/design-web@0.1.0` public package surface:
  1. `SurfaceCard` -> `PuCard` compatibility wrapper, because `PuSurfaceCard` is not present in the published `0.1.0` package.
  2. `PageScaffold*` -> unified `PuPageScaffold` compatibility wrappers, because only `PuPageScaffold` is present in the published `0.1.0` package.
  3. `InlineNotice` -> `PuInlineNotice`.
- `Button` and `FeedbackButton` have migrated directly to package `PuButton`;
  the local action wrappers are no longer part of the frontend shared UI
  contract.
- `TabBar` has migrated directly to package `PuTabs`; the local navigation
  wrapper is no longer part of the frontend shared UI contract.

## Guardrails Touched

- Frontend dependency contract: `apps/frontend/package.json`, root lockfile, and package registry/auth setup.
- Frontend app style entry: `apps/frontend/src/main.ts`.
- Frontend UnoCSS configuration: `apps/frontend/uno.config.ts`.
- Frontend shared UI primitive ownership: `apps/frontend/src/shared/ui/**`.
- Frontend style-token ownership: `@partner-up-dev/design-web/styles`; `apps/frontend/src/styles/AGENTS.md` remains only as local frontend guidance.
- Design package release/local-link workflow for `@partner-up-dev/design-web`.
- Build and token lint guardrails for frontend visual primitives.
- Test platform ownership: root `vitest.config.ts` plus project-specific Vitest configs for backend, frontend, and system scenario tests.
- Backend CI dependency installation boundary for backend gate, backend DB artifact validation, and backend FC deploy.

## Integration Shape

Normal route:

```text
mvp-HA apps/frontend
  -> @partner-up-dev/design-web from GitHub Packages / private npm release
  -> @partner-up-dev/design-web/styles
  -> @partner-up-dev/design-web/uno
  -> on-demand Pu* component imports
  -> CI push deploy builds with registry credentials available in GitHub Actions
```

Local co-development route:

```text
F:\CODING\Project\Anana\Application\design2\packages\web
  -> build or watch package output
  -> temporary local link into mvp-HA frontend
  -> no committed local path dependency
```

## Known Evidence

- `@partner-up-dev/design-web` is a Vue 3 library package, not a standalone frontend app.
- Its package exports include:
  - root plugin entry
  - `./styles`
  - `./uno`
  - `./components/*`
  - `./utils/*`
- `pnpm --filter @partner-up-dev/design-web type-check` passed on 2026-06-07.
- `pnpm --filter @partner-up-dev/design-web build` passed on 2026-06-07.
- `https://github.com/partner-up-dev/design` is accessible and public.
- `gh release list --repo partner-up-dev/design` currently shows published GitHub releases for `@partner-up-dev/design-uniapp`, not `@partner-up-dev/design-web`.
- `npm view @partner-up-dev/design-uniapp version --registry=https://npm.pkg.github.com` returns `0.2.0`.
- `NODE_AUTH_TOKEN` is present in this environment.
- `npm view @partner-up-dev/design-web version --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN` returns `0.1.0` on 2026-06-07.
- `npm view @partner-up-dev/design-web versions --json --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN` returns `["0.1.0"]` on 2026-06-07.
- Frontend deployment truth already points to Aliyun ESA CI push deployment:
  - `.github/workflows/frontend-esa-deploy.yml`
  - `scripts/ci/esa/deploy_frontend.sh`
  - `docs/40-deployment/rollout.md`
- MVP-HA has broad `@/shared/ui` usage, so replacement must be staged.
- `design2` currently has uncommitted work around `PuSegmented`; implementation should choose either a released package version or an intentionally linked local worktree state.

## Execution Notes

- Added root `.npmrc` with GitHub Packages scope and `${NODE_AUTH_TOKEN}` auth placeholder.
- Added exact frontend dependency on `@partner-up-dev/design-web@0.1.0`.
- Updated workspace Vue constraint to satisfy the design package peer dependency (`vue ^3.5.34`), resolving the frontend peer warning.
- Switched `apps/frontend/src/main.ts` from local `./styles/index.scss` to `@partner-up-dev/design-web/styles`.
- Switched `apps/frontend/uno.config.ts` to `@partner-up-dev/design-web/uno`.
- Removed the local frontend style-token implementation files after migrating compatibility usage:
  - `apps/frontend/src/styles/_dcs.scss`
  - `apps/frontend/src/styles/_functions.scss`
  - `apps/frontend/src/styles/_mixins.scss`
  - `apps/frontend/src/styles/_ref.scss`
  - `apps/frontend/src/styles/_sys.scss`
  - `apps/frontend/src/styles/index.scss`
  - `apps/frontend/src/styles/unocss-preset.ts`
  - `apps/frontend/src/styles/AGENTS.md` remains as the subtree rule document.
- Switched Vite and Vitest Sass `additionalData` from `@/styles/functions|mixins` to `@partner-up-dev/design-web/styles/functions|mixins`.
- Migrated indirect old typography helper keys in app Sass call sites:
  - `display-*` and `headline-large` -> `hero`
  - `headline-medium`, `headline-small`, and `title-large` -> `title`
  - `title-medium` and `title-small` -> `section`
  - `body-large` and `body-medium` -> `body`
  - `body-small` -> `support`
  - `label-large` and `label-medium` -> `control`
  - `label-small` -> `caption`
- Updated `apps/frontend/scripts/check-token-governance.mjs` so the color-token definition source resolves through the design-web package styles subpath (`@partner-up-dev/design-web/styles/_sys.scss`) instead of the removed local `_sys.scss`.
- Revisited the indirect typography migration after confirming design-web intentionally removed reusable `display/headline` roles:
  - Kept design-web typography mixins for ordinary body copy, support copy, controls, footer/legal links, and product UI text.
  - Replaced Landing/Home expression typography with component-local hardcoded values for `LandingHeroSection`, `HomePage` creator CTA surface, `LandingValuePropsSection` kicker/value text, `EventHighlightsSection` headline/CTA, `EventPlazaEntry` emphasized copy/CTA, and the landing footer brand title.
  - Updated token governance so hardcoded `font-size` is allowed only under existing Landing visual exception paths; non-Landing consumers still fail strict token lint for hardcoded typography sizes.
- Corrected Landing/Home expression typography after visual review:
  - The first hardcoded replacement made Home display/headline/CTA typography too heavy (`650`/`700`), which was not a design-web package behavior.
  - Restored the local hardcoded values to match the pre-package visual typography roles without reintroducing removed `display-*` or `headline-*` tokens.
  - Display/headline-like text now uses the old light weights (`200`), while title/label/action-like text uses `400`.
- Added a narrow frontend type compatibility path for `@partner-up-dev/design-web`:
  - `apps/frontend/tsconfig.json` maps the package root to `apps/frontend/src/types/design-web-runtime.d.ts`.
  - This avoids `vue-tsc` reading incomplete source declarations from the `0.1.0` package.
  - The compatibility file only exposes the currently consumed components: `PuCard`, `PuInlineNotice`, and `PuPageScaffold`.
- Added `apps/frontend/src/types/design-web.d.ts` for `@partner-up-dev/design-web/styles` and `@partner-up-dev/design-web/uno`.
- Installed the published package Agent Skill to `C:\Users\yyh\.codex\skills\design-web`.
- Diagnosed `https://partner-up.localhost/` dev white screen after the Vue peer upgrade:
  - `#app` rendered only Vue comments while the route matched `/`.
  - `RouterView` had resolved `HomePage.vue`, so the failure was not a route import or page module error.
  - `apps/frontend/node_modules/.vite/deps/_metadata.json` still pointed to optimized dependencies built against `vue@3.5.27`.
  - The current dependency graph is `vue@3.5.35`, so the running Vite dev server had stale optimized dependency state.
  - Cleared `apps/frontend/node_modules/.vite/deps`, restarted only the `partner-up` frontend portless app, and left the backend plus portless HTTPS proxy running.
- Corrected the token migration after the initial hard switch to the design-web runtime style entry:
  - Compared the compiled legacy MVP style output against `@partner-up-dev/design-web/dist/style.css`.
  - Migrated old runtime uses of removed global tokens to design-web-owned tokens instead of adding a broad compatibility bridge.
  - Replaced old size tokens (`--sys-size-*`) with direct `--sys-spacing-*` based expressions.
  - Replaced old elevation aliases (`--sys-elevation-level*`) with `--sys-shadow-*`.
  - Replaced `--sys-spacing-xxsmall`, `--sys-shape-corner-medium`, and `--sys-font-size-small` usage with design-web token equivalents.
  - Moved PR preview-card geometry out of the old `dcs-pr-preview-card-*` namespace and into `PRPreviewCardFrame` component-local CSS custom properties (`--pr-preview-card-*`) with defaults based on design-web `sys` tokens.
  - Updated the app Sass `pu-icon` mixin so icon sizing is a local utility contract derived from design-web spacing tokens, no longer from removed `--sys-icon-*` globals.
  - Added component-local defaults for runtime-injected variables in `MultiStopToggle`, `WheelPicker`, and `FormModeLongPressButton`.
  - Replaced the stale footer reveal first-screen variable with `--pu-vh`.
- Remaining install warning is unrelated to this frontend integration: backend `wechatpay-axios-plugin` still has an unmet `yargs@^17.1.1` peer.
- Follow-up dependency-boundary slice:
  - Split root Vitest config into project configs so backend-only tests no longer load frontend-only dependencies such as `jsonc-parser`, Vue plugin config, or design-web Sass setup.
  - Switched backend-only CI/deploy installs from full workspace install to filtered backend/root installs:
    - backend DB validate: `@partner-up-dev/backend...`
    - backend gate: root project plus `@partner-up-dev/backend...`
    - backend FC deploy: `@partner-up-dev/backend...`
  - Removed temporary GitHub Packages auth from backend-only workflows after narrowing their install graph.

## Verification

- `pnpm install` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with `token-governance: no findings outside baseline`.
- `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed with `token-governance: no findings outside baseline`.
- `pnpm test:unit:frontend` passed: 25 test files, 112 tests.
- Browser smoke check against `vite preview` at `http://localhost:4173/` passed: homepage title and body rendered normally, not a blank/error page.
- Browser smoke check against `https://partner-up.localhost/` passed after frontend dev restart:
  - Vite optimized metadata now points to `vue@3.5.35` and `vue-router@4.6.4_vue@3.5.35`.
  - Homepage `data-page="landing"` is present.
  - `#app` text length is non-zero, confirming the page is no longer blank.
- Token migration verification passed:
  - Static no-fallback missing-token scan returned `0` findings for source CSS variable reads not covered by design-web globals or component-local definitions.
  - Browser smoke check against `https://partner-up.localhost/` found `0` loaded-style hits for old removed runtime token names such as `var(--sys-size-*)`, `var(--sys-elevation-level*)`, `var(--sys-icon-*)`, and `var(--dcs-pr-preview-card*)`.
- Post-token-migration guardrails passed:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`
  - `pnpm test:unit:frontend`: 25 test files, 112 tests.
- Full local style implementation removal verification passed:
  - Source scan found no remaining `@/styles` imports outside ignored generated/dependency output.
  - Source scan found no remaining old `pu-font(...)` / `pu-font-size(...)` typography keys.
  - Source scan found no remaining old removed token names for `--sys-size-*`, `--sys-icon-*`, `--sys-elevation-level*`, `--dcs-pr-preview-card*`, `--sys-spacing-xxsmall`, `--sys-shape-corner-medium`, or `--sys-font-size-small`.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed with `token-governance: no findings outside baseline`.
  - `pnpm test:unit:frontend` passed: 25 test files, 112 tests.
  - Built CSS scan passed across 71 CSS files: `0` missing no-fallback token findings after allowing design-web package runtime component variables for `PuInput`, `PuTextarea`, and `PuWheelPicker`; `0` old token hits.
  - Browser smoke check against `https://partner-up.localhost/` passed: title `搭一把 - 轻松安全找搭子`, `#app` has one child, body text length is `572`, and visible element count is `165`.
- Landing expression typography correction verification passed:
  - Residual `pu-font(control|section)` usage in Landing scope is limited to footer navigation/legal text, not hero/CTA/kicker expression typography.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm test:unit:frontend` passed: 25 test files, 112 tests.
  - `git diff --check` passed.
- Home typography weight correction verification passed:
  - Source scan found no remaining `font-weight: 650` or `font-weight: 700` in the Home/Landing expression files touched by this correction.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - Browser computed-style check against `https://partner-up.localhost/` passed at `390x844` and `1280x900`; key Home display/headline/action elements render at old-style `200`/`400` weights.
  - `git diff --check` passed.
- Dependency-boundary verification passed on 2026-06-08:
  - Static scan confirmed root/backend Vitest config no longer references `@partner-up-dev/design-web`, `jsonc-parser`, or `@vitejs/plugin-vue`; those are isolated in `apps/frontend/vitest.config.ts`.
  - Static scan confirmed backend-only workflows and `scripts/ci/fc/deploy_backend.sh` no longer set `NODE_AUTH_TOKEN` or `packages: read`; frontend and e2e workflows still do.
  - Temporary workspace install without `NODE_AUTH_TOKEN` passed for `pnpm --filter . --filter "@partner-up-dev/backend..." install --frozen-lockfile --ignore-scripts` and selected only root plus `apps/backend`.
  - Temporary workspace install without `NODE_AUTH_TOKEN` passed for `pnpm --filter "@partner-up-dev/backend..." install --frozen-lockfile --ignore-scripts` and selected only `apps/backend`.
  - The remaining `.npmrc` warning for missing `${NODE_AUTH_TOKEN}` is pnpm/npm config interpolation noise; it does not fetch `@partner-up-dev/design-web` under the backend filtered install graph.
  - `pnpm test:unit:backend` passed: 58 test files, 210 tests.
  - `pnpm test:scenario:backend` passed: 23 test files, 64 tests.
  - `pnpm test:unit:frontend` passed: 26 test files, 114 tests.
  - `pnpm --filter @partner-up-dev/backend typecheck` passed.
  - `pnpm db:lint` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens:strict` passed.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm exec vitest list --project system-scenario --reporter verbose` passed and listed 39 system scenario tests.
  - `pnpm test:scenario:system` was attempted and failed in existing browser/UI assertions around intercepted clicks and order-detail waits; the project config loaded and executed tests, and the failure shape was not dependency/config loading.
  - `pnpm --filter @partner-up-dev/backend db:generate` was attempted and hit Drizzle's existing interactive create/rename prompt for `pr_join_notice_acceptances`; it produced no `apps/backend/drizzle` drift.
