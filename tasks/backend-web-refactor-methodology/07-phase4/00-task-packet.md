# Phase 4 — User/Auth

## Current Mode And Authorization

- Current mode: 4-2 and the local semantic portion of 4-3 are complete with durable promotion. 4-3 is owned by
  [04-oauth-handoff-callback-compatibility](./04-oauth-handoff-callback-compatibility/). 4-4 is locally complete
  under [05-authenticated-escalation-pending-commands](./05-authenticated-escalation-pending-commands/), with its
  System-harness canonical-host limitation explicitly recorded. 4-5's first implementation is under
  [06-route-entry-auth-and-facade-closure](./06-route-entry-auth-and-facade-closure/); its Phase-completion review
  repaired and verified one P1 route-guard cancellation defect and one P2 OAuth `openid` boundary defect. Their
  evidence and repair packets are under [07-completion-review](./07-completion-review/).
- Callback authority, provider-console evidence, and production-topology observation remain a distinct 4-3.4
  external-evidence subtask. It is not silently treated as settled implementation fact and blocks only topology
  change, real cross-origin proof claims, and legacy-path retirement.
- Sir explicitly authorized 4-0 entry characterization, 4-1 runtime execution, and 4-2 execution on
  2026-07-18.
- `4-1` is locally complete with a post-rollout public-header observation pending. That observation is external to
  `4-2` and does not block its local session-authority work.

## Objective

Converge public-user session authority without changing the product's anonymous-first progression or the OAuth
callback/handoff topology. `4-2` ends with one persisted-user validation boundary, one public-session issuance
boundary, one browser projection rule, and executable Browser-to-Backend continuity proof.

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
| `4-2` · session and identity authority | Converge public-user session issuance, validation, restoration and browser projection | Complete locally; durable session rule promoted; owned by `03-session-identity-authority/` |
| 4-3 · OAuth handoff and callback compatibility | Converge callback, nonce handoff and legacy callback behavior after the security/session boundaries are stable | Local 4-3.1–4-3.3 complete; callback authority/rollout remains evidence-gated |
| `4-4` · authenticated escalation and pending commands | Make protected-command escalation and command-owned replay deterministic | Locally complete; focused proof and durable promotion complete, browser host limitation recorded |
| `4-5` · conditional compatibility closure | Resolve route auto-login, URL propagation and legacy facade decisions without manufacturing a new shared owner | Complete locally after completion-review repair; `/bills` promise and private facade closure verified |

`4-0` evidence, its revised order and the explicit stop branches are owned by
[`01-auth-transport-inventory/exit-evidence.md`](./01-auth-transport-inventory/exit-evidence.md) and
[`slice-map.md`](./slice-map.md). “Complete” means the entry characterization is complete; it does not mean that
Phase 4 runtime work is authorized.

The `4-1` implementation and evidence are owned by
[`02-oauth-security-containment/`](./02-oauth-security-containment/). It contains the live credentialed-CORS
reflection without changing callback/handoff topology; the normal deployment still needs a state-free public header
recheck.

`4-2` owns only the public-user boundary. It does not change OAuth callback navigation, handoff-cookie semantics,
provider-console configuration, pending-command replay, telemetry anonymous IDs, or operator-token validation.
Its implementation, rehearsal, proof, promotion and 4-3 inputs are owned by
[`03-session-identity-authority/`](./03-session-identity-authority/); its local exit is complete and does not
authorize the later slices.

4-3 is deliberately decomposed instead of treating callback compatibility as one opaque change:

1. Backend terminal handoff semantics establishes a no-token, stable result for expected public-identity rejection.
2. Web terminal recovery and legacy callback hygiene makes a consumed nonce non-retryable while preserving retry
   only for transport uncertainty and retaining the direct-callback compatibility consumer.
3. Honest journey proof verifies the local contract without claiming that the proxy-backed System harness proves
   production cross-origin cookies.
4. Callback authority and rollout records the provider/edge facts that are required before any topology or
   compatibility-retirement decision.

The local 4-3.1–4-3.3 contract repair is complete: expected handoff/callback failures are token-free, the Web
distinguishes terminal consumption from transport uncertainty, direct JSON compatibility is characterized, and the
verified rule is promoted to the OAuth Unit TDD. 4-3.4 remains externally open and does not authorize topology
mutation or legacy retirement.

`4-4` completed after that local handoff contract: it owns the Web-only boundary between transport observation,
OAuth escalation, and PR-owned continuation intent. It preserves the current anonymous-first product behavior and
does not reinterpret 4-3.4's external topology gap as a reason to alter OAuth URLs, cookies, provider settings, or
legacy callback retirement. Its packet records at-most-once continuation semantics, all non-replay commands, focused
proof, durable promotion, and the failed faithful browser proof's canonical-host re-entry condition.

`4-5` closes the declared local compatibility work without expanding product login globally. It restores only the
explicit `/bills` WeChat route-entry promise through a reusable router guard, records other Commerce routes as
undeclared, and deletes two local-private WeChat facades after source, entrypoint, export, bundle, test, and dead-code
evidence agree. The completion review repaired the obsolete async-guard side effect by revalidating navigation epoch
after bootstrap, and repaired whitespace-only upstream `openid` acceptance at the active provider boundary. Neither
repair resolves 4-1 rollout observation, 4-3.4 provider/topology evidence, or unobservable external old-artifact use.

## Protected Shared State

At entry, the following user-owned or independent work remains outside Phase 4:

- modified root `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`;
- untracked `tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and
  `tasks/quality-gate-orchestration/`.

No Phase 4 action may stage, edit, validate as owned output, or absorb those paths.
