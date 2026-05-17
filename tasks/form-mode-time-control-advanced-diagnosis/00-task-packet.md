# Task Packet - Form Mode Time Control Advanced Diagnosis

## Objective & Hypothesis

- Diagnose whether Form Mode Time Control advanced mode needs an absolute time anchor to generate options for `/e/3`.
- Hypothesis: the empty advanced-mode wheel is caused by `earliestLeadMinutes: null`, because the frontend advanced generator uses that value as its finite horizon.

## Guardrails Touched

- `docs/10-prd/behavior/rules-and-invariants.md`
- `apps/frontend/src/domains/event/ui/AGENTS.md`
- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeTimeControl.vue`
- `apps/frontend/src/domains/event/model/form-mode.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-form-mode-data.ts`
- `apps/backend/src/domains/anchor-event/services/time-window-pool.ts`
- `apps/backend/src/domains/anchor-event/services/form-mode.ts`

## Verification

- `GET http://localhost:4001/api/events/3/form-mode` returns `event.earliestLeadMinutes: null`, one absolute `startOptions` entry, and a default selection at `2026-05-06T06:00:00Z`.
- Code inspection shows `buildAdvancedModeStartOptions(null)` returns an empty array.
- Code inspection shows `FormModeTimeControl` switches the wheel source to the advanced array when advanced mode is enabled, so the date/time wheels become empty when the advanced array is empty.

## 2026-05-17 Auto-Open Slice

- Objective & Hypothesis: update Form Mode Time Control so an event with no preset start options for the current place can still expose generated advanced start options when `earliestLeadMinutes` is configured. Hypothesis: auto-opening advanced mode at the control boundary preserves backend time-pool authority and unblocks the existing assisted create/recommendation path.
- Guardrails Touched: `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeTimeControl.vue`, `apps/frontend/src/domains/event/model/form-mode.ts`.
- Verification: added frontend unit coverage for the auto-open predicate. `pnpm test:unit:frontend` passes with 11 files and 36 tests.
