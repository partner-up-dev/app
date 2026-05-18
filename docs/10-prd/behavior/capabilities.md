# Product Capabilities

## 1. Collaboration Creation

- create a `PR` from home exploration
- create a `PR` from inline natural-language entry
- use `/pr/new` for mixed natural-language and structured creation
- create a `PR` through a structured form where `type` accepts arbitrary input with suggestion options from known event types
- create a `PR` through a structured form where `time_window` uses a batch or free UI mode and still resolves to one PR-owned time window
- create a structured `PR` in location mode with one primary location or in route mode with an ordered route from departure to destination
- create and publish `PR` drafts
- let natural-language creation stay simple while the system may map the intent to an existing `PR.type`, map it to an existing Anchor Event type, or synthesize a new `PR.type`

## 2. Collaboration Joining And Progression

- join and exit `PR`
- prompt notification subscription immediately after successful join when reminder registration is relevant for that PR
- post and read non-realtime PR messages, including operator-authored system messages inside the same PR thread
- confirm participation when the `Partner` submodule carries confirmation rules
- submit PR check-in feedback when the attendance module is active
- submit a mounted post-event feedback questionnaire when the PR carries one
- progress status based on partner thresholds and time windows

## 3. Event-Context Collaboration

- browse Anchor Events and time-pool driven PR discovery surfaces
- enter `PR` from Anchor Event context
- keep the current event-context `PR` detail page focused on facts, participation, and persistent notification-subscription management
- show public meeting-point guidance in the PR facts card under the primary location
- show route-mode PRs with a separate Route facts row and a map/detail entry when route geometry is available
- open the PR message experience through `/pr/:id/messages`
- open the participant roster modal from the facts-card participant row
- open venue images through a clickable label row aligned with other facts-card entry rows
- open participant profile pages from clickable participant badges
- re-discover other active Anchor Events from current Anchor Event and PR context
- create `PR` from Anchor Event context through frontend assistance into unified structured creation
- create or enter route-mode `PR`s from Anchor Event context when the event-assisted place options carry `PR.route` values
- review alternative recommendations under the same Anchor Event context
- submit a new POI location application from Form Mode when the desired location is missing
- revisit the current user's submitted POI location applications

## 4. Identity And Revisit

- restore anonymous UUID continuity
- log in and bind through WeChat
- access `/me` as the personal center for profile, WeChat identity, notification management, anonymous user id continuity, and personal shortcuts
- access `/pr/mine`
- copy the current anonymous user id from the personal profile surface
- enter the current user's submitted POI location applications from `/me`
- view participant profile pages in read-only mode

## 5. Distribution And Attribution

- generate system share links
- support WeChat sharing
- generate Xiaohongshu captions and posters
- include route-mode `PR` identity in canonical share metadata and downstream sharing outputs
- carry `spm` attribution through the link chain

## 6. Notifications And Reliability

- support subscription reminders
- notify new-partner events
- notify new PR messages
- notify meeting-point updates
- model remaining send quota
- release unconfirmed slots when the `Partner` submodule carries confirmation rules

## 7. Support And Operations

- route support entrypoints through "Need Help"
- route `/contact-support` toward `/contact-author` and `/about`
- expose repository and frontend/backend commit hashes in `/about`
- let operator tooling maintain Anchor Event and POI semantics
- let operator tooling publish or reject user-submitted POI location applications
- let operator tooling upload and maintain POI gallery images, Anchor Event cover images, and event beta-group QR images
- let operator tooling select Anchor Event feedback questionnaire templates and override a PR's mounted questionnaire instance pointer
- let configuration materially shape the real user experience
