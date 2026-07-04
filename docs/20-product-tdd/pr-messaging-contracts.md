# PR Messaging Contracts

This file owns the cross-unit PR messaging contract for participant-authored messages, operator-authored system messages, read markers, inbox state, and notification handoff.

## 1. Message Persistence And Thread State

- Backend owns persisted `PRMessage` items and one backend-authoritative `PRMessageInboxState` per `prId + userId`.
- `PRMessage` is a PR-scoped plain-text message item inside one `PartnerRequest` thread. A message is either participant-authored or operator-authored system context, and backend owns that author and type classification.
- `PRMessageInboxState` is the cross-unit marker state used to answer two separate questions without frontend-owned inference:
  - the viewer's read marker for that PR thread
  - whether the current unread message wave has already consumed one `PR_MESSAGE` notification opportunity for that recipient
- The frontend message rollout is PR-generic. The system should keep message entities, notification naming, and persistence semantics aligned with the single PR vocabulary.

## 2. Route And API Contract

- Frontend page placement is route-based: `/pr/:id` is the handoff and detail page, and `/pr/:id/messages` is the dedicated message page.
- Canonical route and API shape converge on the PR family:
  - `GET /api/pr/:id/messages`
  - `POST /api/pr/:id/messages`
  - `POST /api/pr/:id/messages/read-marker`
- `GET /api/pr/:id/messages` returns the visible message list plus thread-level viewer state needed for UI assembly and explicit read-marker advancement. That response should be sufficient for frontend to render:
  - ordered message items
  - whether each item is participant-authored or a system message
  - whether the current viewer can post
  - the latest visible message marker
  - the viewer's current read marker or an equivalent unread summary
- `POST /api/pr/:id/messages` accepts one plain-text message payload from an authenticated active participant, persists the new message, and returns the created item plus refreshed thread viewer state.
- `POST /api/admin/prs/:id/messages` accepts one plain-text message payload from admin-authenticated tooling, persists one system message for that PR, and returns the created item plus refreshed thread state for downstream admin UX refresh.
- `POST /api/pr/:id/messages/read-marker` advances the authenticated viewer's read marker idempotently after the thread is actually shown. Read-marker advancement should be explicit rather than piggybacked on list fetch, so prefetching or hidden loads do not silently clear an unread wave.

## 3. Visibility And Handoff Rules

- Message visibility and read-marker advancement reuse the same backend-owned eligibility rule: only current active participants may see or act on the thread.
- Participant-authored message creation uses the same active-participant rule.
- Admin-authored system-message creation is a separate admin-only capability.
- PR message notification semantics are governed by `notification-contracts.md`, including unread-wave eligibility, delayed summary dispatch, durable opportunity and wave records, and dispatch-time revalidation.
- Frontend owns only route and page placement, thread rendering, composer input, join-success confirmation follow-up rendering, join-success subscription prompting, combined community follow-up rendering, official-account prompt cooldown, and cache refresh behavior.
- Backend contracts own membership, unread-wave reset, and notification gating truth.
