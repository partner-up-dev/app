# 4-1 Rehearsal And Branches

| Observation during execution | Interpretation | Required branch | Cheap discriminator |
| --- | --- | --- | --- |
| A same-environment paired origin is rejected after a proposed allowlist | Deployment pairing/configuration is incomplete. | Stop before rollout; correct configuration authority rather than adding a dynamic exception. | Deterministic positive origin test. |
| An arbitrary or other-environment origin is accepted | Security containment is incomplete. | Block slice exit. | Deterministic preflight and `returnTo` negative tests. |
| Existing credentialed Web call loses CORS permission | Pairing or caller origin was omitted. | Add only a named same-environment consumer after evidence; never restore reflection. | Focused browser/API test and public paired-origin preflight. |
| Callback/handoff behavior changes in a focused regression test | `4-1` crossed its boundary. | Revert that behavior change and move it to `4-3`. | Existing OAuth/handoff units; no real OAuth required. |

Rollback of a future implementation must restore CORS and `returnTo` together. Callback and handoff behavior are not
rollback variables in `4-1`, because they must remain unchanged.
