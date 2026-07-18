# 06C.1 exit evidence — PR Discovery value migration

## Consumer result

- Entry probe: 22 root type-import declarations, five inline `import()` type edges, and one System-scenario type
  edge across the frozen inventory.
- Exit probe: every owned stable value type (`PartnerRequestFields`, `PRAllowEditAfterReady`, `PRRoute`,
  `PRRoutePoint`, `PRStatus`, `WeekdayLabel`) resolves through
  `@partner-up-dev/backend/contracts`.
- Intentional residual: `apps/web/src/domains/pr/queries/usePRCreate.ts` retains its sole root `PRId` import.
  `PRId` remains a documented persistence-derived compatibility exception; it was neither widened nor recast.
- No model, UI, or process gained a raw Hono client or `Infer*` edge. The 06B inferred contract/facade boundary is
  unchanged.

## Verification

| Check | Result |
| --- | --- |
| Focused Web PR test run | PASS — 47 files / 152 tests |
| `pnpm check:type:web` | PASS |
| `pnpm check:build:web` | PASS |
| `pnpm exec vitest run tests/scenario/pr/pr-detail-edit.scenario.test.ts --project system-scenario --silent=passed-only` | PASS — 1 file / 1 test |
| `git diff --check` | PASS |

The System scenario import itself changed only from the root type entry to the types-only subpath. Its focused
browser-to-HTTP journey passed; no runtime source, route payload, OAuth replay storage, or route-application
behavior changed. Full System remains reserved for 06D cross-unit exit.
