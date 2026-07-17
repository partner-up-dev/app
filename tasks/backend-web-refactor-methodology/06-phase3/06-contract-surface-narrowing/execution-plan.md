# Slice 3-6 Execution Plan

## Required Information Before Editing

1. All Web imports from `@partner-up-dev/backend`, grouped by AppType, value/brand type, entity row, schema and DTO.
2. Current Backend package `exports`, typecheck/build reachability and Hono inference boundaries.
3. Handwritten Web request/response shapes that duplicate typed routes.
4. Type-only import edges and compiler performance before change.

## Subtasks

### 06A — Define The Small Types-only Surface

- Add one explicit Backend package subpath for stable cross-unit value/contracts only.
- Keep Drizzle row/repository/internal service types private.
- Keep root `AppType` compatibility until the Web transport cutover is complete.

### 06B — Consolidate Domain Contract Aliases

- Derive request/response aliases from the typed client in domain adapter/contract modules.
- Move Web model/UI imports away from query modules and `lib/rpc`.
- Use temporary type-only re-exports when necessary; never use `any` or copy response interfaces.

### 06C — Migrate In Batches

1. Feedback and PR Discovery aliases already exercised by pilots.
2. PR lifecycle stable value types.
3. Share/Commerce/Admin types with their own target tests.
4. Remove root-export compatibility only after consumer count and package build prove safe.

## Verification

- Backend/Web type and build, relevant unit tests, targeted/full System.
- Import graph distinguishes type-only from runtime edges.
- Web model has no query/RPC imports; raw AppType/client remains transport/adapters only.
- No duplicate DTO and no new runtime package dependency.
- Measure typecheck time before/after as information, not a pass threshold unless explicitly adopted.
