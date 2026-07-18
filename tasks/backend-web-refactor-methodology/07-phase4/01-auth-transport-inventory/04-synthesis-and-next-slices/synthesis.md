# 4-0D — Phase 4 Synthesis

## Target State

Phase 4 should leave one explicit owner for each public-user identity fact and one deliberate process for browser
OAuth continuity:

```text
Backend user lifecycle owns current user state and upgrade decisions
Backend auth boundary owns issue/verify/rotation transport
Backend HTTP adapters own request/cookie/provider translation
Web session process owns browser continuity and OAuth ordering
Domain commands own their own pending intent and post-auth continuation
```

This is an application of the existing four-category public-surface rule, not a proposal for a universal auth service.
Controllers retain HTTP mapping, `domains/user` retains user decisions, and Web `processes` retains browser/platform
orchestration. Each owner exposes only the narrow command, canonical query, stable contract or real port another
owner needs.

## Revised Execution Order

| Slice | Narrow objective and owned boundary | Preconditions / stop branch | Cheapest first proof | Exit condition |
| --- | --- | --- | --- | --- |
| `4-1` origin/return-target containment | Return-target selection and credentialed CORS in Backend; minimal Web producer adjustment only if required | **Solidified.** Preserve callback, cookie, handoff body and frontend callback route; stop on an unnamed alias or cross-environment caller. | Hostile-origin / disallowed-return target tests plus paired-origin preflight assertions | One named environment-derived origin authority; arbitrary origin and request-header-derived return target are rejected. |
| `4-2` session and identity authority | `auth`, `domains/user`, auth controller and Web session projection; no OAuth callback shape change | Sir resolves service/analytics public-route policy; preserve anonymous/user product rules | Active/disabled identity and anonymous stale/revisit tests | One named validation/issuance flow and one browser projection rule; no duplicated current-user decision. |
| `4-3` handoff and callback compatibility | WeChat callback controller/service, handoff gate and legacy callback only | Depends on `4-1` and the session contract from `4-2`; provider-console topology evidence is required before a behavior change | Local WeChat mock System journey: callback -> nonce -> exchange -> clean URL | Navigation handoff is proven; legacy path is explicitly retained, migrated or removed with consumers known. |
| `4-4` authenticated escalation and pending commands | RPC/auth policy/OAuth process boundary plus public PR command continuations | Depends on `4-3`; product decision on retry/at-most-once semantics | One full join or waitlist `401 -> mocked OAuth -> handoff -> continuation` System journey | Acyclic or deliberately one-directional escalation dependency; persisted intent ordering proven; PR create remains no-replay. |
| `4-5` conditional compatibility closure | Route auto-login, legacy facades and remaining non-security URL propagation | Sir decides route auto-login meaning; no broad cleanup | Consumer inventory plus one focused replacement proof per retired edge | Each retained exception has an owner/removal condition, or each deletion has no consumer and equivalent behavior proof. |

The Auth SCC is therefore an **exit condition of `4-4`**, not a standalone file-moving slice. This keeps the
behavioral redirect/telemetry ordering attached to its actual browser-process owner.

## Decisions Needed From Sir Before Execution

1. Choose whether `service` / `analytics` credentials may access public user or WeChat routes, or must be rejected
   as public-user sessions.
2. Choose replay semantics for already-replayable commands: retryable after a failed continuation, or deliberately
   at-most-once. PR creation remains non-replayable under either choice.
3. Confirm whether route-level WeChat auto-login is a product behavior to restore or a compatibility path to retire.

## Explicit Deferrals

- WeChat-console callback topology is deferred to `4-3`; it is preserved, not inferred or changed, by `4-1`.
- Admin/operator auth remains a separate context.
- PR creator identity convergence waits for stable session semantics; it is not bundled into `4-2`.
- Commerce, Job/Notification and Observability retain their roadmap order and are untouched.
- The PR Discovery model SCC is outside Phase 4.
