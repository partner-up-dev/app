# `6-3.2b-3` Implementation Topology

## Dependency Graph

```text
participant removal (01)
  -> terminal current-roster release and terminal source/dispatch fences (02)
  -> admin tombstone / root delete (03)
  -> lifecycle matrix and durable promotion (05)

subscription controller / generic 43101 proof (04)
  -> lifecycle matrix and durable promotion (05)
```

`01` is deliberately first: a later operation can enumerate only the current
roster, so a former recipient's window has to be invalidated at the moment the
membership is removed.

## Source Topology

| Source fact | Current owner path | b3 hand-off | Required outcome |
| --- | --- | --- | --- |
| self exit | `pr/commands/exit-pr.ts` | PR transaction → Notification exact recipient scope | departing recipient's held window released |
| admin release | `admin-pr-management/use-cases/commands.ts` | named PR transaction → same semantic scope | same |
| unconfirmed timeout | `pr/temporal-refresh.ts` | named PR transaction → same semantic scope | same |
| content conflict | `pr/adapters/pr-content-meeting-point-transaction.ts` | existing PR transaction → same semantic scope | same |
| terminal state | `update-pr-status.ts`, temporal refresh | PR transaction → current roster scope | release all and block attention |
| admin message delete | `admin-pr-management/use-cases/messages.ts` | named PR transaction → recipient scope | tombstone + release atomically |
| admin root delete | `admin-pr-management/use-cases/commands.ts` | lock/capture before cascade → current roster scope | release all captured windows |
| subscription HTTP | `controllers/wechat.controller.ts` | Notification public command | option mutation + recipient release |
| provider `43101` | Notification runtime | same Notification command | identical clear/release semantics |

## Lock And Ownership Protocol

For a PR lifecycle mutation:

1. PR locks the request row.
2. PR locks/selects the relevant active slot(s) in deterministic order.
3. PR changes its own membership/status/message fact.
4. Notification's transaction-bound port maps only `{ prId, recipientUserId }`
   to its private creation identity and requests Job release.
5. The transaction commits or rolls back as one source fact plus reservation
   transition.

For a preference/provider mutation:

1. Notification locks the user option row.
2. It changes preference/credit and asks Job to release its private
   recipient-prefix identity.
3. It commits; it does not call PR.

Job receives no event reason, PR ID, or provider error code. PR never imports a
Job writer or creation-key policy.

## Terminal Policy

`CLOSED` and `EXPIRED` are attention-terminal, not message-visibility-terminal:

- source persistence may retain existing operator/system/message compatibility;
- source scheduling must not open a new `pr.message-summary` window;
- a job created before the transition must skip at dispatch with `PR_TERMINAL`;
- terminal transition invalidates the held current-recipient windows in its
  transaction.

## Compatibility Boundary

The old concrete message notification handler remains registered solely to
drain historical concrete jobs through `6-3.3`. The b3 source audit asks a
narrower question: no *new* lifecycle route may write inbox, wave,
opportunity, delivery, or the concrete PR-message job type.
