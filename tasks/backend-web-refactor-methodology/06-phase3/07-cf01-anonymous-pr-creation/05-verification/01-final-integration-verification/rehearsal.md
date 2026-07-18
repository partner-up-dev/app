# 07E.1 Mental Rehearsal

| Observation / fork | Interpretation | Lowest-cost next action |
| --- | --- | --- |
| Mocked LLM path calls provider after a denied PR read | Public DRAFT data could escape; this is a 07C/read-chain regression | stop exit; add/repair only the owning public-read guard |
| A focused test fails due to a stale `pr-core` path | Test inventory drift, not behavior | refresh the path in the verification packet; do not recreate compatibility |
| Targeted System prints only a startup banner | Wrapper/process-tree capture issue is possible | run the direct foreground Vitest command and wait for its summary; do not infer a product failure |
| Full scenario fails outside CF-01 | Compare with current baseline and isolate reproducibly | keep Phase 3 open; return to the owning slice if caused by CF-01, otherwise report an unrelated blocker |
| Fitness finds a new violation | It is a real architecture delta until classified | stop status promotion and assign the owning boundary; do not widen an allowlist in 07E |

The successful path makes no external provider request: the test replaces the provider and proves the read rejection
short-circuits before it. Full System is sequenced after focused checks because its setup owns database/service
lifecycle and should not contend with other scenario commands.
