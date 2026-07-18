# Slice 3-7 Decision Brief — Anonymous PR Creation

## Decision To Make

When an anonymous visitor uses `/pr/new`, does “save draft” create a durable Backend PR before authentication, or
does the first durable PR write require authentication?

This separates three behaviors that the old wording conflated:

1. anonymous **authoring** in the browser;
2. anonymous **durable persistence** in Backend/Postgres;
3. anonymous **public publishing**.

The runtime already permits (1), rejects (2), and rejects (3). The PRD promises (1) and (2), while Product TDD
and System scenarios specify authenticated-first persistence.

## Current Evidence

| Surface | Observed truth | Evidence |
| --- | --- | --- |
| PRD | Anonymous create persists a creator-private `DRAFT`; authenticated create persists and publishes in one operation | `docs/10-prd/behavior/rules-and-invariants.md:20-22,34-36,59-60`; `docs/10-prd/behavior/workflows/core-pr.md:8-11,20-23` |
| Product TDD | User-owned create, publish and DRAFT mutation require authentication | `docs/20-product-tdd/pr-lifecycle-contracts.md:18-25` |
| Backend route | All PR mutation routes are authentication-gated before create handlers run | `apps/backend/src/controllers/partner-request.controller.ts:57-64,117-173` |
| Non-public DRAFT branch | Public H5 create cannot reach it, but a trusted WeCom webhook calls the use case with no creator and creates a creatorless DRAFT link. `resolveDraftCreator` does not bind `anonymousUserId`; `buildCreatorIdentity` is currently unused | `apps/backend/src/controllers/wecom.controller.ts:271-290`; `apps/backend/src/domains/pr/commands/create-pr.shared.ts:15-42`; `apps/backend/src/domains/pr/services/creator-identity.service.ts:39-53`; `apps/backend/src/controllers/pr-controller.shared.ts:170-180` |
| Ownership | A creatorless DRAFT may be claimed on publish by any authenticated user; DRAFT content mutation also accepts an authenticated actor without creator equality | `apps/backend/src/domains/pr/commands/publish-pr.ts:54-143`; `apps/backend/src/domains/pr/services/creator-mutation-auth.service.ts:16-47` |
| Privacy | Discovery filters DRAFT, but direct detail read does not enforce creator-private access | `apps/backend/src/domains/pr-core/services/pr-read.service.ts:47-68`; `apps/backend/src/domains/pr/read-models/get-pr-detail.ts:116-139`; `apps/backend/src/controllers/partner-request.controller.ts:448-453` |
| System behavior | Anonymous save receives `401 AUTHENTICATED_REQUIRED`; authenticated create returns `OPEN` | `tests/scenario/pr-core/pr-create.scenario.test.ts:140-260` |
| Web behavior | Anonymous users can fill the editor; natural-language raw text has local persistence, but structured form state is memory-only. The button says Save, then POSTs create; global auth escalation starts OAuth, but `/pr/new` has no command-owned pending replay, so structured input may be lost | `apps/web/src/domains/pr/ui/forms/PREditor.vue:342-347,582-610`; `apps/web/src/domains/pr/stores/useNaturalLanguageDraft.ts:4-32`; `apps/web/src/lib/rpc.ts:22-51` |
| Identity continuity | Anonymous UUID can be upgraded in place to authenticated identity, but PR draft creation does not currently use that identity | `apps/backend/src/domains/user/use-cases/upgrade-anonymous-user.ts:14-50`; `apps/backend/src/controllers/wechat.controller.ts:1293-1310,1743-1767` |

## Options

### A — Authentication before the first durable PR write

- Anonymous visitor may author, but continuity remains best-effort: NL raw text is local while structured state may
  be lost across OAuth.
- Save/publish requests trigger the existing authentication + pending-action replay.
- After authentication, the normal successful create path returns `OPEN` in one user command.
- Update PRD to remove the promise of a server-side anonymous DRAFT; keep Product TDD/runtime semantics.
- Treat the direct-read/creatorless legacy DRAFT privacy gap as a separate security hardening item, not as permission
  to expose anonymous draft creation.

Why choose it: it is the smallest match to the proven Backend runtime and avoids orphan/claim/privacy risks.

Cost/risk: low, but the current `Save Draft` affordance is misleading and structured content loss is poor UX. At
minimum, rename/remove that affordance or authenticate before the user invests in the form.

### B — Anonymous server draft owned by the anonymous user UUID

- Create a Backend DRAFT immediately and persist `createdBy` as the current anonymous user's UUID.
- OAuth upgrade keeps the same user id, after which publish may proceed.
- Enforce owner-only DRAFT detail, edit, publish and recovery across anonymous/authenticated roles.
- Redact the anonymous owner UUID from non-owner/public projections; current detail maps `createdBy` directly.
- Define retention/cleanup, abuse/rate limiting, replay idempotency and multi-device expectations.

