# Core PR Workflows

## 1. Create a PR from Home

1. The user lands on home and first understands the product through hero, value, or discovery-entry surfaces.
2. The user either expands the lightweight "start from one sentence" path or enters `/pr/new`.
3. The system interprets the natural-language intent, may map it to an existing `PR.type`, and may synthesize a new `PR.type` when no current type fits.
4. The creation flow submits the natural-language create command.
5. If the selected type's PR Authoring policy allows user creation and the user already has an authenticated account, the system creates and publishes the PR inside the same creation flow.
6. If the user is anonymous, the system creates a `DRAFT` and waits for a later authenticated publish step.
7. The publish step assigns current creator responsibility and returns a shareable, revisitable `PR`.

## 2. Create a PR Through Structured Form

1. The user enters `/pr/new` and chooses the structured form path.
2. The `type` field accepts arbitrary input and may offer suggestion options from the current PR type catalog.
3. The `time_window` field offers concrete suggestions from current type rules while retaining direct manual time entry; this is presentation only, not a persisted editor mode.
4. The user chooses one place mode for the PR. Location mode supplies one primary location. Route mode supplies an ordered `PR.route` from departure to destination, with optional waypoints.
5. The UI resolves those inputs into one PR-owned create payload with one concrete `type`, one concrete `time_window`, and one place mode.
6. The creation flow submits the structured create command. The selected type's PR Authoring policy gates user creation, and creation materializes current type defaults such as notes when the create payload has no notes, join gates, and mounted feedback questionnaire instance onto the created PR.
7. If the user already has an authenticated account, the system creates and publishes the PR inside the same creation flow.
8. If the user is anonymous, the system creates a `DRAFT` and waits for a later authenticated publish step.
9. The publish step assigns current creator responsibility and returns a shareable, revisitable `PR`.

## 3. Enter Through a Link and Join a PR

1. The user opens `/pr/:id`.
2. The user reads the request details, current count, visible status, participant list, and status-appropriate meeting-point guidance. Meeting-point guidance appears in the facts card directly under the primary location while it is visible. Route-mode PRs show Route as a separate facts row that can open route map detail. After the PR becomes `ACTIVE`, non-participant viewers see a private meeting-point placeholder while current active participants can still read the guidance. Notification subscriptions remain as a persistent section, the participant roster opens from the facts-card participant row, and venue images use the same clickable label-row entry pattern.
3. When the PR is `READY`, active participants can see a color-coded four-digit pairing code in the PR detail Utility Actions area and open a full-screen solid-color pairing-code display. The stable background color is the primary long-distance visual identifier, while the four-digit number is used for close-range confirmation. The pairing identity is a visual offline discovery aid for people at the same venue and is not an authentication, join, or attendance proof.
4. Revisit continuity uses the restored anonymous UUID session; actions that require stronger identity guarantees use authenticated session plus WeChat binding.
5. Before join, the system checks time-window conflict, state, capacity, context-specific rules, and any PR-owned join gates.
6. Join gates are rendered as one modal flow on the PR detail page. With no configured custom gate, the join flow provides the relevant fallback confirmation. With custom gates, each unresolved gate contributes one join notice agreement view.
7. If join succeeds in a PR where reminder registration is relevant and confirmation is enabled, the system immediately prompts a dedicated confirmation follow-up with the confirmation reminder subscription, confirmation importance, the confirmation window, and the slot-release consequence. The confirmation follow-up includes the confirmation deadline when known.
8. The general join-success notification-subscription follow-up focuses on new-partner reminder and meeting-point reminder recommendations, and each recommendation explains why it is useful. When confirmation is disabled for that PR, the join-success sequence starts with this general follow-up while leaving the persistent notification-subscriptions section available on the detail page for later revisit.
9. After the join-success notification follow-ups are completed, the same flow may show the official-account follow prompt when the user is eligible.
10. If join succeeds, the user enters the downstream progression of that collaboration object. When a published PR has no current creator and this join makes the user the earliest active participant, the system assigns that user as the current creator.
11. If the current PR is not the right fit, `/pr/:id` keeps a lightweight path back to `/prd` without hiding the current collaboration detail.

## 4. Revisit and History Entry

1. When the user returns, the system restores existing session continuity when possible.
2. The user can inspect and manage profile, WeChat identity, service notifications, and anonymous UUID continuity through `/me`.
3. The `/me` personal profile card keeps identity facts together: avatar, nickname, WeChat binding state or bind action, and the anonymous user id copy affordance.
4. The user can log out from `/me`; the browser clears the current user session and immediately receives a fresh anonymous UUID session for continued browsing.
5. The user can enter PR history and POI application history from two equal shortcuts under the personal profile card.
6. The user can revisit created and joined PR history through `/pr/mine`.

## 5. Share and Distribution

1. The user triggers sharing from a PR page or support-related page.
2. The system provides the available share method for that scenario, such as public link, WeChat share, or Xiaohongshu output.
3. Route-mode PRs use system-authored canonical route summary in base share metadata, while richer route wording belongs to the sharing surface that renders it.
4. Share links may carry `spm` attribution.
5. New visitors re-enter the corresponding browser route and continue the collaboration path.
