# 07B Backend Create Guard + WeCom — Focused Test Matrix

The rows below are the minimum executable proof for the future guard batch. They describe test intent and fixtures, not
tests already added or run.

## Guard and canonical command

| ID | Entry / fixture | Expected result | Required no-side-effect proof |
| --- | --- | --- | --- |
| G1 | `createPRFromStructured(futureFields, { authenticatedUserId: null, anonymousUserId: null, oauthOpenId: null }, { creationAuthority: "USER" })` | throws `ProblemDetailsError` with status `401`, code `AUTHENTICATED_REQUIRED` | spy `PartnerRequestRepository.create` is not called; DB root count unchanged |
| G2 | Same command with `givenAnonymousUser` id in `anonymousUserId` only | same rejection; anonymous UUID is not owner | no root/partner/materialization/operation-log write |
| G3 | Same command with an ACTIVE `service`/`analytics` user id under `USER` | `AUTHENTICATED_REQUIRED` (or the agreed 401 auth problem), not an owned PR | no root row; proves service role cannot masquerade as USER |
| G4 | Same command with `givenUser` token/user id | command returns `OPEN`; persisted `createdBy` equals fixture id; owner slot exists as before | root/child effects match current authenticated path |
| G5 | Trusted OAuth-only identity using a pre-created ACTIVE user with `openId` and `oauthOpenId` | returns `OPEN`; `createdBy` equals resolved OAuth user | no duplicate user row; existing resolver contract only |
| G6 | Disabled/missing authenticated id under `USER` | `AUTHENTICATED_REQUIRED`; no fallback to `oauthOpenId` when both are supplied | no root/child writes |
| G7 | Explicit `ADMIN` with `givenAdminUser` actor | status `OPEN`, admin-only type policy remains available, `createdBy` remains actor id | preserve existing admin assertions |
| G8 | Explicit `ADMIN` with null actor in the direct use-case characterization (only if current caller still permits it) | current explicit ADMIN result remains unchanged; this is not a USER success case | record result, do not silently tighten in 07B |
| G9 | Explicit `SYSTEM` with all-null identity through `expandFullCapacityPR` seam | status `OPEN`, `createdBy = null`, expansion side effects remain | proves USER guard does not reject system capacity expansion |

For G1–G3 and G6, a command-level unit test is the cheapest ordering proof. A Backend scenario should additionally
snapshot `partner_requests`; if the fixture type can materialize children, snapshot `partners`, type-participation/
feedback rows, and operation logs or spy the repositories so an asynchronous log cannot hide a write.

## HTTP and WeCom adapter

| ID | Entry / fixture | Expected result | Required response/side-effect proof |
| --- | --- | --- | --- |
| W1 | Anonymous H5 token → `POST /api/pr/new/form` with future fields | existing HTTP 401 problem (`AUTHENTICATED_REQUIRED`) | root count before/after equal; no automatic create replay |
| W2 | Authenticated H5 token → same route | HTTP 201, `OPEN`, `createdBy` equals authenticated fixture | retain current scenario and owner probe |
| W3 | Decrypted text WeCom payload with `FromUserName = wecom-user-1`, AI returns deterministic fields, no auth mapping | webhook keeps empty fast `200` acknowledgement; async path sends one truthful non-success reply (or the explicitly selected no-reply result) | spy `createPRFromNaturalLanguage`/canonical repository: no persistence; spy `sendTextMessage`: no `/pr/<id>` success URL |
| W4 | WeCom sender id happens to equal a known `users.openId` | still no USER creation unless a separately authenticated mapping/context is supplied | proves no implicit `FromUserName`→OAuth lookup |
| W5 | WeCom crypto/decrypt or AI parse failure | existing ack/error logging behavior; no creation URL | no root row; not conflated with auth guard |

The controller test should use deterministic crypto fixtures already owned by WeCom tests, or extract a small injected
`handleWeComText` seam so `createPRFromNaturalLanguage` and `WeComService.sendTextMessage` are spies. Do not create a
synthetic user fixture to make W3 pass.

## Cheapest validation order

1. Guard unit tests (G1–G6) for error code, role check, and call ordering.
2. `pr-create` Backend scenarios (W1/W2 plus DB no-row assertions).
3. Admin scenario (G7/G8), then the SYSTEM expansion seam (G9) if touched.
4. WeCom controller/adapter test (W3–W5), including absence of success URL and persistence.
5. `pnpm check:type:backend`, then `pnpm check:build:backend`.

Full System/cross-unit proof remains 07E-owned. Any failure indicating schema migration, global middleware changes, or
legacy DRAFT authorization belongs to its owning phase and is a stop/fork, not a reason to weaken these rows.
