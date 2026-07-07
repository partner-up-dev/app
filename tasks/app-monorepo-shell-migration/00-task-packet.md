# App Monorepo Shell Migration

## Objective & Hypothesis

- Objective: upgrade the repository identity and local application topology toward the final `partner-up-dev/app` repository while keeping the root package private and preserving the existing Vue web application as the official Web client.
- Hypothesis: a shell-first migration is safer than introducing real uni-app or Flutter runtime code now, because Web remains the only clearly owned client surface and the product responsibility of uni-app and Flutter is still intentionally unresolved.

## Guardrails Touched

- Repository identity:
  - GitHub repository target name: `partner-up-dev/app`.
  - Do not create a new branch unless explicitly requested by the user.
  - Keep the root package private; do not publish the monorepo root as a package.
- Monorepo topology:
  - Current `apps/frontend` is the official Web client and should become `apps/web` when execution starts.
  - Future `apps/uniapp` and `apps/flutter` directories are reserved boundaries only.
  - Do not introduce `package.json`, `pubspec.yaml`, app runtime code, generated project scaffolds, or CI requirements for the reserved app targets until their responsibilities are explicit.
- Product and technical truth ownership:
  - Product behavior remains owned by `docs/10-prd/`.
  - Cross-unit technical contracts remain owned by `docs/20-product-tdd/`.
  - Task-local planning and migration evidence stay under this task packet until stable truths are promoted.
- Existing validation:
  - Preserve root `pnpm` scripts as the canonical local validation entrypoints.
  - Keep `pnpm dev:ensure` / `pnpm dev:portless` as the local service path.
  - Avoid build-only confidence when behavior changes, but this slice should be structural and behavior-preserving.

## Current Decisions

- The final GitHub repository name should be `app`.
- The monorepo root remains private.
- The existing Vue 3 / Vite Web client remains the official Web client.
- uni-app and Flutter responsibilities are not yet clear enough for real implementation.
- Create only placeholder directories plus local `AGENTS.md` files for uni-app and Flutter during the first execution slice.
- The root package should not become a public package. A future execution may either:
  - keep the current root package name to minimize churn, or
  - rename it to `@partner-up-dev/app` while keeping `"private": true`.

## Proposed Target Topology

```text
/
|-- apps/
|   |-- backend/        # Existing Hono API
|   |-- web/            # Existing Vue/Vite official Web client
|   |-- uniapp/         # Reserved placeholder until target platforms are explicit
|   `-- flutter/        # Reserved placeholder until native-app responsibility is explicit
|-- packages/
|   |-- fake-caocao-server/
|   `-- fake-wechatpay-server/
|-- docs/
|-- tests/
`-- tasks/
```

Future shared packages are possible, but should not be created in the shell slice unless a real owner appears:

- `packages/api-contract`: API schema, generated clients, stable DTOs.
- `packages/product-core`: platform-agnostic product rules.
- `packages/design-tokens`: shared token source for Web, uni-app, and Flutter.

## Proposed Execution Slices

### Slice 1: Local Structural Rename

Intent: rename the existing Web app without changing behavior.

Candidate changes:

- Move `apps/frontend` to `apps/web`.
- Update nearest local `AGENTS.md` paths and references as needed.
- Rename package `@partner-up-dev/frontend` to `@partner-up-dev/web`.
- Update root scripts from `frontend` naming to `web` naming where the command semantics are Web-specific.
- Preserve `portless` service name `web-app` unless a concrete reason appears to change it.
- Update tests, Vitest config, TypeScript config, lint config, docs, and scripts that reference `apps/frontend` or `@partner-up-dev/frontend`.

### Slice 2: Reserved App Target Placeholders

Intent: reserve the future app boundaries without creating unfinished projects.

Candidate changes:

- Add `apps/uniapp/AGENTS.md`.
- Add `apps/flutter/AGENTS.md`.
- State that runtime code must not be added until product responsibility, target platform, API boundary, and validation path are explicit.
- State that Web implementation should not be copied into either subtree as a migration shortcut.

### Slice 3: GitHub Repository Rename

Intent: align remote repository identity after the local structure is stable.

Candidate operations:

- Rename GitHub repository from `partner-up-dev/mvp-HA` to `partner-up-dev/app`.
- Update local remote:

```bash
git remote set-url origin git@github.com:partner-up-dev/app.git
```

Post-rename checks:

- `.github/workflows` references.
- README and durable docs references to the old repository name.
- Deployment automation references.
- Webhook, callback, or external service references that embed the old repository slug.
- Any GitHub Actions usage that depends on the old `owner/repo` path, because repository redirects are not a substitute for explicit configuration ownership.

## Open Questions

- Should the root package name remain `partner-up-dev` for minimal churn, or become `@partner-up-dev/app` while staying private?
- Should script aliases preserve old names temporarily, for example `dev:frontend` forwarding to `dev:web`, or should the repo take the breaking cleanup immediately?
- Which durable docs should mention the app-target placeholders after execution: `docs/20-product-tdd/`, root `AGENTS.md`, or only local `AGENTS.md` until the targets gain real responsibility?
- Who owns the eventual API contract generation for Flutter: backend build, a future `packages/api-contract`, or a separate client generation pipeline?

## Verification Plan

For Slice 1:

- `pnpm check:format`
- `pnpm check:lint`
- `pnpm check:type`
- `pnpm check:build`
- Focused scenario tests only if route paths, app boot, or frontend test ownership changes in a way that static gates cannot cover.

For Slice 2:

- Confirm placeholder directories are not picked up as runnable packages by `pnpm`.
- Confirm local `AGENTS.md` files prevent premature runtime scaffolding.

For Slice 3:

- `git remote -v` shows `git@github.com:partner-up-dev/app.git`.
- GitHub repository page resolves at the new slug.
- CI workflow discovery still works on the default development branch.

## Current Status

- Slice 1 executed locally:
  - moved `apps/frontend` to `apps/web`
  - renamed the Web package to `@partner-up-dev/web`
  - renamed the private root package to `@partner-up-dev/app`
  - added `web` root script aliases as the canonical path while keeping `frontend` aliases for compatibility
  - updated workspace, release, CI, dev-server, test, deployment, and local editor references from `apps/frontend` to `apps/web`
- Slice 2 executed locally:
  - added `apps/uniapp/AGENTS.md`
  - added `apps/flutter/AGENTS.md`
  - kept both app targets as placeholders only, with no runtime scaffold or workspace package files
- Slice 3 executed:
  - renamed GitHub repository from `partner-up-dev/mvp-HA` to `partner-up-dev/app`
  - verified `https://github.com/partner-up-dev/app` resolves with ADMIN permission
  - updated local `origin` to `git@github.com:partner-up-dev/app.git`
  - updated runtime build metadata repository URLs to `https://github.com/partner-up-dev/app`

Executed verification:

- `pnpm install --lockfile-only`
- `pnpm check:format`
- `pnpm check:lint`
- `pnpm check:type`
- `pnpm check:build`
- `pnpm test:unit:web`
- `pnpm check:config`
- `pnpm check:type:backend && pnpm check:type:web`

Notes:

- `pnpm list --depth -1 --recursive` reports 5 workspace projects: private root, backend, web, fake CaoCao server, and fake WeChat Pay server.
- `apps/uniapp` and `apps/flutter` are not workspace packages yet.
- `check:format` and the Biome portion of `check:lint` reported zero changed files through Biome's changed-file detection; typecheck, build, policy lint, Web unit tests, and config checks provided the effective structural verification.
