# Read-only Baseline Scorecard

> **Historical snapshot.** 本表的规模、routes、依赖图和 blocked gate 均属于 `a8cf2d7`
> 及当时的依赖安装。当前 HEAD、规模与恢复后的 gate 见 `../06-phase3/entry-baseline.md`；
> 不得把本表数字作为 Phase 3 acceptance baseline。

## Status

Phase 2 read-only snapshot complete for HEAD `a8cf2d7c1beb6f8c285a1265440b278c6668a55b`
on the documented dirty worktree and existing dependency install.

## Scorecard

| Dimension | Metric | Current baseline | Evidence | Recheck command | Interpretation limit |
| --- | --- | --- | --- | --- | --- |
| Backend scale | Production TS files / LOC | `481 / 57,298` | [`BE-BL-001`](../01-backend/evidence-index.md) | Exact command in Backend `readonly-baseline.md` | Size is scope, not complexity proof. |
| Web scale | Production TS/Vue files / LOC | `437 / 85,932` | [`WEB-001`](../02-web/evidence-index.md) | Exact command in Web `evidence-index.md` | Includes UI/template/style and generated locale schema source. |
| Backend HTTP | Hono controller declarations / mounts | `194` declarations including unmounted canonical scaffold; `192` excluding it; `28` index mounts (`27 /api`, `1 /internal`); `3` top-level routes | [`BE-BL-002`](../01-backend/evidence-index.md) | Backend BE-BL-002 command | Declarations are not unique public endpoints. |
| Web routes | Router `path:` records | `47` | [`WEB-009`](../02-web/evidence-index.md) | Web WEB-009 command | Includes compatibility/admin routes; not a product capability count. |
| Backend boundary | Validators / direct JSON / direct error lines | `188 / 0 / 25` | [`BE-BL-003`](../01-backend/evidence-index.md) | Backend BE-BL-003 command | Direct error lines need route/compatibility classification. |
| Backend topology | Relative graph | `481` nodes, `2,177` resolved edges (`2,122` unique), `3` cyclic SCC, max `38` | [`BE-BL-005`](../01-backend/evidence-index.md) | Backend BE-BL-005 parser | Static relative imports only; barrel/type edges may inflate SCC. |
| Web topology | Cross-owner graph | `707` edges / `94` owner pairs; `1` cyclic SCC of `5`; top hub `lib/rpc.ts` in-degree `54` | [`WEB-008`](../02-web/evidence-index.md) | Web WEB-008 parser | Static imports only; a cycle is a review signal, not runtime failure. |
| Backend direction | Selected reverse/legacy edges | controller->legacy `11`, controller->repository `7`, domain->legacy `2`, repository->domain `8`, entity->domain `14`; deep relative imports `909` | [`BE-BL-004`](../01-backend/evidence-index.md) | Backend BE-BL-004 command | Text edges include type-only imports and do not prove business calls. |
| Backend composition | Module-level constructors | all `new` `449`; DI-like constructors `379`; `setInterval(` `0` | [`BE-BL-006`](../01-backend/evidence-index.md) | Backend BE-BL-006 parser | Lexical approximation; use to track trend, not mandate a framework. |
| Web transport/cache | Transport/key seams | `client.api` `117`, `adminClient.api` `81`, Vue direct client `1`, raw fetch `5`, literal query-key arrays `2` | [`WEB-004`–`WEB-007`](../02-web/evidence-index.md) | Web transport/key command | Most client calls live in legitimate query/process adapters. |
| Compatibility | Current seams | Backend `pr/pr-core`, top-level services, canonical scaffold, legacy CaoCao route/job columns; Web `lib/router/stores`, callback page direct RPC | [`BE-AB-002`–`BE-AB-005`](../01-backend/evidence-index.md), [Web authority](../02-web/authority-boundaries.md) | Targeted `rg` per seam | Presence does not prove safe deletion or live runtime use. |
| Size smells | Large production files | Backend `16 >=500`, `4 >=800`; Web `37 .vue >=500` | [`BE-BL-007`](../01-backend/evidence-index.md), [`WEB-002`](../02-web/evidence-index.md) | Workstream inventory commands | Advisory only; split by behavior/owner seam, not line count. |
| Tests inventory | Test files | Backend source `68`, backend scenario `26`, root system scenario `10`; Web/root combined inventory `48` | [`BE-BL-008`](../01-backend/evidence-index.md), [`WEB-010`](../02-web/evidence-index.md) | Workstream find scripts | File counts do not measure assertion quality or coverage. |
| DB ledger | Static SQL files | Drizzle `72` + data `12` = `84`; prefixes `0000–0085`, gaps `0063/0066`, no duplicates | [`BE-BL-009`](../01-backend/evidence-index.md) | Backend BE-BL-009 parser | Directory state is not applied-database state. |
| Executable proof | Passing current gates | Backend lint/type/config/build/unit `314`/scenario `82`; Web lint-with-findings/type/unit `162` | [`XU-023`–`XU-026`, `XU-029`, `XU-031`, `XU-032`](../03-cross-unit/evidence-index.md) | Commands in verification baseline | Current dirty install snapshot; not clean CI qualification. |
| Blocked proof | Failed/skipped/no-signal gates | FAIL: dead-code, Web build, System scenario; SKIPPED: security; NO-SIGNAL: format | [`XU-022`, `XU-027`, `XU-028`, `XU-030`, `XU-033`](../03-cross-unit/evidence-index.md) | Same canonical commands after owner-approved toolchain repair | Failures currently prevent a green cross-unit baseline. |
| Runtime environment | Node/tooling | shell Node `22.22.3`; project/pnpm Node `22.23.1`; pnpm `11.13.0` | [`XU-021`](../03-cross-unit/evidence-index.md) | Version commands in verification baseline | Gate attribution uses project Node. |

## Baseline Rules

- Counts must state search scope and exclusions.
- Static graph results are topology observations, not proof of runtime behavior.
- File size and reactive-call counts are smell indicators, not architectural acceptance criteria.
- Report-first gates remain report-first unless ownership and baseline are explicitly changed later.
- A skipped, blocked, or prior-only gate is never recorded as a current pass.
