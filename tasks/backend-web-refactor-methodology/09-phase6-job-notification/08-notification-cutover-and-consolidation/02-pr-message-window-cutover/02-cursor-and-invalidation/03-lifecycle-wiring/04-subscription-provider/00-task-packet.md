# `6-3.2b-3.4` — PR-Message Subscription Controller And Provider Proof

## Status

**Complete.** The authenticated PR_MESSAGE route now delegates to the b2
canonical serialized Notification command. Its focused controller proof is
recorded in [`verification-log.md`](./verification-log.md). The generic `43101`
runtime path remains b2 behavior and joins the full matrix in b3.5.

## Objective

Make the authenticated PR_MESSAGE subscription endpoint delegate to
Notification's canonical serialized mutation command. Verify generic provider
`43101` already reaches the same command and no restore action replays old
messages.

## Exit

The controller is protocol conversion only. It neither mutates the option
repository directly nor knows generic private Job identity.
