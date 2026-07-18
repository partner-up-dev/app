# 07A Durable Rebaseline — Document Map And Exact Anchors

Read-only entry design captured 2026-07-17. The paths below are the only proposed durable edits for 07A. Line numbers
are current-tree anchors and must be refreshed immediately before any future edit; they are not an implementation
inventory.

## Required PRD edits

### `docs/10-prd/behavior/workflows/core-pr.md`

Replace the anonymous branches at current `:9-11` (natural-language) and `:21-23` (structured) with the same contract:

1. If the selected type permits USER creation and the visitor is authenticated, the unified create command persists
   and publishes an `OPEN` PR in one operation, bound to that authenticated user.
2. If the visitor is anonymous, the create action stops before the create request, explains that sign-in is required,
   and may start OAuth only after explicit user confirmation. No server-side PR/DRAFT is created, and no create command
   is automatically replayed after OAuth.
3. After authentication, the user explicitly submits the create command; the returned PR is shareable and revisitable.

Do not alter the surrounding natural-language interpretation, structured field, current-type-default, or revisit rules.
The wording must describe Browser A's browser-memory loss boundary only as UX work owned by 07D; it must not promise a
durable local draft.

### `docs/10-prd/behavior/workflows/pr-discovery-and-authoring.md`

Replace current `:51` (section 6, step 3) with:

> The unified create command requires authentication before USER persistence. Authenticated users create and publish
> an `OPEN` PR in one operation. Anonymous visitors remain in transient authoring, receive an explicit sign-in
> disclosure before OAuth, create no server row, and receive no automatic post-OAuth create replay.

Keep step 4's ordinary participation loops and step 5's READY editing rule unchanged. This keeps `/prd` handoff
transient and aligned with `pr-discovery-and-authoring-contracts.md`'s no-identity-before-create rule.

### `docs/10-prd/behavior/rules-and-invariants.md`

Replace current `:20-22` with:

- Natural-language and structured create commands always enter through one system-owned create flow.
- A USER create command requires an authenticated account before any PR or child persistence; successful USER creation
  persists and publishes an `OPEN` PR in one operation and binds `createdBy` to that authenticated user.
- An anonymous visitor may author transiently, but the public H5 create path creates no server-side `DRAFT` and has no
  automatic create replay after OAuth.

At current `:32-36`, retain the separate admin and system wording but add one sentence after the direct-user rule:

> No public or enterprise/WeCom ingress may persist an anonymous or creatorless USER `DRAFT`; explicit `ADMIN` and
> `SYSTEM` authorities remain separate actor cases and are not anonymous-user fallbacks.

At current `:59-60`, retain the status set and creator-private rule, then add:

> Creatorless historical `DRAFT` rows are legacy remediation state, not a supported anonymous create/publish protocol;
> ordinary USER reads, edits, and publish must not claim them.

Do not rewrite lifecycle statuses, current-creator transfer semantics, or public discovery filtering. The historical-row
sentence is a boundary for 07C hardening, not a claim that this 07A packet migrates data.

### `docs/10-prd/behavior/capabilities.md`

Clarify current `:13` so “draft” cannot be read as anonymous persistence:

> create and publish PRs through the authenticated PR Authoring command, including authenticated one-step publish

The capability list remains a product summary; no new local-storage or recovery capability is added here.

## Required Product TDD edits

### `docs/20-product-tdd/pr-lifecycle-contracts.md`

Current `:21-25` is mostly aligned but needs one narrow clarification:

- Keep the route split and response shape at `:18-21`.
- Replace `:22` with: “For `USER` authority, Backend requires an active authenticated caller before root or child
  persistence, persists `createdBy` to that caller, and publishes `OPEN` in the same command. Explicit `SYSTEM`
  full-capacity expansion remains system-owned; admin creation remains the separate `ADMIN` command surface.”
- Keep `:23`'s convergence statement, adding that WeCom is an ingress adapter and cannot bypass the USER guard.
- Replace `:24` with: “`POST /api/pr/:id/publish` requires an authenticated user and returns
  `AUTHENTICATED_REQUIRED` for anonymous callers. The shared RPC policy may start WeChat OAuth; any pending/replay
  behavior is command-owner-specific. Browser A's USER create path performs its auth preflight before POST and never
  automatically creates or replays a PR after OAuth.”
- Keep `:25`'s authenticated DRAFT/content mutation rule; 07C owns the creatorless/legacy authorization hardening.

No edit is proposed to `cross-unit-contracts.md` or `wechat-oauth-handoff.md`: their session/OAuth transport contract
already says the command owner controls replay, and Browser A changes only the PR create owner behavior. Do not add a
WeCom identity mapping to either document.

## Explicit no-edit set

Do not edit the following in 07A:

- `docs/20-product-tdd/cross-unit-contracts.md` session/error transport or `docs/30-unit-tdd/wechat-oauth-handoff.md`
  OAuth nonce/cookie semantics;
- `docs/20-product-tdd/system-state-and-authority.md` anonymous session or frontend non-authoritative storage lists;
- Backend routes, creator identity services, WeCom controller, schemas/migrations, tests, or Web auth/replay code;
- 07B/07C/07D/07E packets other than consuming their evidence.

The no-edit set prevents durable docs from implying that an OAuth transport change, WeCom mapping, cleanup delete, or
local structured-draft implementation was part of 07A.
