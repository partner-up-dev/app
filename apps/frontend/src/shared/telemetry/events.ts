import type { PRStatus } from "@partner-up-dev/backend";

export type PRKind = "ANCHOR" | "COMMUNITY";

export type TelemetryActionResult = "success" | "failure" | "blocked";
export type AnchorEventTelemetryMode = "FORM" | "CARD_RICH" | "LIST";
export type PRCommitmentType = "create" | "join" | "waitlist";

export type TelemetryEventName =
  | "page_view"
  | "anchor_event_landing_viewed"
  | "anchor_event_recommendation_requested"
  | "anchor_event_recommendation_returned"
  | "anchor_event_candidate_engaged"
  | "anchor_event_assisted_create_started"
  | "anchor_event_card_stack_loaded"
  | "anchor_event_card_seen"
  | "anchor_event_card_action_taken"
  | "anchor_event_card_empty_create_started"
  | "anchor_event_list_loaded"
  | "anchor_event_list_date_selected"
  | "anchor_event_list_pr_row_seen"
  | "anchor_event_list_pr_row_action_taken"
  | "anchor_event_list_create_started"
  | "pr_entry_reached"
  | "pr_commitment_result"
  | "pr_create_result"
  | "pr_join_result"
  | "pr_waitlist_result"
  | "pr_exit_success"
  | "pr_confirm_success"
  | "pr_checkin_submitted"
  | "share_method_switch"
  | "share_link_native_success"
  | "share_link_copy_success"
  | "share_link_failed"
  | "share_session_started"
  | "share_descriptor_submitted"
  | "share_descriptor_discarded_stale"
  | "share_apply_fallback_success"
  | "share_apply_base_success"
  | "share_apply_enriched_success"
  | "share_apply_failed"
  | "share_replay_triggered"
  | "home_hero_primary_click"
  | "home_event_section_impression"
  | "home_event_card_impression"
  | "home_event_card_click"
  | "home_event_all_click"
  | "home_event_highlight_click"
  | "home_event_plaza_entry_click"
  | "home_create_entry_click"
  | "official_account_follow_nudge_shown"
  | "official_account_follow_nudge_action_click"
  | "wechat_oauth_trace"
  | "anchor_event_form_impression"
  | "anchor_event_form_started"
  | "anchor_event_form_recommendation_impression"
  | "anchor_event_recommendation_result"
  | "anchor_event_form_result_action_click"
  | "anchor_event_form_create_fallback_click"
  | "event_assisted_create_result"
  | "pr_primary_cta_impression"
  | "pr_primary_cta_click"
  | "pr_lane_expand"
  | "pr_recovery_accept"
  | "pr_secondary_action_click";

type AnalyticsContextPayload = {
  scenarioType?: string;
  activityType?: string;
  actorId?: string;
  spm?: string;
  sourceQr?: string;
  traceId?: string;
  eventIdRef?: number;
  prIdRef?: number;
  cardKey?: string;
};

type AnchorEventFunnelContextPayload = AnalyticsContextPayload & {
  eventId: number;
  assignedMode?: AnchorEventTelemetryMode;
  renderedMode?: AnchorEventTelemetryMode;
  assignmentRevision?: string;
  isTimeoutFallback?: boolean;
};

type AnchorEventPlaceTelemetryPayload = {
  locationId?: string | null;
  routePoolEntryId?: string | null;
  placeKind?: "location" | "route" | null;
  locationType?: "preset" | "user_submitted";
};

type PRContextPayload = AnalyticsContextPayload & {
  prId?: number;
  prKind?: PRKind;
};

type OfficialAccountFollowPromptSource =
  | "home"
  | "anchor_event"
  | "pr_join_result"
  | "pr_waitlist_result";

type ShareContextPayload = AnalyticsContextPayload & {
  prId?: number;
};

type ShareRoutePhase = "FALLBACK" | "BASE" | "ENRICHED";

type ShareLifecyclePayload = ShareContextPayload & {
  routeSessionId: string;
  entityKey?: string | null;
  revision?: string;
};

