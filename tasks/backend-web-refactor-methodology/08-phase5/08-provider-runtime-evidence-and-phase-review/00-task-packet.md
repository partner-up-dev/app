# 5-7 Provider Runtime Evidence And Phase Review

## Status

**Local Phase review and its approved narrow follow-up are complete; the external-evidence branch remains
separate.** The final commit review found two known behavior divergences that Sir has deferred to future work
(Rental scope/risk and job-runner/outbox), plus one completed Placement-feedback repair. Their evidence and current dispositions are
recorded in [`03-final-commit-review/`](./03-final-commit-review/). The safe public-readonly branch has been
executed and recorded in
[`02-external-runtime-evidence/`](./02-external-runtime-evidence/), but this executor's general public-HTTPS
connection path timed out before it could observe any remote response. This is not a deployment conclusion. The
slice still does not authorize source, provider-console, or deployment mutation by itself, and it cannot make a
deployed callback/notify claim without observed external evidence.

## Objective

Verify the deployed preconditions that local code cannot establish: payment notify base URL, CaoCao callback edge
routing/body preservation/header isolation, provider callback signatures, and an evidence-backed Phase 5 exit claim.

## Required Evidence

- named staging origin and provider instance;
- authorized signed callback or safe provider smoke mechanism;
- observed response/status plus target backend receipt;
- negative proof for invalid routing token/signature/header assumptions;
- explicit rollback/containment posture.

## Local Non-Claims

Fake provider/system-scenario success does not prove a public callback edge, control-plane configuration, or
provider-console setting. Keep these facts out of durable deployment docs until observed.

The completed local review and its exact verification record live in
[`01-local-phase-review/`](./01-local-phase-review/).
