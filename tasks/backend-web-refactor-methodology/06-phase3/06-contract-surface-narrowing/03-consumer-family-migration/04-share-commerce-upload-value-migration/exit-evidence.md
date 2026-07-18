# 06C.4 exit evidence — Share/Commerce/Upload value migration

## Consumer result

- Entry probe: nine frozen declarations — two root `ImageUploadPurpose` imports in shared upload, six root Share
  `PRId` compatibility imports, and one root Commerce `OrderingOfferDetail` compatibility import.
- Exit probe: both upload `ImageUploadPurpose` imports resolve through `@partner-up-dev/backend/contracts`; no root
  `ImageUploadPurpose` import remains in `apps/web/src/shared/upload`.
- Compatibility exceptions are unchanged: six Share `PRId` root imports and one Commerce `OrderingOfferDetail` root
  import remain exactly as inventoried. No Share alias, Commerce response shape, offer model, or shared API wrapper
  was introduced.
- The imports are type-only; upload transport, design-web upload adapters, request payloads, and runtime dependency
  edges are unchanged.

## Verification

| Check | Result |
| --- | --- |
| Focused safe/exception `rg` counts | PASS — safe root `ImageUploadPurpose`: 0 (contracts: 2); Share `PRId`: 6; Commerce `OrderingOfferDetail`: 1 |
| Focused Commerce/Web unit tests | PASS — 3 files / 8 tests (`ordering-entry-storage`, `useCommerce`, `ride-hailing-listing-state`) |
| `pnpm check:type:web` | PASS |
| `pnpm check:build:web` | PASS |
| `git diff --check` | PASS |

No dedicated upload or Share unit test files exist in the frozen inventory; the nearest Commerce tests were run as the
focused family coverage. No System scenario was run because this batch changes only type-only import specifiers.
