# Decision And Risk Register

| ID | Status | Decision / risk | Owner / route | Blocks |
| --- | --- | --- | --- | --- |
| P3-D01 | Decided | Modular monolith; no microservice/universal DI rewrite | `target-state.md` → Unit Topology/local architecture | None |
| P3-D02 | Decided | PR context = Lifecycle + Type Config + Authoring + Discovery | Product TDD Unit Topology | Slice 04/05 implementation until promoted |
| P3-D03 | Decided | Backend public surface = commands/queries/contracts/real ports | Backend local architecture | Slice 04/05 implementation until fitness proof |
| P3-D04 | Decided | Web raw transport stays in adapters; workflow owns sequences | Web Architecture | Slice 02 implementation until promoted |
| P3-D05 | Decided | Keep AppType; no second DTO package | Cross-unit contracts | None |
| P3-R01 | Open | Anonymous DRAFT PRD conflicts with authenticated-first runtime/TDD | Product owner; CF-01 route | Any create/publish mutation |
| P3-R02 | Open | Waitlist `auth payload` wording conflicts with header-only contract/runtime | Cross-unit/PR lifecycle owner | Any waitlist response mutation |
| P3-R03 | Controlled | OAuth callback/BI direct RPC are compatibility seams | Explicit allowlist + owner | Mechanical page/client ban |
| P3-R04 | Controlled | Historical import violations could make fitness rules noisy | Report-first baseline/expiry | Blocking architecture lint |
| P3-R05 | Controlled | Canonical per-card reads may have unmeasured latency/N+1 | Measure before batching | Read payload expansion |
| P3-R06 | Controlled | Root 0-byte `vue` file has unknown provenance | Preserve; user/shared worktree | Deletion/cleanup |

## Decision Change Rule

Changing a Decided row requires new evidence, blast-radius analysis and an updated dependent slice packet. An
Open row cannot be resolved by choosing the easiest implementation. Controlled risks require an allowlist,
measurement or rollback path before their slice begins.
