# 4-0 Rehearsal

| Observation | Interpretation | Lowest-cost next action | Stop / branch |
| --- | --- | --- | --- |
| Static graph shows an SCC | Classify each edge before proposing movement | inspect import use sites and classify runtime/type/constant edges | Do not create a shared auth module solely to remove an SCC |
| Handoff source contradicts cookie/nonce Unit TDD | Potential security or behavior drift | trace callback → redirect → exchange and run the existing focused handoff proof | Stop; route through security/product alignment before mutation |
| A command starts OAuth but has no replay | It may be intentionally one-shot, as PR create is | compare command UX and PRD wording | Do not label absence a defect without a product promise |
| Two modules persist a token/session | Possible duplicate truth or distinct user/admin contexts | trace storage key, caller, role and lifecycle | Keep admin/service/analytics out unless public-user continuity is affected |
| Existing tests pass but do not prove ordering | Coverage is insufficient, not proof | add a task-local gap and choose one smallest targeted test for a later slice | Do not broaden to full System by default |

Rollback is deletion of this task-local evidence only. No behavior-changing mutation is allowed in `4-0`.
