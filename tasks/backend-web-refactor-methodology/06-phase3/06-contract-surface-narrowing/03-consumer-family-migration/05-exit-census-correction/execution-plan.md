# 06C exit-census correction — execution plan

## Lowest-cost sequence

1. Confirm `PartnerRequestFields` is type-only in `DateTimeRangePicker.vue` and present in `contracts.ts`.
2. Switch its specifier only; do not alter `TimeWindow`, props, template, date conversion, or component behavior.
3. Search every source/test/script import of the Backend root and classify the output. The only permitted final root
   symbols are `AppType`, `PRId`, and `OrderingOfferDetail`.
4. Run `apps/web/src/domains/pr/model/authoring.test.ts`, `pnpm check:type:web`, `pnpm check:build:web`, and
   `git diff --check`.

## Expected terminal import census

| Root symbol | Final disposition |
| --- | --- |
| `AppType` | transport-only `lib/rpc.ts` and `lib/admin-rpc.ts` |
| `PRId` | explicit persistence-derived compatibility imports |
| `OrderingOfferDetail` | explicit Commerce projection compatibility import |
| Any type exported by `/contracts` | zero root imports |

If this table does not hold, do not start 06D.
