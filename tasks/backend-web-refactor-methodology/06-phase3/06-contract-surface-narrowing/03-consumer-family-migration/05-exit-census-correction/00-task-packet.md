# 06C exit-census correction — omitted PR authoring type edge

## Objective

Correct the single safe root type import discovered by the 06D entry census before root export retirement. This is a
reopened completion check for 06C.1's PR authoring value family, not a new consumer family or behavior slice.

## Exact ownership

- `apps/web/src/domains/pr/ui/forms/DateTimeRangePicker.vue`
- This task-local directory only.

The target is its type-only `PartnerRequestFields` import. `PRId`, `OrderingOfferDetail`, `AppType`, runtime schemas,
request behavior, UI logic, and any other root import are outside the correction.

## Entry evidence

The fresh repository root-import census found exactly one safe types-only residual outside the four original frozen
inventories:

```ts
import type { PartnerRequestFields } from "@partner-up-dev/backend";
```

at `apps/web/src/domains/pr/ui/forms/DateTimeRangePicker.vue:91`. `PartnerRequestFields` is explicitly exported by
`@partner-up-dev/backend/contracts` and is already a 06C.1 contract type. The same census otherwise shows only the
documented `AppType`, `PRId`, and `OrderingOfferDetail` root exceptions.

## Execution boundary

1. Change only that type specifier to `@partner-up-dev/backend/contracts`.
2. Re-run the full root-import census, not just the one-file probe. If another safe contract type remains at the root,
   stop root retirement and add an equally bounded correction packet; do not batch unrelated cleanup.
3. Run the nearest authoring test plus Web type/build and diff checks. This type-only correction does not require a
   System journey; 06D owns the full System exit.

## Stop conditions

- The import proves runtime-relevant, its type is absent from `contracts`, or a route/UI behavior changes.
- The census finds a new undeclared safe root consumer.
- The source has concurrent ownership collision.

## Status

Completed. The single 06C exit-census edge is narrowed to the contracts subpath; no component behavior changed.

## Exit evidence

See [exit-evidence.md](./exit-evidence.md).
