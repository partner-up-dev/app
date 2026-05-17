# Cross-Domain Interactions

## 1. PartnerRequest Core x Identity And Session

- PR revisit and anonymous continuity use UUID-backed anonymous sessions.
- PR actions that require stronger identity guarantees depend on authenticated session plus WeChat binding.
- Identity is not an independent endpoint. It exists to support the collaboration path.

## 2. PartnerRequest Core x Partner Lifecycle And Capability

- Whether a PR can still be joined, whether it has formed, whether it is full, and whether confirmation is required all depend on participation and reliability rules.
- Participant-slot state feeds back into current count, availability, and downstream action semantics.

## 3. Event And Anchor Context x PartnerRequest Core

- Anchor Event provides event-context discovery and frontend assisted-create entry for `PR`.
- The Anchor Event page shows discoverable `PR` records under the same activity type, grouped by PR-owned time windows.
- `PR` keeps its durable collaboration facts inside PR state after creation.
- `PR` creation also exists outside Anchor Event context through home-led natural-language entry.

## 4. Distribution And Attribution x PartnerRequest Core

- Sharing turns a PR into a distributable object.
- `spm` attribution carries source context back into downstream behavior.
- Re-entry is a necessary part of the distribution loop.

## 5. Participation And Reliability x Distribution And Attribution

- Sharing may drive participation, but the reliability loop is what turns successful distribution into real collaboration.
- Notifications, confirmation, and check-in convert "someone came in" into "the collaboration actually happened".

## 6. Support And Operations x All Other Boundaries

- Support, author feedback, beta-group access, configuration, and operator capability can all affect whether the user can complete the collaboration path.
- These are not always the primary user path, but they matter materially during cold start and service continuity.
