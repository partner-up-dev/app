# 4-1A Exit Evidence

## Outcome

The locally verified source state removes the confirmed arbitrary-origin credentialed-CORS reflection and removes
request-derived OAuth return-origin authority. It does so through one narrow `FRONTEND_URL`-derived helper, without
changing callback URL selection, cookies, handoff payloads, frontend callback compatibility, or user/session roles.

## Exit Conditions Reconciled

| Exit condition | Result | Evidence |
| --- | --- | --- |
| Paired credentialed browser origin is allowed and arbitrary/cross-environment/no-origin requests are not reflected | Met locally | App-level CORS test covers normal and preflight paths; paired responses retain credentials. |
| OAuth login and bind accept only configured-origin return targets | Met locally | Helper and route tests cover absolute, relative, absent, hostile and hostile-header cases. |
| Callback, cookie, handoff and Web compatibility boundaries remain unchanged | Met by source-diff audit | The target controller sections are untouched apart from the two entry-route calls; no Web source changed. |
| Static and selected cross-unit guards remain green | Met | Backend gates, Web frozen-boundary units and two provider-free System cases passed. |
| Public production/staging header behavior is observed after rollout | Blocked externally | Staging CD completed, but this agent environment cannot establish TCP to either the FC API addresses or the paired ESA Web origin; use the state-free procedure from a China-reachable runner. Production remains unobserved. |

## Durable Promotion And Transition

The configuration-authority rule is now promoted to the three owners named in the
[durable-docs plan](./durable-docs-plan.md). That promotion does not claim callback/provider topology or live
post-deployment headers; both remain outside this slice.

`4-1A` is locally complete and its staging deployment is successful. Its final public-header observation needs an
externally reachable runner, not a code change. `4-2` and `4-3` remain separate, unauthorized slices; `4-3` still
requires the provider-console/topology evidence recorded in
[`../03-remaining-information.md`](../03-remaining-information.md).
