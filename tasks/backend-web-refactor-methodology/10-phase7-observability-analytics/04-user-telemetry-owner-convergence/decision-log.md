# `7-3` Decision Log

| ID | State | Decision | Consequence |
| --- | --- | --- | --- |
| D7-3-01 | Executing approved target | Backend runtime Registry is the only owner of canonical event name, version and validation schema | Web may consume a type-only derived projection but may not own another alias/version table |
| D7-3-02 | Executing approved target | The public projection travels through `@partner-up-dev/backend/contracts` as types only | Web does not deep-import Backend infrastructure or bundle Zod/Registry runtime |
| D7-3-03 | Executing approved target | New Backend emission resolves its version from the active Registry contract | The recorder cannot hard-code version `1`; deprecated versions remain ingest-compatible only |
| D7-3-04 | Executing approved target | Telemetry recording is awaited but passive | Serverless delivery is not fire-and-forget, while rejection/storage failure cannot replace a committed business response |
| D7-3-05 | Executing approved target | Ingest outcomes are accepted, deterministic-rejected or idempotent | Duplicate event IDs no longer disappear from batch accounting |
| D7-3-06 | Executing approved target | Web retries network errors, `408`, `425`, `429` and `5xx`; successful `2xx` and other deterministic `4xx` are terminal | Invalid events cannot create an infinite retry loop |
| D7-3-07 | Preserved policy | No new consent gate or activation behavior is introduced | Phase 7 remains structural and does not invent product policy |
| D7-3-08 | Deferred | A future same-name v2 needs an explicit caller version or generated/runtime protocol decision | Phase 7 does not create a Web name-to-version mirror merely to anticipate v2 |
| D7-3-09 | Out of scope | Existing repeated join/waitlist/close success telemetry semantics are not silently redefined | Any past-tense transition semantic change needs business-command outcome plumbing in a separate decision |
