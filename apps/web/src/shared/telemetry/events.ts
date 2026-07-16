import type { PRStatus } from "@partner-up-dev/backend";

export type TelemetryActionResult = "success" | "failure" | "blocked";

export type TelemetryEventName =
  | "page_view"
  | "pr_create_result"
  | "pr_join_result"
  | "pr_waitlist_result"
  | "pr_discovery_candidate_action"
  | "pr_discovery_recommendation_returned"
  | "pr_discovery_surface_viewed"
  | "pr_discovery_criteria_submitted"
  | "pr_discovery_candidate_impression"
  | "pr_discovery_authoring_handoff"
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
  | "home_create_entry_click"
  | "official_account_follow_nudge_shown"
  | "official_account_follow_nudge_action_click"
  | "wechat_oauth_trace"
  | "pr_primary_cta_impression"
  | "pr_primary_cta_click"
  | "pr_lane_expand"
  | "pr_recovery_accept"
  | "pr_secondary_action_click";

type AnalyticsContextPayload = {
  prType?: string;
  spm?: string;
  sourceQr?: string;
  traceId?: string;
  prIdRef?: number;
  cardKey?: string;
};

type PRContextPayload = AnalyticsContextPayload & {
  prId?: number;
};

type PRDiscoveryPayload = {
  prType: string;
  viewMode: "LIST" | "CARD" | "FORM";
  origin: string;
  prId?: number;
};

type OfficialAccountFollowPromptSource =
  | "home"
  | "pr_discovery"
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

export type TelemetryPayloadMap = {
  page_view: PRContextPayload & {
    page: string;
    routeName?: string;
  };
  pr_create_result: PRContextPayload &
    ResultTelemetryPayload & {
      prId: number;
      status: PRStatus;
    };
  pr_join_result: PRContextPayload &
    ResultTelemetryPayload & {
      prId: number;
      entrySurface?: "pr_detail" | "pr_discovery_form_match" | "pr_discovery_form_candidate";
      candidateRank?: number | null;
    };
  pr_waitlist_result: PRContextPayload &
    ResultTelemetryPayload & {
      prId: number;
      entrySurface?: "pr_detail" | "pr_discovery_form_match" | "pr_discovery_form_candidate";
      candidateRank?: number | null;
    };
  pr_discovery_candidate_action: PRDiscoveryPayload & {
    prId: number;
    action: "MATCHED_JOIN" | "DETAIL" | "JOIN" | "WAITLIST";
  };
  pr_discovery_recommendation_returned: PRDiscoveryPayload & {
    outcome: "matched" | "no_match";
  };
  pr_discovery_surface_viewed: PRDiscoveryPayload;
  pr_discovery_criteria_submitted: PRDiscoveryPayload;
  pr_discovery_candidate_impression: PRDiscoveryPayload & {
    prId: number;
    rank?: number;
  };
  pr_discovery_authoring_handoff: PRDiscoveryPayload & {
    handoffReason: "NO_MATCH" | "USER_REQUEST" | "EMPTY_STATE";
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
    target: "pr-discovery";
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
    entry: "PRIMARY_SHORTCUT" | "PAGE_SCROLL" | "DIRECT_INTERACTION" | "UNKNOWN";
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
      | "CREATOR_EDIT_CONTENT"
      | "CREATOR_MODIFY_STATUS";
    methodId?: string;
  };
};

export type TelemetryPayload<TEvent extends TelemetryEventName> = TelemetryPayloadMap[TEvent];
