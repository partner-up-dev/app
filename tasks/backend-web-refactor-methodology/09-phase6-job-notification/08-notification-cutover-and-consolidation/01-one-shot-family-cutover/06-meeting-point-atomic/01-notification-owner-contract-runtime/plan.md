# `6-3.1f-01` Plan

1. Extend the business payload and generic task union with source event UUID,
   description and timestamp. Keep aggregate and causation metadata separate.
2. Add the private ONCE_PER_CAUSE task policy. Its creation key includes
   template, channel, recipient, PR and source event UUID, so distinct updates
   never use active replacement/coalescing semantics.
3. Add dispatch context and prepared rendering that use task description/time,
   but query current user/OpenID/option/active membership. Add the
   preference-preserving meeting-point credit repository primitive.
4. Add the explicit prepared WeChat branch before the generic adapter's
   waitlist fallback, then prove configured, unconfigured and 43101 outcomes.

## Focused Proof

- Two requests at the same clock time but with different event IDs create two
  distinct keys/tasks.
- A prepared task sends the provider's existing phrase/thing/time fields
  exactly from its immutable payload.
- Participant exit, opt-out, missing OpenID, zero credit and inactive user
  skip before provider I/O or credit consumption.
- Accepted send preserves preference while decrementing credit; 43101 clears
  preference and credit.
