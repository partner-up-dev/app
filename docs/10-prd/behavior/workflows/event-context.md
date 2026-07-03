# Event-Context Workflows

## 1. Enter Anchor Event Context

1. The user browses `/events`, `/events/:eventId`, `/e/:eventId`, or enters `/events/search`; event-card order on these entry surfaces is system-authored display policy rather than page-owned ranking truth.
2. `/e/:eventId` is the ad-scan-first canonical Anchor Event landing entry. It may enter `FORM`, `CARD_RICH`, or `LIST` landing mode for the same event, and `/events/:eventId` forwards legacy traffic into this route.
3. `/e/:eventId` may recommend following the official account after the user has stayed for 3 seconds, gated by the shared 6-hour official-account prompt cooldown also used by Home and post-commitment follow-ups.
4. The same user should keep a stable landing mode for the same event until the operator applies a new landing revision for that event.
5. If the landing mode cannot be resolved in time, `/e/:eventId` still enters a usable `LIST` fallback experience.

## 2. Use Form Mode Recommendation

1. In `FORM` mode, the user selects one place option, one start time, and optional preferences before the system reveals candidate `PR`s. Location-pool events present POI/location choices; route-pool events present route choices with route geometry. For route-pool events, the Place Control can reverse the current route locally; the reversed route may not exist as a route-pool entry, and the active concrete route controls the rendered map, route description, recommendation request, and any created `PR.route`. The event-owned PR time-window editor default mode controls whether assisted-create time editing initially opens in normal, fuzzy, or advanced mode when no time has already been selected. When the selected start time inherits event-authored time-window description copy from its start rule, the time control surfaces that copy under the picker.
2. When the user selects a fuzzy Form Mode time such as all-day or a part of day, fallback PR creation uses that fuzzy window as the PR's initial time window and may keep the same range as the PR's READY-after narrowing policy.
3. Form Mode preferences come from the event-specific preset tag pool plus the current visitor's session-local custom labels; the same derived category is mutually exclusive while uncategorized labels can coexist.
4. Form Mode submission stays inside `/e/:eventId`; the route-level state machine keeps the selected location, start time, and preference labels through recommendation and result handling.
5. If the desired location is absent, the Form Mode location control provides a location-application entry. The application creates a pending `POI` with the submitted name and image, independent of any one Anchor Event.
6. Form Mode submission returns one system-authored matched recommendation plus an ordered candidate list.
7. If Form Mode has no matched recommendation and has ordered candidates, the page shows the inline no-match result with candidate actions. When the Anchor Event PR creation policy allows user creation, the same selected conditions can feed the create fallback action `都不合适，帮我找`.
8. If Form Mode has no matched recommendation, zero ordered candidates, and a user-creation-enabled event policy, the page directly creates a system-owned `OPEN` `PR` from the selected conditions after the long-press completes, then opens the created `/pr/:id` without assigning the viewer as creator at creation time. With an admin-only creation policy, the page stays in the no-match result state and keeps browsing exits available.
9. Joining a recommended candidate from Form Mode uses the same PR join flow as canonical PR detail; successful joins continue into canonical `/pr/:id` while preserving event-context handoff continuity.

## 3. Browse List, Card, And Search Results

1. In `/events/search`, the user chooses one active `Anchor Event` and one or more available local dates before seeing matching `PR` results.
2. Search results follow the chosen Anchor Event's `PR.type` resolution and time-pool rules; result cards identify candidate PRs by time, location, visible status, and participant count rather than repeating event-side context.
3. If the search has exactly one result, the system may route directly to `/pr/:id`; otherwise, the user chooses one result from the list.
4. The user enters an existing `PR` from event card or search-result context. `/events/:eventId?mode=card|list` forwards to `/e/:eventId` with the same explicit route mode, and `/e/:eventId` exposes a footer-top `LIST` / `CARD_RICH` / `FORM` mode switch that writes the route mode. In card mode, the active demand card itself is also a detail-entry affordance, so tapping it should resolve to the same detail intent as the rightward action. In list mode, top-level tabs aggregate by local date while still preserving time-window grouping and location context inside the selected date panel; dates before the current product-local date are expired dates, the expired tab set keeps at most the latest three dates that contain `CLOSED` PRs, expired date panels show `CLOSED` rows, and current or future date panels hide `EXPIRED` rows. Card-mode drag feedback should reveal directional skip versus detail cues in exposed stage space and keep the card body unobscured by opaque action stamps.

## 4. Materialize A Dummy PR

1. List and Card browsing may include browser-generated dummy PR opportunities. A dummy PR is not a persisted PR and is not an automatic full-PR expansion sibling.
2. A dummy PR uses the same preview-card appearance and detail intent as a real PR browse item.
3. When the user chooses "查看详情", the page materializes the dummy through the Anchor Event system-owned dummy PR endpoint and then opens the PR detail.
4. Dummy materialization must not make the viewer the creator, auto-join the viewer, or run viewer PR time-window conflict checks.
5. Dummy PRs are derived from future event create windows, enabled place options, and the published preset preference tag pool. Dummy preference combinations are bounded to no tag plus one published tag.
6. Generation excludes real-PR conflicts by time and place, avoids duplicate dummy time-place pairs, prefers staggered start times, and shows at most three dummy PRs across one or two product-local dates.

## 5. Create A PR From Event Context

1. The Anchor Event landing page exposes that event's beta-group entry as an independent card. List mode defaults the card to a collapsed summary; card mode defaults it to an expanded state with the QR code. The group is for event-specific support such as requesting new sessions and coordinating Anchor Event context.
2. If the current local date, suggested time, or selected place needs a new PR and the Anchor Event PR creation policy allows user creation, the user can create one through the controlled event landing flow. Card and list creation pickers use the same event-owned PR time-window editor default mode as Form Mode, and include event-authored time-window description copy in each described time option.
3. The event landing route resolves its assisted-create choices into the same structured PR create payload shape used by `/pr/new`. Assisted-create place options may resolve to a primary location or to `PR.route`, and the route may carry transient event referral context for browser-route continuity.
4. The event landing route submits the same structured create command used by the form path. If the user already has an authenticated account, the system creates and publishes the PR inside that same command.
5. The current Anchor Event and downstream PR detail surfaces may also expose other active Anchor Events as a secondary browsing path, so the user can pivot without leaving the event-context collaboration journey entirely.
6. The user may then join or continue browsing other visible PRs in that event context.
7. The resulting PR may continue through timing and reliability loops such as confirmation, reminders, attendance follow-up, event beta-group follow-up, and mounted post-event feedback when the corresponding modules are active.
8. If a PR carries READY-after edit policy, its current creator can use PR Editor after `READY` to adjust only those fields. If a time adjustment conflicts with participants, the editor asks for explicit confirmation before the system releases conflicted participants with a release reason.

## 6. Submit And Review A POI Location Application

1. The user enters the location-application page from the Form Mode location control.
2. The user submits one location name and one image.
3. The system creates a `PENDING` `POI`; the submitted location name becomes the POI name used for PR location matching.
4. The user can revisit submitted POI applications from the submit-success page and from the `/me` personal-center shortcut.
5. Operators review submitted POIs in the POI management surface.
6. Publishing changes the POI status to `PUBLISHED`; rejected applications remain hidden from public location reads and may carry a rejection reason.
7. Published POIs are available to the global POI library, but Form Mode still shows only locations referenced by the current Anchor Event location pool.
