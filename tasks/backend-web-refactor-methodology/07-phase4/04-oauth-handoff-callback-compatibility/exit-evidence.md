# 4-3 Exit Evidence

## Current State

Local 4-3.1–4-3.3 is complete. The implementation remains intentionally bounded to callback/handoff semantics,
browser recovery, direct-callback compatibility, focused proof, and one durable rule promotion. 4-3.4 is still
open external evidence, not a local implementation failure.

## Local Exit Conditions

- Complete — Expected rejected handoff identity has a stable no-token terminal result and no generic 500.
- Complete — The Browser distinguishes a received terminal result from a transport exception without placing
  credentials in the route.
- Complete — Bind feedback cannot advertise success before its completion path is eligible.
- Complete — Direct callback compatibility still succeeds on its existing successful JSON branch and scrubs
  sensitive params after reading them.
- Complete — Focused tests and proportional static/build checks pass; protected paths are absent from the 4-3 diff.
- Complete — The exact verified rule is promoted to the OAuth handoff Unit TDD.

## External Closure Conditions

Provider/edge/origin evidence remains explicitly open. It is required only before topology change, real
cross-origin proof claims, or legacy compatibility retirement.
