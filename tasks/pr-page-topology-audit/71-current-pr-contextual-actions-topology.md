# Current PRContextualActions Topology

Status: current-code reading for the next design discussion.

## Capability Inventory

`PRContextualActions.vue` currently carries seven capability groups:

1. Contextual visibility and notice projection
   - section visibility
   - released-slot notice
   - primary blocked message
   - waitlist rank / waitlisted notice
   - exit blocked tip
   - confirm and check-in time-window tips

2. Primary participation action projection
   - viewer state classification
   - `JOIN`
   - `WAITLIST`
   - `CONFIRM`
   - `CHECKIN_ATTENDED`
   - button labels, pending labels, tone, disabled, pending, tips, test ids

3. Join and waitlist flow hosting
   - mounts `PRJoinFlow`
   - mounts `PRWaitlistFlow`
   - bridges their scoped-slot `open`, `pending`, `disabled`, `joined`, and `errorMessage` into the contextual action area
   - passes route context into the flows

4. Participant secondary commands
   - exit request and confirmation dialog
   - cancel waitlist request and confirmation dialog
   - domain errors for both commands

5. Attendance and feedback commands
   - confirm slot
   - check in
   - open feedback questionnaire after check-in when pending
   - retry pending feedback questionnaire
   - submit feedback questionnaire

6. Telemetry
   - primary CTA impression tracking
   - primary CTA click tracking
   - viewer-state payload derivation
   - action-key to telemetry-type mapping

7. Pending WeChat replay endpoint
   - exposes `replayPendingAction(kind)`
   - replays `PR_JOIN`
   - replays `PR_WAITLIST`
   - replays `PR_EXIT`
   - replays `PR_CONFIRM`

## Inputs And Outputs

Inputs from `PRPage.vue`:

- `prId`
- `pr`
- `routeEventId`
- `joinEntrySurface`
- `confirmationDeadlineAt`
- `supportsEventContextFeatures`

Output to `PRPage.vue`:

- `action-success`

Exposed method consumed by `PRPage.vue`:

- `replayPendingAction(kind)`

## Direct Child Topology

```mermaid
flowchart TD
  PRPage["PRPage.vue"] --> Contextual["PRContextualActions.vue"]

  Contextual --> Button["Button\nshared/ui/actions"]
  Contextual --> InlineNotice["InlineNotice\nshared/ui/feedback"]
  Contextual --> ExitConfirm["ConfirmDialog\nexit"]
  Contextual --> CancelConfirm["ConfirmDialog\ncancel waitlist"]
  Contextual --> FeedbackModal["PRFeedbackQuestionnaireModal"]

  Contextual --> JoinFlow["PRJoinFlow"]
  Contextual --> WaitlistFlow["PRWaitlistFlow"]

  JoinFlow --> JoinGatesA["PRJoinGates"]
  JoinFlow --> JoinFallback["PRJoinFallbackConfirmGate"]
  JoinFlow --> JoinSuccessModal["join success modal"]
  JoinSuccessModal --> JoinSubscriptions["APRNotificationSubscriptions"]
  JoinSuccessModal --> JoinCommunity["PRJoinCommunityFollowupPanel"]
  JoinCommunity --> OfficialAccountA["official-account follow prompt state"]

  WaitlistFlow --> JoinGatesB["PRJoinGates"]
  WaitlistFlow --> WaitlistFallback["PRWaitlistFallbackConfirmGate"]
  WaitlistFlow --> WaitlistSuccessModal["waitlist success modal"]
  WaitlistSuccessModal --> WaitlistSubscriptions["APRNotificationSubscriptions"]
  WaitlistSuccessModal --> OfficialAccountB["OfficialAccountFollowPanel"]
```

## Use-Case And Query Topology

```mermaid
flowchart TD
  Contextual["PRContextualActions.vue"]

  Contextual --> SharedActions["useSharedPRActions"]
  SharedActions --> ExitPR["useExitPR"]
  SharedActions --> JoinPRUnusedHere["useJoinPR\ncreated by shared hook"]
  SharedActions --> SharedTelemetry["pr_exit_success / pr_join_result"]

  Contextual --> AttendanceActions["usePRAttendanceActions"]
  AttendanceActions --> ConfirmSlot["useConfirmPRSlot"]
  AttendanceActions --> CheckInSlot["useCheckInPRSlot"]
  AttendanceActions --> AttendanceTelemetry["pr_confirm_success / pr_checkin_submitted"]

  Contextual --> CancelWaitlist["useCancelWaitlistPR"]
  Contextual --> SubmitFeedback["useSubmitFeedbackQuestionnaire"]
  Contextual --> PrimaryTelemetry["pr_primary_cta_impression\npr_primary_cta_click"]

  Contextual --> JoinFlow["PRJoinFlow"]
  JoinFlow --> JoinPR["useJoinPR"]
  JoinFlow --> PromptDetail["usePRDetail\nfor success prompt"]

  Contextual --> WaitlistFlow["PRWaitlistFlow"]
  WaitlistFlow --> WaitlistPR["useWaitlistPR"]
```

## State Topology

```mermaid
flowchart TD
  PRDetail["props.pr: PRDetailView"] --> Viewer["partnerSection.viewer"]
  Viewer --> ViewerState["viewerState"]
  Viewer --> DockActions["dockActions"]
  Viewer --> Notices["release / blocked / waitlist notices"]
  Viewer --> SecondaryVisibility["exit / cancel-waitlist visibility"]
  Viewer --> FeedbackVisibility["feedback retry visibility"]

  DockActions --> PrimaryDock["primaryDockAction"]
  PrimaryDock --> JoinDock["joinDockAction"]
  PrimaryDock --> NonJoinDock["nonJoinPrimaryDockAction"]

  JoinDock --> JoinFlowButton["JOIN / WAITLIST button slot"]
  NonJoinDock --> DirectPrimaryButton["CONFIRM / CHECKIN button"]
  SecondaryVisibility --> ExitButton["exit button"]
  SecondaryVisibility --> CancelWaitlistButton["cancel waitlist button"]
  FeedbackVisibility --> FeedbackButton["feedback retry button"]

  LocalRefs["local refs"] --> Modals["exit confirm / cancel waitlist confirm / feedback modal"]
  Modals --> BodyScrollLock["useBodyScrollLock"]
```

## Replay Topology

```mermaid
flowchart TD
  PendingStore["pending WeChat action store"] --> PRPageReplay["PRPage.attemptPendingWeChatActionReplay"]
  PRPageReplay --> ContextualExpose["PRContextualActions.replayPendingAction"]

  ContextualExpose --> ReplayJoin["PR_JOIN -> openJoinFlow -> PRJoinFlow.open"]
  ContextualExpose --> ReplayWaitlist["PR_WAITLIST -> openJoinFlow -> PRWaitlistFlow.open"]
  ContextualExpose --> ReplayExit["PR_EXIT -> confirmExit -> useExitPR"]
  ContextualExpose --> ReplayConfirm["PR_CONFIRM -> handleConfirmWithBookingContact -> useConfirmPRSlot"]
```

## Observed Boundary Shape

The component is a workflow controller embedded in a section component. It owns:

- presentational rendering
- projection from `PRDetailView` to actions and notices
- action command dispatch
- local modal state
- telemetry side effects
- pending replay entrypoint
- child workflow hosting for join and waitlist

`PRJoinFlow` and `PRWaitlistFlow` already act as deeper workflow controllers. `PRContextualActions` sits above them as an umbrella controller for the full participation area.
