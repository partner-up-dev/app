# 4-3 Subtask Map

## Dependency Order

4-3.1 establishes the Backend result contract before 4-3.2 maps it into a browser recovery state. 4-3.3 proves
the joined behavior at the cheapest faithful level. 4-3.4 runs in parallel as evidence work, but does not delay
the local semantic changes and cannot authorize topology mutation by itself.

## Current Completion State

- 4-3.1 Backend terminal semantics: complete locally.
- 4-3.2 Web terminal recovery and legacy compatibility: complete locally.
- 4-3.3 Focused honest journey proof: complete locally, with no claim of distinct-origin browser fidelity.
- 4-3.4 Callback authority and rollout: externally open; this is a blocker only for topology change and legacy
  retirement.

| ID | Folder | Deliverable | Entry conditions | Exit conditions |
| --- | --- | --- | --- |
| 4-3.1 | [01-backend-terminal-semantics](./01-backend-terminal-semantics/) | Stable terminal Backend result and bind-marker ordering | Problem-details/global handler shape and test seam inspected | Expected identity rejection has no token or generic 500; nonce behavior asserted |
| 4-3.2 | [02-web-terminal-recovery-and-legacy-compatibility](./02-web-terminal-recovery-and-legacy-compatibility/) | Typed client result, correct gate actions, parameter hygiene | 4-3.1 response vocabulary decided | Received failure clears nonce and offers fresh login; transport uncertainty preserves retry; legacy errors scrub code/state |
| 4-3.3 | [03-honest-journey-proof](./03-honest-journey-proof/) | Focused contract proof and honest limits | 4-3.1/2 tests pass locally | Backend/Web sequence proven; browser claim labelled by origin fidelity |
| 4-3.4 | [04-callback-authority-and-rollout](./04-callback-authority-and-rollout/) | Evidence request/checklist and explicit stop branch | Public endpoint/CI/document evidence available | Provider/edge facts observed or recorded as blocker; no fabricated conclusion |

## Parallelism And Integration

4-3.1 and 4-3.4 can proceed independently. 4-3.2 starts after the Backend status/code vocabulary is settled.
4-3.3 integrates only source-owned changes from 4-3.1/2 and never incorporates the independent root toolchain
work. The low-cost verification plan is prepared before work is delegated or code is touched.
