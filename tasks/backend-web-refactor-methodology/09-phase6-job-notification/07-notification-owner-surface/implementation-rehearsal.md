# `6-2` Implementation Rehearsal

## Proposed dependency topology

```text
PR waitlist service
  -> Notification.requestNotification (public command)
    -> Notification policy + private task scheduler port
      -> JobRunner: notification.send.v1 / ONCE_PER_CAUSE
        -> Notification owner dispatch core
          -> option port + curated PR context query + neutral WeChat port
```

The public PR caller never sees a Job type, creation key, run time, provider
template ID or rendered provider fields. Composition owns the concrete port
adapters and registers the generic Job definition. The old
`wechat.notification.waitlist-promoted` definition remains registered for
existing rows.

## Execution branches

1. **Valid promoted slot / usable credit**: request creates one generic Job;
   dispatch reloads preference, credit, active slot and user channel identity;
   renders the private waitlist binding; accepted send consumes one limited
   credit and succeeds.
2. **Duplicate request for the same promoted slot**: private
   `ONCE_PER_CAUSE` creation coalesces; no second Job is inserted.
3. **Stale promotion, inactive user, missing OpenID, disabled preference or
   exhausted credit**: handler returns `SKIPPED`, without provider I/O.
4. **WeChat `43101`**: channel returns a known recipient-permission refusal;
   owner clears the waitlist preference/credit and returns non-retrying
   permanent failure.
5. **Proven safe non-application**: owner returns retryable failure and leaves
   timing to JobRunner.
6. **Unknown network/HTTP/parse/provider outcome**: owner returns a bounded
   permanent failure; it does not retry a potentially accepted effect.
7. **Accepted send followed by a lost concurrent credit decrement**: no resend
   is attempted. This preserves current send-then-consume behavior; a stronger
   credit reservation/reconciliation contract is intentionally not invented in
   this slice.
8. **Promotion commits then scheduling throws**: the promotion remains visible
   without a Job. This is the already named `6-3` handoff debt, not a false
   atomicity claim.

## Lowest-cost proof

1. Pure fake-port tests cover task parse/type correlation, policy, one
   dispatch-time load, option and provider outcome matrix.
2. One backend scenario promotes a waitlisted user, then asserts a pending
   `notification.send.v1` Job with the private causal identity and no matching
   opportunity row. Scenario setup disables request-tail execution, so this is
   deterministic and does not call a provider.
3. Focused type/lint/unit/scenario checks precede the broader backend gate.
