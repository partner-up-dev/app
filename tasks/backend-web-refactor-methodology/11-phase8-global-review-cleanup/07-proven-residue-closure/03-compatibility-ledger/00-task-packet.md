# `8-6.3` — Exact Compatibility Ledger

## Status

**Complete on 2026-07-24.** Exact source/schema compatibility retirement and
focused proof are closed; root integration owns full Backend/Web/scenario
gates.

## Objective & Hypothesis

Remove only compatibility with zero current obligation, and record explicit
retention/external exits for the rest.

## Guardrails Touched

- Web re-export roots require zero source/doc/config/dynamic consumers.
- Official-account follow sync must use a typed Job definition before the
  legacy handler adapter/API is removed.
- Only `early_tolerance_ms` and `late_tolerance_ms` are retired; active
  resolution/unit scheduling columns remain.
- Schema change is a new universal forward migration with the next global
  prefix.
- The mounted/deployment-referenced CaoCao callback route remains until
  provider/edge migration evidence exists.

## Verification

- exact reference ledger before and after edits;
- Job unit/type proof and full Backend unit at integration;
- `pnpm db:next-migration drizzle`, `pnpm db:lint`, `pnpm db:check`;
- deployment/config search for environment and CaoCao dispositions.

See [`compatibility-ledger.md`](./compatibility-ledger.md) and
[`verification-log.md`](./verification-log.md).
