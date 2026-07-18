# 4-1 — Credentialed CORS And Return-Target Containment

## Status And Authorization

- Current mode: `Execute` for completed local/staging-deployed `4-1`; public header observation is blocked from
  this agent environment rather than pending CD.
- Read-only topology evidence was authorized by Sir on 2026-07-18.
- Sir explicitly authorized the narrow `4-1` runtime implementation on 2026-07-18. That authority covered the
  named Backend source/tests and the resulting durable-doc promotion, not deployment-setting, provider-setting or
  production OAuth changes.

## Objective

Contain the confirmed credentialed-CORS reflection and request-derived OAuth `returnTo` authority without changing
the selected callback URL, handoff cookie, handoff body, frontend callback compatibility route, or provider
registration. The future callback/handoff topology work belongs to `4-3`.

## Owned Paths

`4-1` owns the named Backend origin/return-target source and tests, its task-local evidence, and the precise
durable contract promotion. Callback, cookie, handoff, provider and frontend compatibility paths remain protected.

## Deliverables

| File | Purpose |
| --- | --- |
| `01-topology-and-live-evidence.md` | Current environment pairing, public read-only probes and confidence boundaries. |
| `02-impact-handshake-draft.md` | Address, state diff, blast radius, invariants and verification for a future mutation. |
| `03-remaining-information.md` | What cannot be inferred and the minimum safe support/access needed. |
| `01-origin-return-to-containment/` | The completed local implementation packet, evidence, verification log and rollout observation procedure. |
| `execution-plan.md` / `rehearsal.md` | Executed mutation sequence and retained branch boundaries. |
| `verification-strategy.md` | Reconciled local proof and pending post-rollout header observation. |
| `durable-docs-plan.md` | Promoted source-level authority rules and retained topology deferral. |

## Guardrails

- Do not use a real OAuth code, user cookie, handoff nonce, or authenticated request while characterizing topology.
- Sir has confirmed FC has no non-CI variable override; preserve the default API callback selection as an invariant in
  this slice.
- Do not remove the frontend callback route from static-search evidence; it is a named compatibility window.
- Do not frame a public CORS reflection observation as proof of token exfiltration without proving the remaining
  callback/cookie/browser conditions.
