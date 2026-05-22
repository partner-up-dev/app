import type { PRId } from "@partner-up-dev/backend";

export const queryKeys = {
  pr: {
    detail: (id: PRId | null) => ["partner-request", "detail", id] as const,
    search: (eventId: number | null, dates: string[]) =>
      ["partner-request", "search", eventId, ...dates] as const,
    messages: (id: PRId | null) => ["partner-request", "messages", id] as const,
    joinGates: (id: PRId | null) =>
      ["partner-request", "join-gates", id] as const,
    mineCreated: () => ["partner-request", "mine", "created"] as const,
    mineJoined: () => ["partner-request", "mine", "joined"] as const,
    partnerProfile: (prId: PRId | null, partnerId: number | null) =>
      ["partner-request", "partner-profile", prId, partnerId] as const,
  },
  config: {
    public: (key: string) => ["config", "public", key] as const,
  },
  meta: {
    build: () => ["meta", "build"] as const,
  },
  anchorEvent: {
    list: () => ["anchor-event", "list"] as const,
    detail: (eventId: number | null) =>
      ["anchor-event", "detail", eventId] as const,
    formMode: (eventId: number | null) =>
      ["anchor-event", "form-mode", eventId] as const,
    routeApplicationsMine: () =>
      ["anchor-event", "route-applications", "mine"] as const,
    landingAssignment: (eventId: number | null) =>
      ["anchor-event", "landing-assignment", eventId] as const,
    demandCards: (eventId: number | null) =>
      ["anchor-event", "demand-cards", eventId] as const,
    formModeRecommendation: (
      eventId: number | null,
      locationId: string | null,
      startAt: string | null,
      preferencesKey: string,
    ) =>
      [
        "anchor-event",
        "form-mode-recommendation",
        eventId,
        locationId,
        startAt,
        preferencesKey,
      ] as const,
  },
  poi: {
    byIds: (idsCsv: string) => ["poi", "by-ids", idsCsv] as const,
    byNames: (namesCsv: string) => ["poi", "by-names", namesCsv] as const,
    applicationsMine: () => ["poi", "applications", "mine"] as const,
  },
  admin: {
    anchorEventWorkspace: () => ["admin", "anchor-events", "workspace"] as const,
    anchorEventLandingConfig: (eventId: number | null) =>
      ["admin", "anchor-events", "landing-config", eventId] as const,
    anchorEventPreferenceTags: (eventId: number | null) =>
      ["admin", "anchor-events", "preference-tags", eventId] as const,
    pois: () => ["admin", "pois"] as const,
    poisByIds: (idsCsv: string) => ["admin", "pois", "by-ids", idsCsv] as const,
    poisByNames: (namesCsv: string) =>
      ["admin", "pois", "by-names", namesCsv] as const,
    feedbackQuestionnaireTemplates: () =>
      ["admin", "feedback-questionnaires", "templates"] as const,
    prWorkspace: () => ["admin", "pr-workspace"] as const,
    prMessages: (id: PRId | null) =>
      ["admin", "pr", "messages", id] as const,
    anchorEventFunnelAnalytics: (filters: {
      startAt?: string;
      endAt?: string;
      eventId?: number | null;
      spm?: string | null;
      sourceQr?: string | null;
      assignmentRevision?: string | null;
      renderedMode?: string | null;
    }) => ["admin", "analytics", "anchor-event-funnel", filters] as const,
    prJoinFunnelAnalytics: (filters: {
      startAt?: string;
      endAt?: string;
    }) => ["admin", "analytics", "pr-join-funnel", filters] as const,
  },
  wechat: {
    notificationSubscriptions: () =>
      ["wechat", "notification-subscriptions"] as const,
    reminderSubscription: () => ["wechat", "reminder-subscription"] as const,
    officialAccountFollowStatus: () =>
      ["wechat", "official-account-follow-status"] as const,
  },
  user: {
    me: () => ["user", "me"] as const,
  },
} as const;
