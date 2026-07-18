# 4-0 Entry Baseline

## Freeze

- Entry HEAD: `6d256b0f21a8ba0f25fc898696420175d047813d` (`ref(phase3): complete PR owner convergence`).
- Authorized scope: read-only characterization and task-local evidence only.
- Protected unrelated state: root package-manager files and the three unrelated task workspaces recorded in
  [`../scope-audit.md`](../scope-audit.md).

## Inputs Compared

The inventory compared source and focused tests against these existing owners:

- Product identity progression: `docs/10-prd/behavior/rules-and-invariants.md`.
- Cross-unit session/error transport: `docs/20-product-tdd/cross-unit-contracts.md`.
- OAuth nonce/cookie handoff: `docs/30-unit-tdd/wechat-oauth-handoff.md`.
- Generative ownership rules: `docs/20-product-tdd/architecture-objectives-and-decision-rules.md`.

## Current Static Signal

A production Web import scan found 409 files, 610 cross-owner edges across 86 owner pairs, and two non-trivial file
SCCs. The Auth SCC is a five-file runtime-value loop:

```text
lib/rpc
  -> shared/api/auth-required-policy
  -> processes/wechat/oauth-login
  -> processes/wechat/oauth-trace
  -> shared/telemetry/track
  -> lib/rpc
```

The other two-file SCC is confined to PR Discovery model files and is outside the Phase 4 change boundary. An SCC is
a diagnostic, not a movement instruction: the Auth loop is carried into the next-slice design as an owner/sequence
problem, not a mandate for a generic auth module.

Command details and the focused executable baseline are indexed in
[`evidence-index.md`](./evidence-index.md) and [`verification-log.md`](./verification-log.md).
