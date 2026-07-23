# `6-2` Execution Plan

> This file preserves the executed `6-2` exemplar plan and its entry-time
> compatibility snapshot. `6-3` later closed the named handoff debt and retired
> every concrete Notification registration; present truth is owned by the
> Phase 6 root packet and durable Notification contract.

## Ordered Batches

1. **Freeze the representative behavior**
   - characterize current waitlist-promotion schedule, payload, eligibility,
     credit and provider-result paths;
   - record its caller/import and current handler/adapter seams;
   - characterize the current duplicated pre-schedule and dispatch preparation,
     provider failure collapse and best-effort post-promotion handoff.
2. **Create the public vocabulary and command**
   - add business template IDs and correlated payload schemas;
   - expose request/ack contracts from `domains/notification` while keeping ACK
     unused until `6-3`;
   - keep low-level Job creation private.
3. **Create declarative policy and binding registries**
   - derive timing/creation/dedupe from template semantics;
   - map business template + channel to private provider configuration and
     renderer;
   - fail configuration deterministically without leaking IDs;
   - preserve the explicit waitlist-alternative -> waitlist-promoted provider
     template binding.
4. **Normalize user option semantics**
   - introduce the logical limited/unlimited ADT;
   - map current non-null WeChat counters only to limited credit and avoid a
     speculative persistence migration;
   - centralize preference/credit eligibility and `43101` consequences.
5. **Build the generic handler**
   - add versioned payload parse, injected eligibility/context ports, channel
     invocation and generic disposition classification;
   - classify accepted, permanent, proven-safe retryable and ambiguous results;
   - ensure one correlated attempt signal per invocation through JobRunner;
   - remove full request-time preparation so authoritative data is loaded once
     at dispatch.
6. **Cut over `WAITLIST_PROMOTED` vertically**
   - replace the PR/application concrete scheduler edge with Notification's
     public command;
   - register/render/dispatch through `notification.send.v1`;
   - retain compatibility for pending old job types and other families;
   - record its post-transition handoff as unresolved `6-3` debt rather than
     claiming atomic/recoverable completion.
7. **Validate the dependency result**
   - prove no caller/provider-ID or PR-internals cycle;
   - run focused then backend gates and update the migration ledger for `6-3`.

## Execution Record

### 2026-07-22 — pre-mutation evidence closed

- `WAITLIST_PROMOTED` is the first vertical: the source path is
  `promoteWaitlistedPartners → applyPromotedPartnerSideEffects → legacy
  WeChat scheduler → legacy per-kind Job`.
- The new caller will supply a semantic promotion causation identity derived
  from the durable slot (`partner_request:<prId>:waitlist-promotion:<partnerId>`),
  not a dedupe key. Notification will privately use terminal-safe
  `ONCE_PER_CAUSE` creation for that identity.
- The current handler's request-time preparation duplicates its dispatch-time
  database read. The replacement request performs schema/policy work only;
  the new handler is the sole authoritative eligibility/context load.
- Current `getSubscriptionSnapshot` treats a positive count as enabled even
  when `*_opt_in` is false. The exemplar instead decodes `preferred` and
  `LIMITED(remaining)` separately and requires both. Its post-send decrement
  preserves preference; a `43101` remains an explicit preference-and-credit
  clear. Legacy-family coupling is retained until its own cutover.
- Only `43101` has a proven non-ambiguous current meaning. All other current
  provider/network/HTTP/parse failures become non-retrying ambiguous outcomes
  unless an adapter later proves safe non-application.
- Existing `wechat.notification.waitlist-promoted` registration stays live for
  pending legacy rows. New tasks use only `notification.send.v1`; they do not
  create `notification_opportunities` or `notification_deliveries`.
- A duplicate semantic `requestNotification` call coalesces to the same one
  `ONCE_PER_CAUSE` generic Job. The focused scenario proves both the returned
  `COALESCED` result and the single persisted causation row.
- The real repository transition from a final accepted credit keeps
  `wechatWaitlistPromotedOptIn=true` with `remainingCount=0`; a known `43101`
  then clears both. A runtime-owner scenario reaches those database transitions
  through real option/context adapters and a neutral fake channel.
- Failure injection immediately after promotion proves the named handoff debt:
  scheduling throws, the HTTP request is `500`, and the durable candidate slot
  is already `JOINED`. This is evidence for `6-3`, not an accepted atomicity
  substitute.
- `compatibility-ledger.md` inventories the generic registration, retained
  legacy job types and the temporary legacy ↔ PR ↔ infrastructure path. The
  migrated generic path treats non-`43101` failures as ambiguous; historical
  legacy retry behavior remains compatibility-only.

## Stop Conditions

- The public command must expose `runAt`, dedupe key or provider field to work.
- A template cannot be represented without widening payload types unsafely.
- Eligibility requires Notification core to import another domain's internals.
- The representative path changes timing/credit behavior without a product
  decision.
- A network/HTTP/parse error is classified retryable without non-application or
  idempotency evidence.
- The new handler requires a new durable Intent/Delivery owner.
