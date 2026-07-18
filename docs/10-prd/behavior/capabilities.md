# Product Capabilities

Capabilities are grouped by the owner that a user can perceive. `PR` remains
the only durable collaboration object; type-specific configuration is consumed
by the relevant owner and never becomes a second business object.

## 1. PR Authoring

- create a `PR` from home exploration, inline natural language, or `/pr/new`
- resolve an arbitrary `PR.type` while offering suggestions from the current type catalog
- choose one PR-owned time window and one place mode (location or ordered route)
- use the `/prd` discovery flow to hand no-match criteria to ordinary PR Authoring
- create and publish PRs through the authenticated PR Authoring command, including authenticated one-step publish
- materialize type-specific defaults (notes, partner bounds, join gates, confirmation policy, and questionnaire selection) into PR-owned fields at creation time

## 2. PR Discovery

- browse the type catalog and find existing PR candidates by type, date, place, time, and preferences
- preserve `FORM`, `CARD`, and `LIST` views over one discovery/authoring contract
- use `FORM` for criteria and recommendation, `CARD` for joinable candidate grouping, and `LIST` for current/future browsing plus bounded closed history
- fall back to `LIST` when view ratios are all zero or a view decision is unavailable
- keep transient creation suggestions separate from persisted PR records in LIST and CARD
- route no-match criteria to PR Authoring without inventing a second collaboration object

## 3. PR Participation

- join, waitlist, exit, confirm, and check in to a PR
- enforce capacity, time-window conflict, join-gate, and participation-frequency rules
- transfer current creator responsibility when the earliest active participant changes

## 4. PR Coordination

- post and read non-realtime PR messages, including operator-authored system messages in the same thread
- show meeting-point guidance with participant-aware visibility
- manage reminder subscriptions, new-partner notifications, meeting-point updates, and confirmation reminders
- provide pairing identity for `READY` participants and the `STUDY_SPRINT` shared focus room

## 5. PR Completion

- submit attendance/check-in feedback and mounted post-activity questionnaires
- close or expire a PR according to participation thresholds and its time window
- retain bounded PR-attached commerce and support loops that help complete the collaboration

## 6. Identity And Revisit

- restore anonymous UUID continuity and escalate to WeChat authentication when an action requires it
- access `/me`, `/pr/mine`, profile pages, submitted POI applications, and revisitable public PR links

## 7. Distribution And Support

- generate public share links, WeChat shares, Xiaohongshu captions/posters, and carry `spm` attribution
- route "Need Help" to support, author feedback, and about-page paths
- let operators maintain PR type discovery/authoring policy, POI semantics, questionnaire templates, moderation, analytics, and other precise support surfaces
