# `8-6.3` Verification Log

Date: 2026-07-24

## Source And Behavior Proof

- Official Account follow sync now registers a typed Job definition at
  version `1` and schedules `jobVersion: 1`.
- Focused JobRunner/marketing proof: `2 files / 14 tests`, passed.
- Exact source searches contain no `JobHandler`, legacy adapter/registration
  API, deletion alias, retired millisecond field or `OPENAI_API_KEY` residue.
- `LLM_API_KEY` remains consumed by application source, `.env.example`, FC
  workflow/template and deployment validation.
- Both deleted Web compatibility roots have no consumer.

## Migration Proof

- `pnpm db:next-migration drizzle` allocated `0097`.
- `0097_drop_job_legacy_tolerance_ms.sql` drops only
  `early_tolerance_ms` and `late_tolerance_ms`.
- Active `resolution_ms`, `early_tolerance_units` and
  `late_tolerance_units` entity/source readers and writers remain.
- `pnpm db:lint` and `pnpm db:check` passed.

Focused Oxfmt and `git diff --check` passed. The `8-6` integrated
type/lint/fitness and Job scenario proof subsequently passed; see
[`../verification-log.md`](../verification-log.md).
