# `8-0` Reproducible Commands

Run from the repository root at `cf6cd736`.

## Git And Fitness

```bash
git rev-parse HEAD
git status --short

node tools/architecture-fitness/cli.mjs \
  --format text \
  --baseline tasks/backend-web-refactor-methodology/06-phase3/01-baseline-and-fitness/architecture-fitness-baseline.json

node --test tools/architecture-fitness/architecture-fitness.test.mjs
```

For determinism, pipe two unchanged reporter runs to `sha256sum`; both `8-0`
runs produced
`12f2535db39d6feac2a2fa1280de1f5e1b4ce0593f646796db839e109e9c4ac2`.

## Current Production Inventory

```bash
backend_files=$(find apps/backend/src -type f -name '*.ts' \
  ! -name '*.test.ts' ! -name '*.spec.ts' | sort)
printf '%s\n' "$backend_files" | sed '/^$/d' | wc -l
printf '%s\n' "$backend_files" | xargs wc -l | tail -1

web_files=$(find apps/web/src -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.vue' \) \
  ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.test.vue' \
  ! -name '*.spec.ts' ! -name '*.spec.tsx' ! -name '*.spec.vue' | sort)
printf '%s\n' "$web_files" | sed '/^$/d' | wc -l
printf '%s\n' "$web_files" | xargs wc -l | tail -1

find apps/backend/src -type f -name '*.test.ts' | wc -l
find apps/backend/src -type f -name '*.test.ts' -print0 |
  xargs -0 wc -l | tail -1
```

Results: Backend `512 / 54,780`, Web `432 / 73,998`, and Backend source tests
`111 / 14,796`.

The Phase 3 planning numbers are preserved in
`06-phase3/entry-baseline.md`. Comparable committed counts use
`git ls-tree -r --name-only c634d9b6 <source-root>` and line sums from
`git show c634d9b6:<path>` with the same test/spec exclusions.

## Dependency SCCs

The task-local AST helper parses static import/export and dynamic `import()`
separately:

```bash
node tasks/backend-web-refactor-methodology/11-phase8-global-review-cleanup/01-global-rebase-and-baseline/dependency-scc.mjs \
  apps/backend/src

node tasks/backend-web-refactor-methodology/11-phase8-global-review-cleanup/01-global-rebase-and-baseline/dependency-scc.mjs \
  apps/web/src
```

It reports Backend one static four-node SCC and one dynamic-inclusive
nine-node SCC, and Web one two-node SCC in both views. It resolves relative
imports and Web `@/` aliases; it does not resolve package imports or Vue
template semantics.

## Contract And Focused Reference Checks

```bash
rg -n 'from "\./(entities|infra)/' apps/backend/src/contracts.ts
rg -l 'from "@partner-up-dev/backend/contracts"' apps/web/src tests | wc -l

rg -n 'meeting-point-change-notifier|reconciliation-transaction|services/projection' \
  apps/backend/src/domains

rg -n 'from "@/domains/.*/queries/' apps/web/src/domains \
  --glob '**/model/**/*.ts' --glob '**/model/*.ts'

rg -n '\b(client|adminClient)\.api' apps/web/src
rg -n 'canonical\.controller|YourService' apps/backend docs tests tools
```

## Report-first And Control-plane Checks

```bash
pnpm check:dead-code
pnpm check:security

rg -n 'db:generate|git diff --exit-code -- apps/backend/drizzle' \
  .github/workflows/backend-db-validate.yml
sed -n '1,80p' apps/backend/drizzle/meta/_journal.json
```

The migration generator itself was not run because it is a write operation.

## Packet Integrity

The root validation checked all Markdown files under the Phase 8 packet plus
the four modified program-control Markdown files, resolved each non-URL inline
link relative to its owner, then ran:

```bash
git diff --check -- tasks/backend-web-refactor-methodology
git status --short
```