type ResultTelemetryPayload = {
  actionResult: TelemetryActionResult;
  failureCode?: string;
  failureReason?: string;
};

type PRCommitmentTelemetryPayload = AnchorEventFunnelContextPayload &
  ResultTelemetryPayload & {
    commitmentType: PRCommitmentType;
    prId?: number;
    entrySurface?:
      | "form_mode"
      | "form_mode_matched"
      | "form_mode_candidate"
      | "card_rich"
      | "list_mode"
      | "pr_detail";
    candidateRank?: number | null;
  };

export type TelemetryPayloadMap = {
  page_view: PRContextPayload & {
    page: string;
    routeName?: string;
  };
  anchor_event_landing_viewed: AnchorEventFunnelContextPayload;
  anchor_event_recommendation_requested: AnchorEventFunnelContextPayload & {
    startAt: string;
    timeType: "preset" | "user_submitted";
    preferenceCount: number;
  } & AnchorEventPlaceTelemetryPayload;
  anchor_event_recommendation_returned: AnchorEventFunnelContextPayload & {
    outcome: "matched" | "no_match";
    matchedPrId?: number | null;
    candidateCount: number;
    startAt: string;
    timeType: "preset" | "user_submitted";
    preferenceCount: number;
  } & AnchorEventPlaceTelemetryPayload;
  anchor_event_candidate_engaged: AnchorEventFunnelContextPayload & {
    action: "detail" | "join" | "waitlist";
    targetPrId: number;
    candidateRank?: number | null;
    entrySurface: "form_mode_matched" | "form_mode_candidate";
  };
  anchor_event_assisted_create_started: AnchorEventFunnelContextPayload & {
    trigger: "manual_fallback" | "auto_no_candidates";
    startAt: string;
    timeType: "preset" | "user_submitted";
    preferenceCount: number;
  } & AnchorEventPlaceTelemetryPayload;
  anchor_event_card_stack_loaded: AnchorEventFunnelContextPayload & {
    cardCount: number;
  };
  anchor_event_card_seen: AnchorEventFunnelContextPayload & {
    cardKey: string;
    targetPrId?: number | null;
    rank: number;
    cardCount: number;
  };
  anchor_event_card_action_taken: AnchorEventFunnelContextPayload & {
    action: "skip" | "detail";
    cardKey: string;
    targetPrId?: number | null;
    rank: number;
    preferenceCount?: number;
  };
  anchor_event_card_empty_create_started: AnchorEventFunnelContextPayload & {
    locationId?: string | null;
    routePoolEntryId?: string | null;
    placeKind?: "location" | "route" | null;
    timeWindowStart?: string | null;
  };
  anchor_event_list_loaded: AnchorEventFunnelContextPayload & {
    dateCount: number;
    visiblePrCount: number;
    currentFuturePrCount: number;
    expiredPrCount: number;
  };
  anchor_event_list_date_selected: AnchorEventFunnelContextPayload & {
    dateKey: string;
    isExpiredDate: boolean;
    visiblePrCount: number;
  };
  anchor_event_list_pr_row_seen: AnchorEventFunnelContextPayload & {
    prId: number;
    timeWindowStart?: string | null;
    locationId?: string | null;
    rowRank: number;
    dateKey: string;
  };
  anchor_event_list_pr_row_action_taken: AnchorEventFunnelContextPayload & {
    prId: number;
    rowRank: number;
    dateKey: string;
  };
  anchor_event_list_create_started: AnchorEventFunnelContextPayload & {
    dateKey?: string | null;
    locationId?: string | null;
    routePoolEntryId?: string | null;
    placeKind?: "location" | "route" | null;
    timeWindowStart?: string | null;
    preferenceCount?: number;
  };
  pr_entry_reached: AnchorEventFunnelContextPayload & {
    prId: number;
    entrySurface:
      | "form_mode"
      | "form_mode_matched"
      | "form_mode_candidate"
      | "card_rich"
      | "list_mode";
    entryType: "detail" | "join" | "waitlist" | "create_handoff";
    candidateRank?: number | null;
  };
  pr_commitment_result: PRCommitmentTelemetryPayload;
  pr_create_result: PRContextPayload &
    ResultTelemetryPayload & {
    prId: number;
    status: PRStatus;
  };
  pr_join_result: PRContextPayload &
    ResultTelemetryPayload & {
    prId: number;
    eventId?: number;
    entrySurface?: "pr_detail" | "form_mode_matched" | "form_mode_candidate";
    candidateRank?: number | null;
  };
  pr_waitlist_result: PRContextPayload &
    ResultTelemetryPayload & {
    prId: number;
    eventId?: number;
    entrySurface?: "pr_detail" | "form_mode_matched" | "form_mode_candidate";
    candidateRank?: number | null;
  };
  pr_exit_success: PRContextPayload & {
    prId: number;
  };
  pr_confirm_success: PRContextPayload & {
    prId: number;
  };
  pr_checkin_submitted: PRContextPayload & {
    prId: number;
    didAttend: boolean;
  };
  share_method_switch: ShareContextPayload & {
    methodId: string;
  };
  share_link_native_success: ShareContextPayload & {
    url: string;
  };
  share_link_copy_success: ShareContextPayload & {
    url: string;
  };
  share_link_failed: ShareContextPayload & {
    url: string;
    stage: "native" | "copy";
  };
  share_session_started: ShareLifecyclePayload & {
    hasFallback: boolean;
  };
  share_descriptor_submitted: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
  };
  share_descriptor_discarded_stale: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
    reason: "session_mismatch" | "phase_regression";
    currentRouteSessionId?: string | null;
  };
  share_apply_fallback_success: ShareLifecyclePayload & {
    phase: "FALLBACK";
  };
  share_apply_base_success: ShareLifecyclePayload & {
    phase: "BASE";
  };
  share_apply_enriched_success: ShareLifecyclePayload & {
    phase: "ENRICHED";
  };
  share_apply_failed: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
    stage: "apply";
    message: string;
  };
  share_replay_triggered: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
    trigger: "pageshow" | "visibilitychange" | "manual" | "sdk_ready";
  };
  home_hero_primary_click: PRContextPayload & {
    target: "event-plaza";
  };
  home_event_section_impression: PRContextPayload & {
    source: "landing_v2";
    hasMappedUnit: boolean;
    unitCount: number;
  };
  home_event_card_impression: PRContextPayload & {
    unitKey: "badminton" | "running" | "teaTalk" | "speaking";
    isLead: boolean;
    remainingSlots: number | null;
    startsSoon: boolean;
    eventId?: number;
  };
  home_event_card_click: PRContextPayload & {
    unitKey: "badminton" | "running" | "teaTalk" | "speaking";
    isLead: boolean;
    remainingSlots: number | null;
    startsSoon: boolean;
    eventId?: number;
  };
  home_event_all_click: PRContextPayload & {
    source: "landing_v2";
  };
  home_event_highlight_click: PRContextPayload & {
    eventId: number;
    index: number;
  };
  home_event_plaza_entry_click: PRContextPayload & {
    source: "landing";
  };
  home_create_entry_click: PRContextPayload & {
    source: "hero_secondary" | "fallback_section";
    target: "pr-create";
  };
  official_account_follow_nudge_shown: PRContextPayload & {
    source: OfficialAccountFollowPromptSource;
  };
  official_account_follow_nudge_action_click: PRContextPayload & {
    source: OfficialAccountFollowPromptSource;
    action: "dismiss" | "complete";
  };
  wechat_oauth_trace: AnalyticsContextPayload & {
    flow: "login" | "bind";
    phase:
      | "login_requested"
      | "redirect_scheduled"
      | "bind_requested"
      | "bind_authorize_received"
      | "bind_fallback_login"
      | "handoff_started"
      | "handoff_slow"
      | "handoff_completed"
      | "handoff_failed"
      | "handoff_abandoned";
    sinceStartMs: number;
    durationMs?: number;
    attempt?: number;
    result?: "success" | "failure" | "slow" | "abandoned";
    failureReason?: string;
  };
  anchor_event_form_impression: AnalyticsContextPayload & {
    eventId: number;
  };
  anchor_event_form_started: AnalyticsContextPayload & {
    eventId: number;
    trigger: "location" | "time" | "preference" | "primary_cta";
    hasDefaultSelection: boolean;
    locationId?: string;
    routePoolEntryId?: string;
    placeKind?: "location" | "route";
    locationType?: "preset" | "user_submitted";
    startAt?: string;
    timeType?: "preset" | "user_submitted";
    preferenceCount?: number;
  };
  anchor_event_form_recommendation_impression: AnalyticsContextPayload & {
    eventId: number;
    hasMatchedRecommendation: boolean;
    candidateCount: number;
    advancedMode: boolean;
    startAt: string;
    preferenceCount: number;
  } & AnchorEventPlaceTelemetryPayload;
  anchor_event_recommendation_result: AnalyticsContextPayload &
    ResultTelemetryPayload & {
      eventId: number;
      startAt: string;
      timeType: "preset" | "user_submitted";
      preferenceCount: number;
      outcome?: "matched" | "no_match";
      matchedPrId?: number | null;
      candidateCount?: number;
    } & AnchorEventPlaceTelemetryPayload;
  anchor_event_form_result_action_click: AnalyticsContextPayload & {
    eventId: number;
    action:
      | "PRIMARY_DETAIL"
      | "CANDIDATE_DETAIL"
      | "MATCHED_JOIN"
      | "CANDIDATE_JOIN";
    prId: number;
    candidateRank: number | null;
  };
  anchor_event_form_create_fallback_click: AnalyticsContextPayload & {
    eventId: number;
    locationId?: string | null;
    routePoolEntryId?: string | null;
    placeKind?: "location" | "route" | null;
    startAt: string;
    preferenceCount: number;
  };
  event_assisted_create_result: AnalyticsContextPayload &
    ResultTelemetryPayload & {
      eventId: number;
      prId?: number;
      activityType?: string;
      locationId?: string | null;
      routePoolEntryId?: string | null;
      placeKind?: "location" | "route";
      locationType?: "preset" | "user_submitted";
      startAt: string;
      timeType: "preset" | "user_submitted";
      preferenceCount: number;
    };
  pr_primary_cta_impression: PRContextPayload & {
    prId: number;
    ctaType: "JOIN" | "WAITLIST" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT";
    viewerState:
      | "CREATOR"
      | "PARTICIPANT"
      | "VISITOR_JOINABLE"
      | "VISITOR_WAITLISTABLE"
      | "VISITOR_WAITLISTED"
      | "VISITOR_BLOCKED";
  };
  pr_primary_cta_click: PRContextPayload & {
    prId: number;
    ctaType: "JOIN" | "WAITLIST" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT";
    viewerState:
      | "CREATOR"
      | "PARTICIPANT"
      | "VISITOR_JOINABLE"
      | "VISITOR_WAITLISTABLE"
      | "VISITOR_WAITLISTED"
      | "VISITOR_BLOCKED";
  };
  pr_lane_expand: PRContextPayload & {
    prId: number;
    laneId: "RECOVERY" | "AWARENESS" | "LOGISTICS" | "SECONDARY";
    entry:
      | "PRIMARY_SHORTCUT"
      | "PAGE_SCROLL"
      | "DIRECT_INTERACTION"
      | "UNKNOWN";
  };
  pr_recovery_accept: PRContextPayload & {
    prId: number;
    targetType: "SAME_BATCH" | "ALTERNATIVE_BATCH";
    targetPrId?: number;
    targetTimeWindowStart?: string | null;
    targetTimeWindowEnd?: string | null;
  };
  pr_secondary_action_click: PRContextPayload & {
    prId: number;
    actionType:
      | "SHARE_METHOD_SWITCH"
      | "SHARE_LINK_TRIGGER"
      | "JOIN_BETA_GROUP"
      | "EVENT_PLAZA_ENTRY"
      | "CREATOR_EDIT_CONTENT"
      | "CREATOR_MODIFY_STATUS";
    methodId?: string;
  };
};

export type TelemetryPayload<TEvent extends TelemetryEventName> =
  TelemetryPayloadMap[TEvent];
