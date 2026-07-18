# 06B.2 Exit Evidence — PR Discovery Adapter Contract

## Delivered

- Added `apps/web/src/domains/pr/contracts.ts` as the sole PR Hono inference owner for authoring options, PR detail,
  discovery responses and recommendation input.
- Removed raw `client`/`Infer*` use from the five owned PR model files and removed the model-to-query type import for
  `PRAuthoringOptions`.
- `usePRAuthoringOptions`, `usePRDetail` and `usePRDiscovery` retain runtime client mechanics and re-export their
  former type aliases as explicit compatibility facades for unchanged UI consumers.
- No route, request/response JSON, API client wrapper or handwritten response DTO changed.

## Verification

- Target model search: zero `Infer*`, `@/lib/rpc` and query type imports in the owned model files — PASS.
- Focused PR unit batch: 3 files / 12 tests — PASS.
- Broader PR Web unit batch: 47 files / 152 tests — PASS.
- `pnpm check:type:web`, `pnpm check:build:web`, target Oxlint and `git diff --check` — PASS.
