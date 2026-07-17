# Integration Verification Log

## Planned Low-cost Checks

| Check | Purpose | Cost bound | Result |
| --- | --- | --- | --- |
| Evidence-file existence | Detect missing delegated outputs | One filesystem scan | PASS — 15/15 required workstream files present; 0 missing. |
| Referenced-path sample | Detect stale or invented anchors | All Markdown links + delegated line scanners | PASS — root checked 90 non-code relative Markdown links, 0 missing; Backend checked 186 line references and Cross-unit 135, 0 invalid. |
| Key-count replay | Detect counting drift | Three Backend + three Web metrics | PASS — all six samples reproduced exactly; details below. |
| Gate-result reconciliation | Detect pass/skip/prior ambiguity | Matrix comparison only | PASS — 14 requested rows map to 8 PASS, 1 PASS-WITH-FINDINGS, 3 FAIL, 1 SKIPPED, 1 NO-SIGNAL. |
| Cross-workstream conflict scan | Detect authority or contract disagreement | Frozen claims only | PASS-WITH-FINDINGS — owner maps agree; two durable contract conflicts recorded as `CF-01/02`. |
| `git diff --check` equivalent | Detect malformed untracked task artifacts | Task directory only | PASS — 23 Markdown files checked with `git diff --no-index --check`; 0 diagnostic files. |
| Worktree scope audit | Detect out-of-scope mutation | `git status` and task-file scan | PASS — tracked diff remains only the pre-existing package/lock/workspace files; this task added only its task directory. |

## Key-count Replay

All commands ran from `/home/yyh/development/Anana/mvp-HA` and used the exact
scope/exclusion semantics documented by each evidence index.

| Sample | Reproduced result | Evidence |
| --- | --- | --- |
| Backend production scale | `481 files / 57,298 LOC` | `BE-BL-001` |
| Backend Hono declarations/mounts | `194 / 192`; mounts `28 = 27 API + 1 internal` | `BE-BL-002` |
| Backend import graph | `481 nodes / 2,177 edges / 2,122 unique / 3 cyclic SCC / max 38`; hubs also matched | `BE-BL-005` |
| Web production scale | `437 files / 85,932 LOC` | `WEB-001` |
| Web routes/test anchors | `47 routes / 323 data-testid / 91 files / 11 key families` | `WEB-009` |
| Web import graph | `707 cross-owner edges / 94 pairs / 1 SCC / max 5`; `lib/rpc.ts` in-degree 54, `PRPage.vue` out-degree 32 | `WEB-008` |

## Root Reality Spot-checks

| ID | Question | Current source observation | Interpretation |
| --- | --- | --- | --- |
| INT-R-001 | What does user-owned PR create do today? | `partner-request.controller.ts:59-69,142-202` rejects all PR mutations without authenticated role and both create handlers require authenticated creator. Web bootstraps even an anonymous session then submits; the global `401/AUTHENTICATED_REQUIRED` policy can initiate OAuth. | Current implementation matches Product TDD authenticated-create behavior, not PRD anonymous-DRAFT intent. This confirms `CF-01`; it does not choose which durable claim should change. |
| INT-R-002 | Does waitlist return body auth payload today? | `partner-request.controller.ts:434-457` rotates session via `issueResponseAuth`/header and returns `result.pr`; `usePRActions.ts:145-182` consumes the JSON as PR and only relies on global header handling. | Current implementation and session owner agree on no auth body. The focused PR lifecycle phrase is a durable-doc drift candidate (`CF-02`). |
| INT-R-003 | Is Web build indeterminate or failed? | Root polled session `88826`: exit `1` after `vue-tsc`, when Vite/UnoCSS could not load `oxc-parser@0.124.0` native binding. | Definitive FAIL; reconciled into `XU-030`. |

## Gate Reconciliation

- PASS: Backend lint/type/config/build/unit/scenario; Web type/unit.
- PASS-WITH-FINDINGS: Web lint (two report-only medium naming findings; Biome scanned 0 changed files).
- FAIL: dead-code (`oxc-parser@0.135.0`), Web build and System scenario (`oxc-parser@0.124.0`).
- SKIPPED: security because Semgrep is absent.
- NO-SIGNAL: format because changed-file Biome scanned 0 files.

The first System scenario attempt also met a transient port collision; its retry
passed that point and failed on the stable native-binding blocker. No System
scenario assertion ran, so the task makes no cross-unit journey-pass claim.
