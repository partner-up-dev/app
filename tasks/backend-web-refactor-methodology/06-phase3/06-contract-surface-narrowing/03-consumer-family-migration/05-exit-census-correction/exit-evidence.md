# 06C exit-census correction — exit evidence

- `apps/web/src/domains/pr/ui/forms/DateTimeRangePicker.vue` now imports the type-only `PartnerRequestFields` from
  `@partner-up-dev/backend/contracts`.
- Full root-import census across `apps/`, `tests/`, and `scripts/` (excluding `tasks/`, dependencies, generated output,
  and caches) leaves only the documented root symbols `AppType`, `PRId`, and `OrderingOfferDetail`; no additional safe
  contract type remains at the package root.
- `pnpm test:unit:web -- apps/web/src/domains/pr/model/authoring.test.ts` — passed (47 files, 152 tests).
- `pnpm check:type:web` — passed (exit 0).
- `pnpm check:build:web` — passed.
- `git diff --check` — passed.
