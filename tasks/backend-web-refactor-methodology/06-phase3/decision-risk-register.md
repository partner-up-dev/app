# Decision And Risk Register

| ID | Status | Decision / risk | Owner / route | Blocks |
| --- | --- | --- | --- | --- |
| P3-D01 | Decided | Modular monolith; no microservice/universal DI rewrite | `target-state.md` → Unit Topology/local architecture | None |
| P3-D02 | Decided | PR context = Lifecycle + Type Config + Authoring + Discovery | Product TDD Unit Topology | None; promoted and proven through `3-4`/`3-5` |
| P3-D03 | Decided | Backend public surface = commands/queries/contracts/real ports | Backend local architecture | None; public-surface fitness proof completed |
| P3-D04 | Decided | Web raw transport stays in adapters; workflow owns sequences | Web Architecture | None; promoted and proven in `3-2` |
| P3-D05 | Decided | Keep AppType; no second DTO package | Cross-unit contracts | None |
| P3-R01 | Closed / verified in `3-7` | All PR persistence paths require an authenticated owner; anonymous/creatorless server DRAFT is rejected | `07-cf01-anonymous-pr-creation/05-verification/` → PRD/TDD/code/System alignment | None |
| P3-R02 | Closed / verified in `3-8` | Waitlist returns PublicPR only; optional rotation stays in `x-access-token`; stale lifecycle wording is corrected | `08-cf02-waitlist-auth-contract/03-focused-proof-phase-exit/` → Product TDD + focused characterization | None |
| P3-R03 | Controlled | OAuth callback/BI direct RPC are compatibility seams | Explicit allowlist + owner | Mechanical page/client ban |
| P3-R04 | Controlled | Historical import violations could make fitness rules noisy | Report-first baseline/expiry | Blocking architecture lint |
| P3-R05 | Controlled | Canonical per-card reads may have unmeasured latency/N+1 | Measure before batching | Read payload expansion |
| P3-R06 | Historical / absent at Phase 3 exit | Root 0-byte `vue` file had unknown provenance | Preserve; user/shared worktree | None |

## Decision Change Rule

Changing a Decided row requires new evidence, blast-radius analysis and an updated dependent slice packet. An
Open row cannot be resolved by choosing the easiest implementation. Controlled risks require an allowlist,
measurement or rollback path before their slice begins.
