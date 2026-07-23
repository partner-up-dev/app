# External Notification Manager Reference Review

## Scope And Safety

Read-only review of `/mnt/f/CODING/Project/Anana/main`, corresponding to Sir's
approximate `f:/CODING/Project/Anana/Backend/main` reference. The external
worktree is dirty and was not modified. Historical credentials/configuration
values are intentionally not reproduced here.

## Historical `main` Shape: Central Binding Registry

Relevant evidence was read through `git show main:<path>`:

- `app/libs/weixin.py` resolves a provider template ID from a stable business
  name, maps friendly business fields to provider field names, and sends the
  resulting provider request.
- `app/data/settings/json/weixin/weixin.base.json` stores the business-name →
  provider-template and business-field → provider-field mappings.
- `app/libs/event/chat.py` and `app/libs/event/partner_application.py` select a
  business template name, provide business payload values, and delegate mapping
  plus send to the WeChat library.

The reusable idea is a centralized channel binding:

```text
(business template ID, channel type)
  → provider template reference + typed field renderer
```

Provider IDs and provider field names need not leak to the business caller.

## Later Shape: Typed Content With Channel Renderers

Relevant checked-out files:

- `communication/schemas/notification/main.py` defines abstract channel
  renderers on `NotificationContent` and a `NotificationTask` TypedDict.
- `communication/managers/notification/main.py` delegates the typed task to a
  channel manager.
- `communication/managers/notification/channel_weixin.py` resolves the user to
  an OpenID, invokes the channel renderer, fetches tokens, calls the provider,
  and logs errors.
- `main/managers/partner_request/merge.py` contains business content renderers;
  some hard-code provider template IDs.

This shape supports typed business content and a channel port, but distributing
provider IDs across business content classes is inferior to the central
binding registry. The similarly named
`communication/managers/notification/channel/weixin.py` is empty and is not
the implementation.

## What Must Not Be Copied

- `NotificationTask` is only an in-memory TypedDict, not durable scheduled work.
- `NotificationManager` only forwards synchronously; it has no retry or
  schedule lifecycle.
- The channel manager mixes identity lookup, token acquisition, provider I/O
  and error logging, and does not return a normalized outcome.
- No preference/credit, delivery-attempt ledger, dedupe, provider ambiguity, or
  JobRunner integration was found.
- Tests/import paths show historical remnants and do not prove a wired
  production call path.

## Influence On Phase 6

Adopt the business-template/channel-binding idea and typed renderer boundary.
Supply reliability from the current DB-backed JobRunner plus
`notification_deliveries`; do not revive the historical synchronous manager as
an architectural owner.
