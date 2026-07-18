# 07B Backend Create Guard + WeCom — Execution Plan

This is a read-only execution design. It does not claim that the guard, controller, tests, or runtime validation have
been implemented. Production, test, and durable-document edits are outside this packet's current entry.

## Target contract

Every persistence-capable create command has an explicit `PRCreationAuthority`:

| Authority | Allowed identity | Persisted result |
| --- | --- | --- |
| `USER` (default for public H5 and NL) | active `users` row carrying the `authenticated` role, resolved from the authenticated user id or an already-established WeChat OAuth identity | `createdBy` is that user; normal finalization returns `OPEN` |
| `ADMIN` | service/admin actor supplied by the admin use-case; a null actor remains an explicit admin-call decision, not a USER fallback | preserve the current admin `create-open` behavior |
| `SYSTEM` | no user identity required; capacity expansion supplies all-null identity intentionally | preserve creatorless `OPEN` capacity expansion |

`anonymousUserId` can never satisfy `USER`. A `service`/`analytics` row is not a USER actor merely because it is active;
the USER branch must check `hasUserRole(user.role, "authenticated")`. The admin route remains valid because it passes
`creationAuthority: "ADMIN"` explicitly. This distinction is grounded in the role schema (`anonymous`,
`authenticated`, `service`, `analytics`) and the admin middleware's service-role contract.

## Proposed guard API and placement

Prefer a small guard seam next to the existing creator identity service (for example
`apps/backend/src/domains/pr/services/pr-creation-guard.service.ts`) rather than making the controller responsible for
ownership. Keep the authority union independent of the command module to avoid a circular import:

```ts
export type PRCreationAuthority = "USER" | "ADMIN" | "SYSTEM";

export type PRCreationGuardInput = {
  authority: PRCreationAuthority;
  identity: CreatorIdentityInput;
};

export async function resolvePRCreationCreator(
  input: PRCreationGuardInput,
): Promise<User | null>;
```

Behavior is intentionally narrow:

1. `SYSTEM` returns `null` without resolving any identity.
2. `ADMIN` preserves the current behavior: null actor is allowed for existing internal callers; a supplied actor is
   resolved and must be active, but does not need the `authenticated` role because the authority is explicit.
3. `USER` rejects when `authenticatedUserId` is absent, when only `anonymousUserId` is present, or when the resolved row
   is missing, disabled, or lacks the `authenticated` role. Use the existing `throwAuthenticatedRequired()` problem
   (`401`, code `AUTHENTICATED_REQUIRED`) for all these cases so public HTTP and command-level failures have one shape.
4. If a trusted OAuth caller supplies `oauthOpenId` without an authenticated id, resolve it through the existing
   `resolveUserByOpenId` contract and require an active row with the `authenticated` role. A normal Web WeChat OAuth
   flow may provision its authenticated row through that existing resolver; this is not a permission for WeCom's
   `FromUserName` to be passed as `oauthOpenId`.
5. When both ids are supplied, the authenticated id is authoritative. An invalid authenticated id must not fall back to
   a different OAuth identity.

In `createPRFromStructured`, derive `creationAuthority` and call the guard before `prRepo.create` (preferably before
creation-policy reads and all child/materialization work). Set `createdBy` from the returned user and leave the existing
`initializeSlotsForPR`, materialization, operation log, and `finalizeCreatedPR` sequence unchanged. The natural-language
command continues to delegate to this canonical structured command; no second USER guard is permitted.

## WeCom adapter behavior

The decrypted `FromUserName` remains only the reply recipient. Do not look it up as `users.openId`, do not synthesize a
user, and do not reuse an anonymous UUID. The current webhook has no JWT/OAuth context and therefore cannot satisfy the
USER guard. On `AUTHENTICATED_REQUIRED` from the NL command:

- do not read `FRONTEND_URL`, build a PR URL, or send the existing success text;
- send one truthful non-success text to the same `fromUser` (for example, “当前企业微信账号未绑定已登录用户，无法创建；请先完成登录绑定后再试。”), or record the same outcome through the existing adapter seam if messaging is unavailable;
- retain the fast empty HTTP acknowledgement (`200` text) and keep async errors out of the webhook response.

The failure reply is an adapter side effect only; the guard must have run before `PartnerRequestRepository.create`, slot
initialization, type snapshot/materialization, and operation logging. A send failure is logged by the existing async
catch and must not turn into a success URL or a retrying create.

## Coherent implementation batch (future execution)

1. Refresh line anchors and caller inventory immediately before editing. Confirm the four production callers remain the H5
   form/NL routes, WeCom NL, admin use-case, and system capacity expansion.
2. Add the guard seam and unit tests for role/identity matrix.
3. Place the guard in `createPRFromStructured`; preserve `ADMIN`/`SYSTEM` options and all post-create effects.
4. Handle the WeCom authenticated-required branch with no URL/success reply and add a dependency-injected adapter test
   seam if the current singleton is not directly spyable.
5. Run the focused matrix in [`test-matrix.md`](./test-matrix.md), then Backend type/build. Do not expand to global auth,
   schema migration, DRAFT ownership cleanup, or Browser replay in this batch.

## Stop conditions and forks

- If a WeCom product requirement demands creation before an authenticated mapping, stop and fork a separately owned
  User/Auth mapping protocol; never use `FromUserName`, a synthetic user, or null `createdBy` under `USER`.
- If satisfying OAuth-only identity requires changing token/session issuance or the user schema, stop and route to the
  User/Auth owner. This slice may consume the existing resolver but does not redesign it.
- If an ADMIN caller is discovered to be user-originated or unclassified, stop and reclassify authority before preserving
  it as an exception.
- If the guard cannot be shown to precede the first root/child write, stop; transaction/cleanup work belongs to the
  failed-create/legacy hardening owner (07C), not this guard patch.
- If tests reveal a pre-existing creatorless DRAFT can be read, edited, or published by an ordinary user, record the
  finding and hand it to 07C; do not broaden this patch into ownership migration.

## Cheapest validation order

Run in this order after the coherent code/test batch:

```bash
pnpm test:unit:backend -- creator-identity
pnpm test:scenario:backend -- pr-create
pnpm test:scenario:backend -- pr-admin
pnpm check:type:backend
pnpm check:build:backend
```

Use the repository's exact Vitest project selectors if the shorthand filters differ. Reserve full System and all
cross-unit proof for 07E. `git diff --check` is sufficient for this task-local Markdown packet; no production behavior
is claimed by running these commands now.
