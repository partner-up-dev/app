# Conflicts And Open Questions

> **Reconciliation note.** 下表保留 CF-01/CF-02 的历史冲突快照；Sir 已决定 CF-01 采用
> authenticated-only PR persistence、CF-02 修正为 header-only auth contract，分别由 `3-7`/`3-8`
> 执行。OQ-07 已由 `../05-toolchain-recovery/` 解决。Anchor Event、旧 `/e/:eventId` 与已删除源码有关的
> 条目只作历史证据。当前风险与 owner 路由由 `../06-phase3/decision-risk-register.md` 接管。

## Conflict Register

| ID | Claims in conflict | Evidence | Impact | Owner | Resolution condition |
| --- | --- | --- | --- | --- | --- |
| CF-01 | PRD says anonymous create persists `DRAFT` then authenticated publish; Product TDD and current source require authenticated user before user-owned create. | [`XU-019`](../03-cross-unit/evidence-index.md); root reality check: `partner-request.controller.ts:59-69,142-202`, `PREditor.vue:485-497`, `InlineNLPRForm.vue:163-176` | “Preserve behavior” is ambiguous for PR create/Event-assisted create; a refactor could accidentally choose intent or current reality. | Product owner via PRD, then PR lifecycle Product TDD. | Explicitly confirm intended workflow, align PRD/TDD, then add one anonymous `/pr/new` browser journey through canonical detail. No PR-create mutation before this. |
| CF-02 | Cross-unit session contract forbids auth/session payload in domain response bodies; focused PR lifecycle text says waitlist returns `auth payload`. | [`XU-020`](../03-cross-unit/evidence-index.md); root reality check: `partner-request.controller.ts:434-457` rotates via header and returns `result.pr`; `usePRActions.ts:145-182` consumes only JSON PR. | Stale wording could cause a refactor to reintroduce a forbidden body contract or preserve a contract that does not exist. | Cross-unit contract owns session transport; PR lifecycle owner must align focused wording. | Treat header-only session rotation as current authority/reality; correct the focused Product TDD before a waitlist response-shape change, then typecheck Backend/Web. |

## Open Questions

| ID | Question | Why it matters | Evidence already available | Owner | Required before |
| --- | --- | --- | --- | --- | --- |
| OQ-01 | Which direct controller `{error}` responses are explicit OAuth/provider compatibility exceptions? | Bulk Problem Details cleanup could break callback/frontend consumers. | [`BE-BC-012`, `BE-BC-014`](../01-backend/evidence-index.md) | Cross-unit error owner + route owner | Any direct-error migration. |
| OQ-02 | Is unmounted `canonical.controller.ts` disposable scaffold or reserved example? | It contributes two declarations and one unresolved import but no mount. | [`BE-BC-013`](../01-backend/evidence-index.md) | Backend local owner | Dead-code cleanup after toolchain baseline works. |
| OQ-03 | Is `WeChatOAuthCallbackPage.vue` direct RPC an intentional callback seam? | A mechanical “no RPC in components” rule may break redirect/error choreography. | [`WEB-006`](../02-web/evidence-index.md) | Web process/OAuth owner | OAuth/RPC cycle refactor. |
| OQ-04 | Should `AnchorEventPRContextRepository` projection/filter logic move to a domain read model? | Repository currently owns more than plain CRUD; moving it changes read and visibility behavior. | [`BE-AB-003`, `BE-AB-007`](../01-backend/evidence-index.md) | Anchor Event/PR read owner | Event/PR persistence-boundary slice. |
| OQ-05 | How many SCC edges are runtime/value edges versus barrel/type-only edges? | Cycle count alone may prescribe the wrong first extraction. | [`BE-AB-006`](../01-backend/evidence-index.md), [`WEB-008`](../02-web/evidence-index.md) | Unit architecture owner | Before adopting cycle reduction as a blocking fitness rule. |
| OQ-06 | Does canonical per-card PR detail hydration cause observable request/latency cost? | Canonical reads are required; optimizing without measurement risks duplicating entity truth. | [`WEB-012`](../02-web/evidence-index.md), [Web behavior](../02-web/behavior-contracts.md) | PR read/Web performance owner | Any batching or preview-payload expansion. |
| OQ-07 | What is the owner-approved repair for both missing `oxc-parser` native bindings? | Dead-code, Web build and System scenario are blocked on versions `0.135.0` and `0.124.0`. | [`XU-027`, `XU-030`, `XU-033`](../03-cross-unit/evidence-index.md) | Dependency/toolchain owner | Before Phase 3 or release-like baseline. |
| OQ-08 | Where should a real Semgrep security baseline run? | Current exit 0 is an explicit skip, not a security result. | [`XU-028`](../03-cross-unit/evidence-index.md) | Security/CI owner | Before promoting security to a blocking refactor gate. |
| OQ-09 | Is an all-repo format/Biome baseline desired, and who owns existing findings? | Changed-scope commands scanned zero files. | [`XU-022`–`XU-024`](../03-cross-unit/evidence-index.md) | Repo quality owner | Before calling format/Biome a full baseline. |
| OQ-10 | When can legacy CaoCao callback/job columns and migration-ledger gaps be retired/explained? | They affect provider routing and forward-only evolution; static presence is not live-use evidence. | [`BE-BC-007`, `BE-BC-010`](../01-backend/evidence-index.md), [`BE-BL-009`](../01-backend/evidence-index.md) | Provider runtime + DB ledger owner | Corresponding provider/DB slice. |

## Rules

- Do not resolve a product or authority conflict by choosing the most convenient implementation.
- A source/doc mismatch remains explicit until the durable owner or runtime evidence resolves it.
- Suggestions about Phase 3 architecture belong in `next-slice-readiness.md`, not in the frozen register.
