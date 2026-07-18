# 4-2 — Session And Identity Authority

## Authorization And Objective

Sir authorized execution on 2026-07-18. This Constraint-route slice converges public-user session authority while
preserving the anonymous-first product flow and the established OAuth callback/handoff shape.

## Completion Status

Implementation and the declared focused/cross-unit proof completed on 2026-07-18. No commit is implied by this
status. `4-2.1`, `4-2.2`, and `4-2.3` are complete; their actual commands and evidence are recorded in
[`verification-log.md`](./verification-log.md), [`evidence-index.md`](./evidence-index.md), and
[`exit-evidence.md`](./exit-evidence.md). `4-3` remains a proposal and receives only the recorded observation in
[`out-of-scope-observations.md`](./out-of-scope-observations.md).

The target is deliberately narrow:

1. the User domain owns the current active public identity projection;
2. auth transport owns public JWT issue, renewal and response header emission;
3. public controllers consume already-resolved request identity and do not re-decide current user state;
4. the Web auth process owns browser restoration and the sole role/user projection;
5. operator sessions remain a separate admin client/middleware context.

## Protected Invariants

- Public identity is exactly `anonymous | authenticated`; `service` and `analytics` are not public-user identities.
- A signed bearer is necessary but not sufficient for a subject-bound public identity: the current user must exist,
  be `ACTIVE`, and retain a public role.
- Anonymous UUID recovery may restore only an active anonymous user; it cannot mint an authenticated session.
- OAuth callback navigation, handoff nonce/cookie format, provider configuration, pending-command replay and the
  telemetry anonymous ID are outside this slice.
- `x-access-token` remains the transport rotation channel. Domain command bodies do not become session-sync
  payloads.

## Owned Work

| Subtask | Owned responsibility | First low-cost proof | Status |
| --- | --- | --- | --- |
| `01-backend-public-session-validation` | canonical current public identity query, public bearer resolution, issuance and `/auth/session` recovery | query unit + focused HTTP scenario | Complete |
| `02-web-session-projection` | public storage/projection boundary and deterministic bootstrap recovery | process unit with injected boundary | Complete |
| `03-cross-unit-continuity-proof` | real browser-to-Backend anonymous recovery/failure proof | one focused System scenario | Complete |

## Explicit Deferrals

- `4-3`: OAuth callback/handoff topology and legacy direct callback compatibility.
- `4-4`: protected-command escalation and pending-command replay.
- `4-5`: dormant route auto-login and legacy facade retirement.
- Operator bearer revalidation is not silently folded into the public-session change; admin context remains its own
  compatibility boundary.

## Protected Independent State

Do not edit, stage, or treat as 4-2 output: root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and
`tasks/quality-gate-orchestration/`.

The entry evidence, decision record, execution rehearsal, verification and promotion plan are sibling files in
this packet. Every subtask has a corresponding packet directory before source mutation.