Why choose it: durable drafts survive browser lifecycle and can become a real progressive-identity feature.

Cost/risk: high. This is a User/Auth + PR ownership contract change, not a narrow middleware change. It requires
security design, authorization fixes, likely schema/data cleanup policy and broader System journeys. If selected,
implementation should move to or be co-designed with Phase 4 rather than be forced into a small Phase 3 patch.

### C — Auth-first server write plus complete local draft continuity (recommended)

- Public H5 Backend contract is the same as A: no PR row exists before authentication; the normal successful
  post-auth create returns `OPEN`. Trusted WeCom/system ingress remains an explicit carve-out until separately owned.
- Add one Web-owned local draft model for both structured and NL input, with explicit retention/clear/privacy rules.
- Before OAuth, save local draft plus a pending create intent; after return, restore and require confirmation or
  safely replay one idempotent create.
- Copy says local draft/sign-in, never implies a server-side creator-private PR.

Why recommended: it preserves the simpler authenticated-first authority boundary while delivering the user value
the old anonymous-DRAFT wording was likely trying to protect—surviving refresh/OAuth without losing composition.

Cost/risk: medium and Web-focused. Browser storage carries XSS/privacy/expiry considerations; replay must not create
duplicates. It does not provide cross-device drafts.

### D — Anonymous server draft protected by a capability/recovery secret (not recommended)

- Create a creatorless or guest-owned DRAFT and return a non-guessable continuation capability.
- Require that capability for read/edit/claim before authentication.
- Define secure storage, rotation, expiry, recovery, leakage and OAuth handoff semantics.

Why choose it: permits server persistence without relying on anonymous-account continuity.

Cost/risk: highest. It creates a second authorization protocol beside JWT identity and conflicts with the target of
fewer owners/simpler boundaries. Not recommended for this program.

## Decision Record — Accepted 2026-07-17

Sir selected the authenticated-first server policy shared by options A/C:

> No public or enterprise/WeCom entry may persist an anonymous or creatorless PR DRAFT. A server-side PR creation
> attempt requires an authenticated user and every persisted user-created PR/DRAFT must bind to that authenticated
> user. A successful normal create command returns an `OPEN` PR. Anonymous server DRAFT and capability-based draft
> protocols are outside the product contract.

This decision rejects B and D. It initially left Browser A/C open; that branch is now closed below without weakening
the server rule.

Also record, without expanding `3-7` prematurely:

> Existing creatorless/legacy DRAFT direct-read and mutation authorization is a security gap requiring an owned
> hardening item. It must be fixed before any future anonymous server-draft feature is considered.

The execution packet must also characterize a second current-state wrinkle before changing wording: authenticated
create inserts DRAFT before publish validation, and no transaction/rollback is evident. A failed publish may leave
an authenticated DRAFT. That state is now designated cleanup residue for a normal USER create: the implementation
may remove only the just-created, still-DRAFT row after a failed command; it must not rewrite historical data. If
safe cleanup cannot be demonstrated across its child effects, the implementation stops for a transaction/owner fork
rather than presenting an unsupported recoverable-draft UX.

## Consequence Map

| Decision | PRD | Product TDD | Backend | Web | Verification |
| --- | --- | --- | --- | --- | --- |
| A | Align to auth-before-write; no continuity promise | Mostly retain; clarify one-command outcome | Keep route policy; harden legacy DRAFT separately | Remove misleading Save or authenticate before form | Anonymous POST has no row; authenticated create OPEN |
| B | Retain durable anonymous DRAFT promise; define ownership/retention | Rewrite create/DRAFT access contract | Bind anonymous UUID; owner guards; cleanup/idempotency | Draft recovery and identity-upgrade UX | owner/non-owner read/edit/publish; upgrade; expiry; replay |
| C | Align to local authoring + auth-before-write | Retain server contract; define local-draft boundary | Keep route policy; harden legacy DRAFT separately | Complete structured/NL local store + OAuth pending intent | refresh/OAuth restore; no pre-auth row; one post-auth OPEN PR |
| D | Define capability draft product | Add separate capability auth contract | Capability issuance/validation/rotation | Secure capability persistence/handoff | leakage, expiry, replay and claim threat cases |

## Execution Follow-ups

- Server policy: **Decided — authenticated user required before every PR persistence path**
- Public H5 anonymous server DRAFT: **Rejected**
- Enterprise/WeCom creatorless DRAFT: **Rejected; must bind an authenticated user or stop creating**
- Browser continuity choice: **A selected — authenticate before a create command; no server row or automatic replay
  before authentication.** The UI must not promise a saved server draft, and it must disclose any local-memory loss
  boundary before redirect.
- Failed normal authenticated create: **cleanup residue**, not a recoverable product DRAFT; historical legacy rows
  are not rewritten by this decision.
- Legacy/failed-create creatorless DRAFT privacy and ownership hardening: **Required in `3-7` scope**
