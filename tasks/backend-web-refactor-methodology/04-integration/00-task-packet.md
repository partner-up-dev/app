# Integration Workstream

## Objective & Hypothesis

- 将三个子任务的事实整合成一份无冲突的冻结边界和只读基线，而不重复完整调查。
- 用低成本复核发现计数漂移、引用失效、owner 冲突和证据缺口。

## Owned Outputs

- `frozen-boundaries.md`
- `baseline-scorecard.md`
- `conflicts-and-open-questions.md`
- `next-slice-readiness.md`
- `verification-log.md`

## Guardrails Touched

- 只写本目录和根控制文件。
- 不修改子任务证据以掩盖冲突；冲突进入专门清单并回传 owner。
- 不把 Phase 3 的设计或代码方案混入本阶段完成条件。

## Verification

- 每个总表事实引用至少一个 workstream evidence id。
- 对高影响数字做独立抽样复跑，而不是重复全部取证。
- 所有 unresolved conflict/open question 都有 owner、影响和进入下一阶段前的处理条件。

## Current Status

- Phase 1 frozen register integrated from Backend, Web and Cross-unit evidence.
- Phase 2 read-only scorecard integrated; no application or durable-doc edits made.
- Two durable conflicts and ten bounded open questions retained rather than silently resolved.
- Candidate slices compared as hypotheses; no Phase 3 design or mutation authorized.

## Verification Evidence

- Required workstream outputs: 15/15 present.
- Relative Markdown links checked: 90, missing 0.
- Delegated line-reference checks: Backend 186 / Cross-unit 135, invalid 0.
- Six high-impact metric samples reproduced exactly.
- Fourteen canonical gate rows reconciled without pass/skip/no-signal ambiguity.
- Final whitespace check passed across 23 Markdown files; worktree scope audit confirms this task only added its task directory.
