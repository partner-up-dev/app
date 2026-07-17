# Decision And Risk Register

| ID | Status | Decision / risk | Owner / route | Blocks |
| --- | --- | --- | --- | --- |
| P3-D01 | Decided | Modular monolith; no microservice/universal DI rewrite | `target-state.md` → Unit Topology/local architecture | None |
| P3-D02 | Decided | PR context = Lifecycle + Type Config + Authoring + Discovery | Product TDD Unit Topology | `3-4`/`3-5` implementation until promoted |
| P3-D03 | Decided | Backend public surface = commands/queries/contracts/real ports | Backend local architecture | `3-4`/`3-5` implementation until fitness proof |
| P3-D04 | Decided | Web raw transport stays in adapters; workflow owns sequences | Web Architecture | `3-2` implementation until promoted |
| P3-D05 | Decided | Keep AppType; no second DTO package | Cross-unit contracts | None |
| P3-R01 | Decided / pending `3-7` execution | All PR persistence paths require an authenticated owner; anonymous/creatorless server DRAFT is rejected | `07-cf01-anonymous-pr-creation/decision-brief.md` → PRD/TDD/code/System alignment | Create/publish/WeCom mutation before `3-7` |
| P3-R02 | Decided / pending `3-8` execution | Waitlist returns PublicPR only; optional rotation stays in `x-access-token`; stale lifecycle wording must be corrected | `08-cf02-waitlist-auth-contract/decision-brief.md` → Product TDD + focused characterization | Waitlist response mutation before `3-8` |
| P3-R03 | Controlled | OAuth callback/BI direct RPC are compatibility seams | Explicit allowlist + owner | Mechanical page/client ban |
| P3-R04 | Controlled | Historical import violations could make fitness rules noisy | Report-first baseline/expiry | Blocking architecture lint |
| P3-R05 | Controlled | Canonical per-card reads may have unmeasured latency/N+1 | Measure before batching | Read payload expansion |
| P3-R06 | Controlled | Root 0-byte `vue` file has unknown provenance | Preserve; user/shared worktree | Deletion/cleanup |

## Decision Change Rule

Changing a Decided row requires new evidence, blast-radius analysis and an updated dependent slice packet. An
Open row cannot be resolved by choosing the easiest implementation. Controlled risks require an allowlist,
measurement or rollback path before their slice begins.
