import type { AdminSessionRole } from "@/domains/admin/model/admin-session-storage";

export type AdminNavigationGroup = {
  id: string;
  labelKey: string;
  requiredRoles?: AdminSessionRole[];
  items: AdminNavigationItem[];
};

export type AdminNavigationItem = {
  id: string;
  labelKey: string;
  subtitleKey: string;
  routeName: string;
  requiredRoles?: AdminSessionRole[];
  sectionId?: string;
  hash?: string;
};

const sectionHash = (sectionId: string): string => `#${sectionId}`;

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    id: "anchor-event",
    labelKey: "adminCommon.navAnchorEventGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "anchor-event-basic",
        labelKey: "adminCommon.navAnchorEventBasic",
        subtitleKey: "adminCommon.navAnchorEventBasicSubtitle",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-basic",
        hash: sectionHash("anchor-event-basic"),
      },
      {
        id: "anchor-event-locations",
        labelKey: "adminCommon.navAnchorEventLocations",
        subtitleKey: "adminCommon.navAnchorEventLocationsSubtitle",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-locations",
        hash: sectionHash("anchor-event-locations"),
      },
      {
        id: "anchor-event-route-applications",
        labelKey: "adminCommon.navAnchorEventRouteApplications",
        subtitleKey: "adminCommon.navAnchorEventRouteApplicationsSubtitle",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-route-applications",
        hash: sectionHash("anchor-event-route-applications"),
      },
      {
        id: "anchor-event-time",
        labelKey: "adminCommon.navAnchorEventTime",
        subtitleKey: "adminCommon.navAnchorEventTimeSubtitle",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-time",
        hash: sectionHash("anchor-event-time"),
      },
      {
        id: "anchor-event-tags",
        labelKey: "adminCommon.navAnchorEventTags",
        subtitleKey: "adminCommon.navAnchorEventTagsSubtitle",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-tags",
        hash: sectionHash("anchor-event-tags"),
      },
      {
        id: "anchor-event-other",
        labelKey: "adminCommon.navAnchorEventOther",
        subtitleKey: "adminCommon.navAnchorEventOtherSubtitle",
        routeName: "admin-anchor-events",
        sectionId: "anchor-event-other",
        hash: sectionHash("anchor-event-other"),
      },
    ],
  },
  {
    id: "pr",
    labelKey: "adminCommon.navPRGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "pr-basic",
        labelKey: "adminCommon.navPRBasic",
        subtitleKey: "adminCommon.navPRBasicSubtitle",
        routeName: "admin-pr",
        sectionId: "pr-basic",
        hash: sectionHash("pr-basic"),
      },
      {
        id: "pr-messages",
        labelKey: "adminCommon.navPRMessages",
        subtitleKey: "adminCommon.navPRMessagesSubtitle",
        routeName: "admin-pr",
        sectionId: "pr-messages",
        hash: sectionHash("pr-messages"),
      },
    ],
  },
  {
    id: "analytics",
    labelKey: "adminCommon.navAnalyticsGroup",
    requiredRoles: ["analytics"],
    items: [
      {
        id: "analytics-overview",
        labelKey: "adminCommon.navAnalyticsOverview",
        subtitleKey: "adminCommon.navAnalyticsOverviewSubtitle",
        routeName: "admin-analytics-overview",
      },
      {
        id: "analytics-pr-funnels",
        labelKey: "adminCommon.navAnalyticsPRFunnels",
        subtitleKey: "adminCommon.navAnalyticsPRFunnelsSubtitle",
        routeName: "admin-analytics-pr-funnels",
      },
      {
        id: "analytics-anchor-events",
        labelKey: "adminCommon.navAnalyticsAnchorEvents",
        subtitleKey: "adminCommon.navAnalyticsAnchorEventsSubtitle",
        routeName: "admin-analytics-anchor-events",
      },
      {
        id: "analytics-official-account",
        labelKey: "adminCommon.navAnalyticsOfficialAccount",
        subtitleKey: "adminCommon.navAnalyticsOfficialAccountSubtitle",
        routeName: "admin-analytics-official-account",
      },
    ],
  },
  {
    id: "pois",
    labelKey: "adminCommon.navPoisGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "poi-basic",
        labelKey: "adminCommon.navPoiBasic",
        subtitleKey: "adminCommon.navPoiBasicSubtitle",
        routeName: "admin-pois",
        sectionId: "poi-basic",
        hash: sectionHash("poi-basic"),
      },
      {
        id: "poi-review",
        labelKey: "adminCommon.navPoiReview",
        subtitleKey: "adminCommon.navPoiReviewSubtitle",
        routeName: "admin-pois",
        sectionId: "poi-review",
        hash: sectionHash("poi-review"),
      },
    ],
  },
  {
    id: "commerce-merchandising",
    labelKey: "adminCommon.navCommerceMerchandisingGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "commerce-products",
        labelKey: "adminCommon.navCommerceProducts",
        subtitleKey: "adminCommon.navCommerceProductsSubtitle",
        routeName: "admin-commerce-products",
      },
      {
        id: "commerce-offers",
        labelKey: "adminCommon.navCommerceOffers",
        subtitleKey: "adminCommon.navCommerceOffersSubtitle",
        routeName: "admin-commerce-offers",
      },
      {
        id: "commerce-placements",
        labelKey: "adminCommon.navCommercePlacements",
        subtitleKey: "adminCommon.navCommercePlacementsSubtitle",
        routeName: "admin-commerce-placements",
      },
    ],
  },
  {
    id: "commerce-trade",
    labelKey: "adminCommon.navCommerceTradeGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "commerce-orders-bills",
        labelKey: "adminCommon.navCommerceOrdersBills",
        subtitleKey: "adminCommon.navCommerceOrdersBillsSubtitle",
        routeName: "admin-commerce-orders-bills",
      },
      {
        id: "commerce-fulfillments",
        labelKey: "adminCommon.navCommerceFulfillments",
        subtitleKey: "adminCommon.navCommerceFulfillmentsSubtitle",
        routeName: "admin-commerce-fulfillments",
      },
    ],
  },
  {
    id: "payment",
    labelKey: "adminCommon.navPaymentGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "payment-provider-instances",
        labelKey: "adminCommon.navPaymentProviderInstances",
        subtitleKey: "adminCommon.navPaymentProviderInstancesSubtitle",
        routeName: "admin-payment",
      },
    ],
  },
  {
    id: "ride-hailing",
    labelKey: "adminCommon.navRideHailingGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "ride-hailing-provider-instances",
        labelKey: "adminCommon.navRideHailingProviderInstances",
        subtitleKey: "adminCommon.navRideHailingProviderInstancesSubtitle",
        routeName: "admin-ride-hailing",
      },
      {
        id: "ride-hailing-orders",
        labelKey: "adminCommon.navRideHailingOrders",
        subtitleKey: "adminCommon.navRideHailingOrdersSubtitle",
        routeName: "admin-ride-hailing-orders",
      },
    ],
  },
  {
    id: "feedback-questionnaires",
    labelKey: "adminCommon.navFeedbackQuestionnairesGroup",
    requiredRoles: ["service"],
    items: [
      {
        id: "feedback-questionnaire-templates",
        labelKey: "adminCommon.navFeedbackQuestionnaireTemplates",
        subtitleKey: "adminCommon.navFeedbackQuestionnaireTemplatesSubtitle",
        routeName: "admin-feedback-questionnaires",
      },
    ],
  },
];
