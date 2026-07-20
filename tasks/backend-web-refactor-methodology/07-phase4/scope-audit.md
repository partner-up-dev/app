# Phase 4 Scope Audit

## Entry Snapshot

- HEAD: `6d256b0f21a8ba0f25fc898696420175d047813d` (`ref(phase3): complete PR owner convergence`).
- Program state: Phase 3 complete; 4-0 exploration and narrow 4-1 origin/return-target containment are complete
  locally. 4-2 public session/identity authority is also complete locally with durable promotion. Sir authorized 4-3
  on 2026-07-18; its local semantic work is now active while callback/provider topology stays evidence-gated.
- Initial mode was `Explore` under the Constraint route. `4-1` entered `Execute` only after its handshake,
  rehearsal and low-cost verification plan were prepared.

## 4-1 Owned Paths

`4-1` owns its named Backend origin/return-target source and tests, its task-local packet/evidence, and the exact
durable-contract promotion. It does not own callback, cookie, handoff, provider, Web compatibility, schema or
session-role paths.

## 4-1 Explicit Non-Goals

- No mutation outside the narrow credentialed CORS and OAuth `returnTo` authority boundary.
- No callback URL, cookie, handoff body, JWT claim, frontend callback route, schema, provider behavior or
  session-role change.
- No decision to introduce a generic auth/pending-action service merely because a graph contains a cycle.
- No durable-doc promotion until a claim survives evidence and enters `Solidify`.

## 4-2 Owned Paths And Non-Goals

`4-2` owns the public User identity query, public middleware/session issuance, narrow direct public issuance seams,
public Web storage/store/bootstrap projection, focused backend/Web proof, one root system scenario, its poly-file
task packet, and the compact session-contract promotion. It does not own admin bearer validation, schema changes,
provider configuration, OAuth callback/handoff topology, pending-command replay, telemetry anonymous ID, or the
protected root/toolchain work.

## 4-0 Exit Audit

- `4-0` stayed within `tasks/backend-web-refactor-methodology/07-phase4/`; it did not edit source, tests,
  configuration, durable docs, or the protected shared paths.
- The evidence set is complete enough to design a bounded next slice. Public no-cookie probes now confirm
  credentialed CORS reflection; the complete return-path/callback/cookie consequence remains a high-impact
  inference. `4-1` now deliberately preserves callback/cookie topology and is solidified around CORS/return-target
  containment; callback control-plane confirmation is deferred to `4-3`.
- Phase 4 remains in planning (`Solidify`) after exploration. No later slice is implicitly authorized by this exit.

## 4-1 Execution Audit

- The source change is limited to configuration-derived CORS/return-target authority plus focused tests. The
  callback, cookie and handoff source sections are untouched, and no Web source changed.
- Durable promotion records the generative authority rule, not time-sensitive environment values or callback
  topology. The post-rollout anonymous preflight remains an explicit exit observation.
- Protected shared root/toolchain paths remain outside this slice and are not staged or validated as its output.

## 4-2 Execution Audit

- The source change is limited to public persisted identity classification, public bearer resolution/issuance,
  anonymous UUID recovery, Web public projection/bootstrap, and the minimal test-infrastructure action required by
  the root-owned Browser-to-Backend scenario. Admin middleware retains its own resolver.
- No OAuth navigation redirect, handoff cookie/nonce, provider configuration, pending-command behavior, schema, or
  telemetry identity path changed. Direct PR/OAuth issuers were narrowed only to obey the public-role boundary.
- Focused backend/Web proof, browser continuity proof, type/lint/build gates and diff hygiene passed. The resulting
  generative rule was promoted to `docs/20-product-tdd/cross-unit-contracts.md`.
- Protected shared root/toolchain paths remain outside this slice and are not staged or validated as its output. The
  operator navigation-handoff 500 observation is recorded as 4-3 input rather than repaired incidentally.

## 4-3 Entry Audit

