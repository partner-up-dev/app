# `8-7.2` Classic Use-case Sequence Review

Date: 2026-07-24

## 1. User / Auth

1. Web bootstrap restores or registers a session.
2. Auth validates the JWT and asks User once for current persistent identity.
3. Auth signs or rotates the transport token.
4. Web projects the response into session storage/store and enters anonymous
   or authenticated state.
5. For OAuth, WeChat code exchange asks User to bind/upgrade identity, creates
   the signed-cookie + nonce handoff, and Web applies the resulting session.
   `4xx` terminates the handoff; `5xx` preserves retry.

User identity, Auth token and Web session projection remain separate owners.
Representative paths: `auth/middleware.ts`, `auth.controller.ts`, User
identity queries/commands, `auth-session-bootstrap-coordinator.ts` and
`oauth-handoff.ts`.

## 2. PR Message / Notification

1. PR validates sender participation and message content.
2. The PR serialization transaction locks PR/roster and writes the message.
3. In the same transaction, PR calls a Notification semantic port.
4. Notification locks recipient option state and creates/coalesces one HELD
   generic Job.
5. After commit, Job claims the task; Notification reloads current membership,
   message, preference/credit, window and channel configuration before send.
6. After the visible thread is mounted/rendered/visible, Web sends a semantic
   acknowledgment; PR validates participant/cursor and Notification releases
   the covered private window.

The outer precheck is an optimization; the transaction recheck remains
authority. Message and held-task atomicity is proven by the PR message
scenario.

## 3. Commerce / RideHailing Fee Confirmation

1. Payment callback locates the Bill line and enters the Trade settlement
   command.
2. The named RideHailing settlement transaction follows the Trade → Ride lock
   order and reloads current binding.
3. Bill line settlement uses CAS; the first qualifying full settlement creates
   one deterministic `ONCE_PER_CAUSE` fee-confirmation Job in the same
   transaction.
4. The callback returns after commit.
5. Job later claims work, reloads current RideHailing/provider binding and
   invokes `feeConfirm` outside the business transaction and locks.
6. Job records only generic execution disposition; Bill/Order retain business
   meaning.

Bill is settlement SSoT, while Job owns execution control. Provider
lost-response duplicate-effect risk remains explicitly accepted.

## 4. Job / Notification Waitlist Exemplar

1. PR performs a cheap promotion precheck.
2. The PR transaction rechecks capacity, FIFO and candidate state under lock,
   promotes the slot and updates PR facts.
3. In the same transaction, PR asks Notification for typed generic work.
4. JobRunner claims and leases the task after commit.
5. Notification reloads PR/user/preference-credit/channel facts at dispatch
   time and invokes the channel.
6. Generic disposition drives success, retry or terminal state without
   changing the already-committed promotion.

Job does not learn waitlist business semantics; Notification owns mapping and
channel eligibility.

## 5. Analytics

1. A typed Web call site supplies the event; collector adds bounded
   journey/context attributes.
2. The in-memory bounded queue batches transport.
3. Backend's single Event Registry validates each event.
4. Accepted/rejected ledger persistence and duplicate-event idempotency occur
   at ingest.
5. PostgreSQL typed fact views feed Analytics queries.
6. Dashboard queries render the projection. Backend-confirmed telemetry is
   recorded after business commit and isolates its own failure.

Registry is the event-semantics SSoT. Ledger, facts and dashboard are
projections; telemetry cannot become business authority.

## 6. Share / Admin Entry

1. PR detail supplies canonical share metadata and revision.
2. Web Share owns route-session orchestration, asks its adapter for optional
   description/thumbnail/poster work and treats remote cache writes as
   best-effort.
3. Route session/version rejects stale completion; optional enhancement
   failure retains the canonical base descriptor.
4. For Admin entry, `/bi?code=` calls `useAdminSessionLogin`.
5. The typed login query asks User to authenticate operator credentials; Auth
   signs the operator JWT.
6. The Admin workflow applies the session once; BI entry removes the code and
   redirects, while router and Backend independently enforce role gates.

PR metadata remains Share's base fact. Admin transport, session application
and page-owned navigation remain distinct.

## Non-blocking Residual Risks

- Operator bearer does not recheck persistent User status/role on every
  request; this is a retained Phase 4 boundary.
- The post-settlement generic Ride order reload can add retry noise after the
  authoritative transaction commits, while deterministic Job creation prevents
  duplicate tasks.
- Provider lost-response fee confirmation can repeat the external effect; Sir
  accepted this contract.
- Optional Share enrichment/cache writes are not revision-atomic with base
  metadata, although the canonical base descriptor stays valid.
- Web telemetry is best-effort in-memory state and may be lost on process/page
  termination by design.

None is a Phase 8 regression or exit blocker.
