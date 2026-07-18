# 4-1A Verification Strategy

## Pre-Change Characterization

- Backend CORS responses: paired origin, arbitrary origin, other-environment origin and no Origin.
- OAuth login/bind `returnTo`: paired origin, arbitrary origin, request header disagreement, relative URL and absent
  value.

## Exit Gates

| Gate | Result | Evidence boundary |
| --- | --- | --- |
| Focused Backend unit/controller tests for CORS and return-target behavior | Met | Paired, arbitrary, cross-environment and absent CORS origins; login and bind hostile `returnTo`; relative and absent values. |
| Focused Web OAuth/RPC units preserve callback/handoff caller behavior | Met | Four frozen-boundary Web unit files passed; no Web source changed. |
| Backend type/build, changed-file format and lint gates | Met | Backend type, lint and build gates passed; six changed Backend files pass Oxfmt. |
| Provider-free System checks for normal login entry and PR auth escalation | Met | Selected PR create and join-pending-replay scenarios passed. |
| State-free public preflights after rollout | Pending normal deployment | Probe each configured API with its paired Web `Origin` and an arbitrary `Origin`; no cookie or OAuth exchange is needed. |