- 4-3 owns only the OAuth callback/handoff boundary, its direct-callback compatibility consumer, focused proof, and
  the exact OAuth handoff durable truth. It does not own CORS authority, provider-console settings, deployment
  variables, route auto-login policy, pending-command replay, schema, or the protected root/toolchain work.
- Entry evidence distinguishes a desired security invariant from the defect: rejecting a non-public operator from a
  public session is correct; reaching a generic navigation-handoff 500 after a nonce is consumed is not a useful
  terminal contract.
- The existing proxy-backed System harness cannot honestly prove distinct Web/API cookie behavior. No 4-3 proof may
  copy cookies, collapse origins, or call a proxy result a production-topology result.
- The low-cost verification order is Backend response/cookie proof, Web response-classification proof, then a
  Browser journey only if its origin model is made faithful. Provider/edge evidence is recorded separately.

## 4-3 Execution Audit

- The source change stayed within OAuth callback/handoff, the direct callback compatibility page, narrow Web
  process tests, focused Backend scenario proof, and the OAuth handoff Unit TDD. It did not alter CORS authority,
  callback URL construction, cookie flags, provider configuration, schema, route auto-login policy, pending-command
  replay, or protected toolchain paths.
- A focused scenario exposed that an async direct callback rejection could bypass the route-local adapter and reach
  the global error handler. The bounded fix awaits the branch inside the callback try/catch and explicitly suppresses
  middleware token projection for expected OAuth failures; it does not widen public-session authority.
- Backend/Web focused tests, root type/lint/build gates, formatting, and diff whitespace checks passed. The System
  proxy remains an explicitly insufficient proof for distinct-origin cookies; no source workaround was introduced.
- Provider-console, edge, deployed redirect, and legacy consumer facts remain under 4-3.4 and are not inferred or
  promoted into durable deployment truth.

## 4-4 Entry Audit

- 4-4 owns the Web-only `AUTHENTICATED_REQUIRED` escalation seam, the pending WeChat action protocol, the existing
  PR continuation adapters, focused proof, and one mocked-OAuth Browser-to-Backend journey. It does not own
  backend identity rules, callback/handoff cookies, provider configuration, route auto-login policy, schema, or
  the protected root/toolchain work.
- The observed defect is an ownership/timing ambiguity, not a reason to change product authorization: `authFetch`
  schedules OAuth before command code has durably recorded its continuation, and command code may schedule it a
  second time. Existing delayed navigation happens to make the intended ordering likely, but no contract proves it.
- The chosen compatibility posture is conservative. A response-bound fallback preserves OAuth escalation for
  protected commands not yet command-owned; the five existing PR continuation kinds persist first and then claim
  that fallback. A pending entry is consumed immediately before its handler and is not auto-reinserted after
  handler failure. PR creation, and every command not explicitly in the protocol, remain no-replay.
- `PR_WAITLIST` carries its existing reminder opt-in with the continuation so UI resumption does not silently change
  the user's chosen request input. It resumes the UI/gate rather than automatically issuing the waitlist write.

## 4-4 Execution Audit

- Source ownership stayed within the Web transport/process seam, pure auth response classifier, existing PR command
  adapters/handlers, focused tests, 4-4 packet, and exactly three named durable contracts. It did not change Backend
  authorization, OAuth URLs, cookie/nonce behavior, provider configuration, route auto-login policy, schema, or
  protected root/toolchain work.
- The implementation makes `lib/rpc` report a concrete recognized response to an app-wired auth process. A command
  persists its own typed continuation before it claims that response; a response-bound fallback preserves OAuth for
  non-replay commands. Weak response collections retain no completed-response registry.
- Focused Web proof (20 tests), Backend mock-handoff proof (3 tests), root type/lint/build, and diff hygiene pass.
  The scenario attempt reached Backend mock OAuth but stopped at the System harness's `127.0.0.1`/`localhost`
  cookie-host mismatch. No cookie/origin workaround was retained; the condition is recorded for a future harness
  owner.
