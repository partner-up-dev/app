# Phase 4 Durable Documentation Plan

`4-0` produces no durable-doc change by default. It may nominate, but not promote, compact changes after its evidence
is reconciled.

| Candidate truth | Durable owner | Promotion threshold |
| --- | --- | --- |
| Session transport, token rotation, role and anonymous continuity | `docs/20-product-tdd/cross-unit-contracts.md` | Source and cross-unit journey agree; exact owner and response boundary are stable |
| OAuth callback/handoff sequence and failure semantics | `docs/30-unit-tdd/wechat-oauth-handoff.md` | Backend/Web sequence is traced and focused proof covers the changed invariant |
| Anonymous-to-authenticated user progression and `/me` behavior | `docs/10-prd/behavior/rules-and-invariants.md` | Product promise actually changes or a contradiction is resolved explicitly |
| Backend/Web local implementation guardrails | nearest local `AGENTS.md` or architecture owner | A repeatable rule prevents a demonstrated recurrence |

## 4-0 Reconciliation

The inventory reaffirms, rather than changes, the generative target in
[`docs/20-product-tdd/architecture-objectives-and-decision-rules.md`](../../../docs/20-product-tdd/architecture-objectives-and-decision-rules.md):
one authority for a durable fact; narrow public surfaces in the four permitted categories; and browser/platform
lifecycles deliberately owned by a Web process. It also reaffirms the current unit split in
[`docs/20-product-tdd/unit-topology.md`](../../../docs/20-product-tdd/unit-topology.md).

No durable truth is promoted by `4-0`. Before a later slice changes a durable contract, it must promote only the
claim it has made true, with the following additional thresholds:

| Candidate change | Additional evidence before promotion |
| --- | --- |
| OAuth return origin, CORS, cookie or callback contract | An Impact Handshake names the deployed origin set, browser/provider callback topology, invariant URLs/cookies and a hostile-origin proof. |
| Session truth or authenticated-role rule | Browser and Backend agree on active-user validation, token rotation and anonymous recovery; a System journey proves the chosen behavior. |
| Pending-command semantics | The 4-4 packet records the conservative at-most-once continuation decision, its exact command set and either a faithful escalation journey or a recorded harness limitation plus strongest lower proof, without making PR create replayable. |
| Compatibility retirement | Every producer/consumer is inventoried, the replacement has focused and cross-unit proof, and the compatibility window has a removal condition. |

Task-local inventories, import graphs, raw route traces, and test counts remain under this workspace.

## 4-1 Promotion Reconciliation

`4-1` met the narrower CORS/return-target threshold with an Impact Handshake, hostile-origin API/route proof,
focused Web boundary proof and selected System entry proof. It promotes only the configuration-derived authority to
the Product TDD, Backend runtime, and OAuth handoff Unit TDD documents. It does **not** promote callback/provider
topology or claim post-rollout behavior before the scheduled state-free header observation.

## 4-2 Promotion Result

Focused Backend/Web proof and the Browser-to-Backend continuity scenario agreed. `4-2` promoted the compact public
session ownership rule to `docs/20-product-tdd/cross-unit-contracts.md`: public roles, persisted active-user
validation, User/Auth/Web ownership, anonymous UUID recovery, bounded bootstrap recovery, token projection, and
operator-session separation. OAuth callback/handoff topology and operator bearer revalidation remain `4-3`/later
owners and are not promoted here.

## 4-3 Promotion Result

4-3 promoted only the handoff failure rule that focused Backend/Web proof made true: a received terminal handoff
result closes the one-shot nonce and must not offer same-nonce retry; transport uncertainty retains the nonce for
retry. The canonical navigation path remains nonce-only, credentialed, and token-free, while expected OAuth
failure responses suppress token projection.

The durable owner is `docs/30-unit-tdd/wechat-oauth-handoff.md`. No production callback host, cookie-attribute
observation, provider-console setting, or legacy-consumer retirement was promoted; all remain external 4-3.4
evidence requirements.

## 4-4 Promotion Candidate

If its focused and Browser-to-Backend proof agree, 4-4 may promote only these stable technical truths:

- `docs/20-product-tdd/cross-unit-contracts.md`: RPC transport reports an authenticated-required response; a Web
  process owns the OAuth escalation decision, and a command may record its own continuation before it claims that
  escalation.
- `docs/20-product-tdd/pr-lifecycle-contracts.md`: the named PR continuation set, at-most-once behavior, and the
  explicit no-create-replay rule.
- `docs/30-unit-tdd/wechat-oauth-handoff.md`: API-command OAuth continuation ordering, without changing callback,
  cookie, origin, or provider-topology truth.

It must not promote a route auto-login decision, a legacy-facade retirement, provider-console fact, or a claim of
cross-origin production fidelity. Those remain 4-5 and 4-3.4 work respectively.

## 4-4 Promotion Result

4-4 met the bounded threshold through focused Web protocol proof, the existing Backend mock OAuth/handoff scenario,
and an explicit System-harness host/cookie limitation record. It promoted only response-to-process escalation,
command-owned at-most-once PR continuity, and post-handoff continuation ordering. It does not claim a passing
Browser-to-Backend continuation journey, route auto-login policy, legacy facade retirement, provider-console state,
or cross-origin production fidelity.

## 4-5 Promotion Result

4-5 promoted Sir's explicit `/bills` route-entry OAuth promise to the PRD, and the one-app-bootstrap guard plus
explicit-meta rule to the Web architecture and OAuth Unit TDD. Focused guard proof establishes bootstrap ordering,
handoff deferral, environment/attempt branches, target return URL, and stopped navigation; it does not claim a
cross-origin browser callback result.

The two deleted Backend facades are local-private retirement facts, recorded in the 4-5 packet rather than as a
durable deployment guarantee. Source/CI/script/entrypoint/export/bundle inventory, targeted OAuth regression,
type/build, and dead-code baseline agree. External old checkouts or artifacts remain unobservable and are not
claimed retired.

## Phase-Completion Review Result

The completion repair makes the explicit-meta ownership rule fully durable: a router-entry process that awaits a
lifecycle precondition must revalidate its navigation epoch before it writes browser continuity state or redirects.
That rule is promoted to `apps/web/src/ARCHITECTURE.md` and the OAuth Unit TDD after focused and full-Web proof.

The active OAuth provider-session boundary now normalises and rejects blank `openid` before callback persistence
paths; the matching provider-identity rule is promoted to the OAuth Unit TDD after focused and full-Backend proof.
Forwarded host/proto and anonymous-cookie `Secure` observations remain topology hypotheses; no durable runtime rule
changes without control-plane or deployed evidence.
