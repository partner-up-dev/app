# 07B Backend Create Guard + WeCom — Mental Rehearsal

This rehearsal checks ordering and actor classification only. It is not a report of an implemented or production-tested
flow.

```text
H5 anonymous token / WeCom webhook
  -> canonical USER command receives no authenticated User
  -> AUTHENTICATED_REQUIRED before PartnerRequestRepository.create
       ├─ H5: HTTP problem; root/child/log rows unchanged
       └─ WeCom: async truthful failure reply, empty fast HTTP acknowledgement, no PR URL

H5 authenticated token or mapped Web OAuth
  -> guard resolves ACTIVE user with `authenticated` role
  -> createdBy = that user
  -> root + slots/materialization/log -> finalization -> OPEN

ADMIN service actor -> explicit ADMIN branch -> existing OPEN behavior
SYSTEM capacity expansion + null identity -> explicit SYSTEM branch -> creatorless OPEN
```

## Branch table

| Branch / surprise | Required decision | Cheapest evidence |
| --- | --- | --- |
| Anonymous H5 request reaches the command directly | Reject with `AUTHENTICATED_REQUIRED` before the first write; middleware 401 remains a separate outer defense | direct command test + HTTP scenario + unchanged root count |
| `anonymousUserId` is non-null but authenticated id is null | Ignore it for ownership and reject; never “upgrade” or claim a PR in this slice | guard unit fixture using `givenAnonymousUser` |
| Active `service` user is passed while authority defaults to `USER` | Reject as an invalid USER actor; only explicit `ADMIN` may use service/admin identity | role matrix unit test |
| `ADMIN` has a service actor or a legacy null actor | Preserve explicit ADMIN behavior and status; do not require the USER role check | admin scenario and direct use-case characterization |
| SYSTEM expansion supplies all-null identity | Continue to `OPEN` with `createdBy = null`; this is system-owned capacity work, not anonymous authoring | capacity-expansion command seam or focused scenario |
| Mapped Web OAuth supplies only `oauthOpenId` | Resolve an active `authenticated` user through the existing OAuth resolver and bind that id; do not infer this from a WeCom sender id | known-openId fixture + owner assertion |
| WeCom `FromUserName` resembles an OAuth open id | Treat it as an external recipient identifier only; no lookup/provisioning and no success link | controller test spy and no-row assertion |
| AI parsing fails before the canonical guard | Preserve existing parse error; no persistence either way. An optional controller fast-fail is an optimization, not a second authority rule | NL command error test |
| Root insert succeeds but later publish/materialization fails | Leave cleanup/transaction decision to 07C; do not call the row an anonymous draft or add recovery here | existing failed-create evidence and stop condition |

## Invariants to assert during review

1. There is exactly one USER persistence guard at the structured command boundary; all NL callers converge there.
2. `createdBy` is never populated from `anonymousUserId` or `FromUserName`.
3. `ADMIN` and `SYSTEM` are explicit authority values, not inferred from role or null identity.
4. WeCom cannot emit a creation URL unless the command returned a persisted PR for an authenticated owner.
5. The guard runs before root insert, slot creation, type snapshot/materialization, and operation-log dispatch.

## Rollback thought experiment

If the product decision changes, revert the guard/WeCom batch as one reviewable change and reopen the authority decision.
Do not restore only the WeCom success-link path or only the creatorless command branch; that would recreate a mixed
contract where `USER` can persist without an owner while H5 rejects it.
