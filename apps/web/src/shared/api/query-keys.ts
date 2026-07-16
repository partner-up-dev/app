import type { PRId } from "@partner-up-dev/backend";

export const queryKeys = {
  pr: {
    detail: (id: PRId | null) => ["partner-request", "detail", id] as const,
    messages: (id: PRId | null) => ["partner-request", "messages", id] as const,
    joinGates: (id: PRId | null) => ["partner-request", "join-gates", id] as const,
    mineCreated: () => ["partner-request", "mine", "created"] as const,
    mineJoined: () => ["partner-request", "mine", "joined"] as const,
    partnerProfile: (prId: PRId | null, partnerId: number | null) =>
      ["partner-request", "partner-profile", prId, partnerId] as const,
  },
  prDiscovery: {
    catalog: () => ["pr-discovery", "catalog"] as const,
    typeDetail: (type: string | null) => ["pr-discovery", "type-detail", type] as const,
    viewMode: (type: string | null) => ["pr-discovery", "view-mode", type] as const,
    directory: (type: string | null, dates: readonly string[]) =>
      ["pr-discovery", "directory", type, ...dates] as const,
  },
  prAuthoring: {
    options: (type: string | null) => ["pr-authoring", "options", type] as const,
    routeApplicationsMine: (type: string | null) =>
      ["pr-authoring", "route-applications", "mine", type] as const,
  },
  config: {
    public: (key: string) => ["config", "public", key] as const,
  },
  meta: {
    build: () => ["meta", "build"] as const,
  },
  poi: {
    byIds: (idsCsv: string) => ["poi", "by-ids", idsCsv] as const,
    byNames: (namesCsv: string) => ["poi", "by-names", namesCsv] as const,
    applicationsMine: () => ["poi", "applications", "mine"] as const,
  },
  commerce: {
    placement: (contextId: number | null, type: "BUTTON") =>
      ["commerce", "placement", contextId, type] as const,
    billList: () => ["commerce", "bill", "list"] as const,
    orderDetail: (orderId: string | null) => ["commerce", "order", orderId] as const,
    billDetail: (billId: string | null) => ["commerce", "bill", billId] as const,
    billLineCheckoutTarget: (billLineId: string | null) =>
      ["commerce", "bill-line", billLineId] as const,
  },
  payment: {
    providers: () => ["payment", "providers"] as const,
    tx: (paymentTxId: string | null) => ["payment", "tx", paymentTxId] as const,
  },
  studySprint: {
    room: (prId: PRId | null) => ["study-sprint", "room", prId] as const,
  },
  admin: {
    prTypeConfigCatalog: () => ["admin", "pr-type-configs", "catalog"] as const,
    prTypeConfigDetail: (type: string | null) =>
      ["admin", "pr-type-configs", "detail", type] as const,
    prTypePreferenceTags: (type: string | null, moderationStatus: string | undefined) =>
      ["admin", "pr-type-configs", "preference-tags", type, moderationStatus] as const,
    commerceProductsWorkspace: () => ["admin", "commerce", "products", "workspace"] as const,
    commercePlacementOfferWorkspace: () =>
      ["admin", "commerce", "placement-offer", "workspace"] as const,
    commerceOrderBillWorkspace: () => ["admin", "commerce", "orders-bills", "workspace"] as const,
    commerceFulfillmentWorkspace: () => ["admin", "commerce", "fulfillments", "workspace"] as const,
    paymentProviderInstances: () => ["admin", "payment", "provider-instances"] as const,
    rideHailingProviderInstances: () => ["admin", "ride-hailing", "provider-instances"] as const,
    rideHailingOrdersWorkspace: () => ["admin", "ride-hailing", "orders", "workspace"] as const,
    pois: () => ["admin", "pois"] as const,
    poisByIds: (idsCsv: string) => ["admin", "pois", "by-ids", idsCsv] as const,
    poisByNames: (namesCsv: string) => ["admin", "pois", "by-names", namesCsv] as const,
    feedbackQuestionnaireTemplates: () =>
      ["admin", "feedback-questionnaires", "templates"] as const,
    prWorkspace: () => ["admin", "pr-workspace"] as const,
    prMessages: (id: PRId | null) => ["admin", "pr", "messages", id] as const,
    prDiscoveryFunnelAnalytics: (filters: {
      startAt?: string;
      endAt?: string;
      prType?: string | null;
      viewMode?: string | null;
      origin?: string | null;
    }) => ["admin", "analytics", "pr-discovery-funnel", filters] as const,
    biOverviewAnalytics: (filters: { startAt?: string; endAt?: string }) =>
      ["admin", "analytics", "overview", filters] as const,
    prJoinFunnelAnalytics: (filters: { startAt?: string; endAt?: string }) =>
      ["admin", "analytics", "pr-join-funnel", filters] as const,
    prCreateFunnelAnalytics: (filters: { startAt?: string; endAt?: string }) =>
      ["admin", "analytics", "pr-create-funnel", filters] as const,
  },
  wechat: {
    notificationSubscriptions: () => ["wechat", "notification-subscriptions"] as const,
    reminderSubscription: () => ["wechat", "reminder-subscription"] as const,
    officialAccountFollowStatus: () => ["wechat", "official-account-follow-status"] as const,
  },
  user: {
    me: () => ["user", "me"] as const,
  },
} as const;