- Durable promotion is limited to response/process ownership, named PR continuation semantics, and continuation
  ordering. Route auto-login and legacy facade retirement remain 4-5 conditional work.

## 4-5 Execution Audit

- Source ownership stayed within the Web app-bootstrap/router-entry process, its focused proof, two unused private
  Backend facades, the 4-5 poly-file packet, and the exact PRD/Web/OAuth durable rules. No page, Commerce query,
  callback/cookie/provider, schema, root toolchain, or protected independent path changed as 4-5 output.
- The `/bills` route declaration remains the only `wechatAutoLoginPolicy: "route"` opt-in. The guard waits for
  bootstrap, defers a pending handoff to the existing handoff gate, stops anonymous WeChat navigation only while it
  begins the existing OAuth single flight, and lets non-WeChat, non-opt-in, authenticated, and already-attempted
  branches continue.
- The deleted facades had zero local source/script/test/CI/FC/package-export/bundle consumers; Backend type/build,
  focused OAuth regressions, and the dead-code report agree. No claim is made about an unrepresented external old
  checkout or artifact.
- The initial 4-5 focused Web proof (6 tests), full Web unit proof (57 files / 193 tests), targeted Backend OAuth
  proof (4 unit and 3 scenario tests), type/lint/build, scoped source formatting, and diff hygiene pass. The
  completion review supersedes its route-guard proof/counts where needed. Full-repository format still reports 22
  pre-existing unrelated files and is not reclassified as a 4-5 defect. The known 4-1 rollout observation and 4-3.4
  provider/topology evidence remain open.

## Phase-Completion Review (2026-07-20)

- A fresh review found a confirmed P1 in the 4-5 route-entry guard: it awaits bootstrap and then unconditionally uses
  the closed-over target route. Vue Router cancels a superseded navigation but does not abort that Promise, so an old
  `/bills` guard can still mark an attempt and trigger OAuth after the user has moved elsewhere. The repair needs a
  navigation epoch/current-attempt check *after* the await and focused delayed-bootstrap/different-target proof.
- A fresh review found a confirmed P2 at the OAuth provider boundary: `WeChatOAuthService` accepts a whitespace-only
  `openid`, while the current callback login/upgrade branches can use it in lookup and persistence. The retired
  `WeChatLoginService` had trimmed and rejected this value. The repair belongs at the active provider-session boundary,
  with focused malformed-provider proof; it does not restore the facade.
- The completion review also re-observed two topology-dependent risks without claiming them as deployed facts:
  forwarded host/proto must be trusted/sanitised when callback URL fallback is used, and anonymous-cookie `Secure`
  derivation differs from the OAuth helper under TLS termination. These remain 4-3.4 / 4-1 external evidence, not
  incidental local changes.
- Full Backend unit proof passes when its pre-existing `DATABASE_URL` prerequisite is supplied (84 files / 379 tests);
  the ordinary root command otherwise has one unrelated import-time environment failure. Backend scenarios pass
  (24 files / 87 tests), as do type, lint, build, Web unit, and diff-whitespace gates.

## Completion-Repair Exit Audit

- The route repair adds one early `beforeEach` navigation epoch and one post-bootstrap check inside the existing
  router-entry process. A superseded attempt becomes inert before route-attempt storage or OAuth can run; it does not
  add page-local redirects, new route opt-ins, or callback/cookie changes.
- The provider repair adds one `openid` normalisation boundary in the active integration service. All callback
  login/bind/upgrade/create branches continue to consume that session result, so no retired facade or duplicate
  controller validation is reintroduced.
- Focused route and provider tests, Web unit (57 files / 194 tests), Backend unit with its test prerequisite
  (85 files / 383 tests), Backend scenarios (24 files / 87 tests), root type/lint/build, scoped source formatting,
  and diff hygiene pass. Independent cross-review found no remaining blocker.
- The durable OAuth and Web-process rules are promoted. The 4-1 and 4-3.4 external evidence branches and the 4-4
  System canonical-host limitation remain explicit non-closures rather than being silently consumed by this repair.
