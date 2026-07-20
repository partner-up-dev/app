# 4-4 Subtask Map

| ID | Folder | Deliverable | Cheapest verification | Exit condition |
| --- | --- | --- | --- | --- |
| 4-4.1 | [01-escalation-boundary](./01-escalation-boundary/) | transport-report port plus OAuth-process claim/fallback | focused RPC/process unit tests with fake timers | no static RPC-to-OAuth import; one response triggers one escalation |
| 4-4.2 | [02-pending-command-protocol](./02-pending-command-protocol/) | typed, bounded continuation record and at-most-once dispatcher | storage + composable tests | invalid/expired entries clear; handler-ready entry clears once before invocation |
| 4-4.3 | [03-pr-command-continuations](./03-pr-command-continuations/) | named PR commands claim after persistence; waitlist preserves opt-in | focused command/composable tests | create/no-replay inventory stays explicit; five named actions behave intentionally |
| 4-4.4 | [04-escalation-journey-proof](./04-escalation-journey-proof/) | mocked Browser-to-Backend 401→OAuth→handoff→continuation proof | one scenario plus existing focused suites | observed journey, or recorded canonical-host limitation plus strongest lower proof |
| 4-4.5 | [05-promotion-and-closure](./05-promotion-and-closure/) | compact durable truth and packet exit | targeted docs review + final gates | only verified rules promoted; 4-5 gates listed unchanged |

The first three source subtasks are ordered: boundary before protocol before continuations. Journey proof integrates
their finished source, and promotion waits for its result. No worker may edit a sibling subtask's owned files.
