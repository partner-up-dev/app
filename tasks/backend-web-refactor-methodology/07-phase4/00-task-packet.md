# Phase 4 — User/Auth

## Current Mode And Authorization

- Current mode: `Execute` for the narrow `4-1A` origin/return-target containment slice.
- Sir explicitly authorized `4-0` entry characterization and later explicitly authorized `4-1A` runtime execution
  on 2026-07-18.
- `4-1A` is locally complete with a post-rollout public-header observation pending. It does not authorize a session
  authority, schema, provider choreography, callback/handoff, or later-slice mutation.

## Objective

Establish an evidence-backed Phase 4 entry model for public-user session continuity, OAuth handoff, auth transport,
pending actions, and user ownership. The exit is a revised executable slice map, not an implementation.

## Program Boundary

`07-phase4/` is a historical workspace ordinal, not a Program Phase number. Program Phase numbering and status are
owned by `../program-roadmap.md`.

## Guardrails Touched

- `docs/20-product-tdd/cross-unit-contracts.md` owns the shared session/error transport contract.
- `docs/30-unit-tdd/wechat-oauth-handoff.md` owns handoff invariants.
- `docs/10-prd/behavior/rules-and-invariants.md` owns public-user identity progression and `/me` behavior.
- `apps/backend/src/auth`, `apps/backend/src/controllers/auth.controller.ts`, `apps/backend/src/controllers/wechat.controller.ts`,
  `apps/backend/src/domains/user`, `apps/web/src/lib/rpc.ts`, `apps/web/src/shared/auth`, and
  `apps/web/src/processes/{auth,wechat}` are evidence targets, not mutation targets in `4-0`.

## Ordered Slices

| Slice | Purpose | Status |
| --- | --- | --- |
| `4-0` · `01-auth-transport-inventory/` | Read-only authority, SCC, continuity, contract and test-seam characterization | Complete |
| `4-1` · origin/return-target containment | Make credentialed CORS and OAuth `returnTo` use an explicit environment-owned Web origin | Locally complete; normal rollout header observation pending |
| `4-2` · session and identity authority | Converge public-user session issuance, validation, restoration and browser projection | Proposal; no implementation authorization |
| `4-3` · OAuth handoff and callback compatibility | Converge callback, nonce handoff and legacy callback behavior after the security/session boundaries are stable | Proposal; no implementation authorization |
| `4-4` · authenticated escalation and pending commands | Make protected-command escalation and command-owned replay deterministic | Proposal; no implementation authorization |
| `4-5` · conditional compatibility closure | Resolve route auto-login, URL propagation and legacy facade decisions without manufacturing a new shared owner | Proposal; waits for named decisions |

`4-0` evidence, its revised order and the explicit stop branches are owned by
[`01-auth-transport-inventory/exit-evidence.md`](./01-auth-transport-inventory/exit-evidence.md) and
[`slice-map.md`](./slice-map.md). “Complete” means the entry characterization is complete; it does not mean that
Phase 4 runtime work is authorized.

The `4-1A` implementation and evidence are owned by
[`02-oauth-security-containment/`](./02-oauth-security-containment/). It contains the live credentialed-CORS
reflection without changing callback/handoff topology; the normal deployment still needs a state-free public header
recheck.

## Protected Shared State

At entry, the following user-owned or independent work remains outside Phase 4:

- modified root `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`;
- untracked `tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and
  `tasks/quality-gate-orchestration/`.

No `4-0` action may stage, edit, validate as owned output, or absorb those paths.
