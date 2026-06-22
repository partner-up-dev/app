# PR Time Window Serialization Diagnosis

## Objective & Hypothesis

- Objective: verify whether `/pr/42` displays different time-window values between PR Facts and PREditor, then identify the most likely serialization/deserialization boundary.
- Initial symptom: PR Facts shows `2026-06-27 00:00`, while PR Editor shows `2026-06-26 16:00`.
- Working hypothesis: one surface treats a timestamp as product-local calendar time while another surface treats it as UTC/local browser time, creating an 8-hour Asia/Shanghai offset.

## Guardrails Touched

- Input route: Reality.
- Active mode: Diagnose.
- Durable owner under investigation: frontend PR UI time-window presentation/editing, with possible backend PR API contract involvement.
- Code mutation status: not started. Code changes require explicit user confirmation.

## Verification

- Directly inspect `https://partner-up.local/pr/42`.
- Compare API payload for PR 42 with rendered PR Facts and PREditor values.
- Inspect frontend parse/format paths for `PRFactsCard`, `PREditor`, and `DateTimeRangePicker`.
- Implemented verification:
  - `pnpm lint:pr-time-contract`
  - backend focused unit tests for PR time schema, instant canonicalization, NL prompt, and Form Mode auto-create
  - frontend focused unit tests for local input adapter, friendly time-window labels, Form Mode all-day materialization, and fuzzy ready-edit policy
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-edit.scenario.test.ts`
  - targeted Biome lint for changed files
- Final implementation notes:
  - PR and Anchor Event/Form Mode PR-time-window inputs now allow offset datetime strings.
  - PR command boundaries canonicalize offset inputs to UTC ISO instants before persistence.
  - NL date-only parse output materializes into product-local all-day instant windows.
  - Form Mode all-day fuzzy windows now use `[T 00:00, T+1 00:00)`.
  - Date/time input editors round-trip through local Date conversion instead of string splitting.
  - `lint:pr-time-contract` is wired into `lint:policy`.

## Current Understanding

- `GET https://api.partner-up.local/api/pr/42` returns `core.time` as `["2026-06-26T16:00:00.000Z","2026-06-26T17:00:00.000Z"]`.
- Playwright verified `https://partner-up.local/pr/42` renders PR Facts time as `2026-06-27 00:00 - 01:00`.
- Anonymous PR 42 page does not expose the edit button; the user-visible editor symptom is still explained by the code path:
  - `PRFactsCard` formats `core.time` through `formatFriendlyTimeWindowLabel`, which parses the UTC timestamp and displays local wall time.
  - `PREditor` copies `detail.core.time` into form state unchanged.
  - `DateTimeRangePicker` deserializes by string-splitting at `T`, so `2026-06-26T16:00:00.000Z` becomes date `2026-06-26` and time `16:00`.
  - `DateTimeRangePicker` serializes edited datetime values as `YYYY-MM-DDTHH:mm`, which current frontend/backend zod `datetime()` schemas reject.
- Likely cause: frontend editor lacks a PR-time-window adapter that converts API instants to local date/time input values and converts edited local date/time values back to canonical ISO instants.
- Offset validation finding: current `z.string().datetime()` accepts `Z` but rejects `+08:00`; `z.string().datetime({ offset: true })` accepts both. PR time schemas currently use the non-offset form.
- Fuzzy/all-day finding: frontend Form Mode materializes product-local fuzzy/all-day windows into concrete ISO instants before submission. Canonical all-day should be represented as product-local `[T 00:00, T+1 00:00)`, e.g. `2026-06-02` becomes `2026-06-01T16:00:00.000Z` to `2026-06-02T16:00:00.000Z` after UTC canonicalization.
- Documentation mismatch: product docs say fuzzy time choices are not persisted as PR facts, but zero-candidate auto-create docs/tests show fuzzy activity windows can become the PR-owned resolved time window and `allowEditAfterReady.timeWindow`.
- Date-only finding: date-only is not only legacy/backfill. It is currently allowed by frontend validation, backend PR entity schema, `allowEditAfterReady`, and the natural-language PR parse prompt/schema. The prompt explicitly asks the model to output `YYYY-MM-DD` when the user only gives a date.
- Clarified target: `PR.time_window` / API `core.time` should persist concrete instant datetimes only. Input may accept offset datetimes, but command boundaries should canonicalize them. NL date-only input should be transformed into a product-local all-day instant window rather than persisted as `YYYY-MM-DD`.
- Display target: PR date/time display surfaces should recognize product-local all-day instant windows and display date-range semantics instead of raw endpoint clock times. Single-day all-day should render as date-level text; multi-day all-day should render as a date range.

## Confirmed Constraints

- Do not modify code before explicit user start.
- Avoid unrelated dirty worktree changes.

## Next Step

- Review the implemented fix and decide whether a data migration/backfill is needed for any existing persisted date-only PR rows.
