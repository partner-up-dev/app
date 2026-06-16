# Knip Triage

## Current Counts

Source: `pnpm exec knip --no-exit-code --reporter json`.

| Issue type | Count |
| --- | ---: |
| unused files | 30 |
| unused dependencies | 1 |
| unused devDependencies | 7 |
| unlisted dependencies | 2 |
| unlisted binaries | 2 |
| unused exports | 233 |
| unused exported types | 209 |
| duplicate exports | 3 |

Useful Knip selectors for follow-up: `--dependencies`, `--files`, `--exports`, `--include`, `--exclude`, `--workspace`, `--production`, `--strict`, `--fix-type`, `--max-show-issues`, `--no-exit-code`.

## Cleanup Queue

### 1. Dependency Drift

- `apps/backend/package.json`: `axios`, `ts-node`
- root `package.json`: `@vitejs/plugin-vue`, `vue`, external `powershell` binary usage
- `apps/frontend/package.json`: `@iconify-json/mdi`, `@types/html2canvas`, `@unocss/preset-icons`, `@unocss/vite`
- `apps/frontend/src/main.ts`: `uno.css` unlisted
- `tests/scenario/pr-core/pr-detail-edit.scenario.test.ts`: `@partner-up-dev/backend` unlisted
- `scripts/run-semgrep.mjs`: external `semgrep` binary usage

### 2. Duplicate Exports

- `apps/backend/src/domains/pr-core/services/anchor-participation-policy.service.ts`: `DEFAULT_CONFIRMATION_END_OFFSET_MINUTES`, `DEFAULT_JOIN_LOCK_OFFSET_MINUTES`
- `apps/backend/src/entities/partner-request.ts`: `partnerRequestFieldsSchema`, `createStructuredPRSchema`
- `apps/frontend/src/shared/poi/queries/usePoisByIds.ts`: `usePoisByNames`, `usePoisByIds`

### 3. Larger Baselines

- Unused files: split by backend/frontend owner before deletion.
- Unused exports/types: treat last; likely includes public-barrel and type-surface false positives.
