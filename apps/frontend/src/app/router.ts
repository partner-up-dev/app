import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { trackEvent } from "@/shared/telemetry/track";
import { captureSpmAttributionFromUrl } from "@/shared/telemetry/spm-attribution";
import { getStoredAdminHasAnyRole } from "@/domains/admin/model/admin-session-storage";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";

const HomePage = () => import("@/pages/HomePage.vue");
const MePage = () => import("@/pages/MePage.vue");
const LocationApplicationPage = () =>
  import("@/pages/LocationApplicationPage.vue");
const LocationPickerPage = () => import("@/pages/LocationPickerPage.vue");
const RouteApplicationPage = () => import("@/pages/RouteApplicationPage.vue");
const MyPRsPage = () => import("@/pages/MyPRsPage.vue");
const PRCreatePage = () => import("@/pages/PRCreatePage.vue");
const PRPage = () => import("@/pages/PRPage.vue");
const PRPairingCodePage = () => import("@/pages/PRPairingCodePage.vue");
const PRMessagesPage = () => import("@/pages/PRMessagesPage.vue");
const NewOrderPage = () =>
  import("@/pages/OrderingFromPlacementPage.vue");
const CommerceOrderDetailPage = () =>
  import("@/pages/CommerceOrderDetailPage.vue");
const CommerceBillDetailPage = () =>
  import("@/pages/CommerceBillDetailPage.vue");
const PaymentCheckoutPage = () =>
  import("@/pages/PaymentCheckoutPage.vue");
const UserProfilePage = () => import("@/pages/UserProfilePage.vue");
const AdminLoginPage = () => import("@/pages/AdminLoginPage.vue");
const AdminAnalyticsPage = () => import("@/pages/AdminAnalyticsPage.vue");
const BIEntryPage = () => import("@/pages/BIEntryPage.vue");
const AdminAnchorEventPage = () =>
  import("@/pages/AdminAnchorEventPage.vue");
const AdminPRPage = () => import("@/pages/AdminPRPage.vue");
const AdminPoisPage = () => import("@/pages/AdminPoisPage.vue");
const AdminCommerceProductPage = () =>
  import("@/pages/AdminCommerceProductPage.vue");
const AdminCommercePlacementOfferPage = () =>
  import("@/pages/AdminCommercePlacementOfferPage.vue");
const AdminCommerceOrderBillPage = () =>
  import("@/pages/AdminCommerceOrderBillPage.vue");
const AdminCommerceFulfillmentPage = () =>
  import("@/pages/AdminCommerceFulfillmentPage.vue");
const AdminPaymentPage = () =>
  import("@/pages/AdminPaymentPage.vue");
const AdminRideHailingPage = () =>
  import("@/pages/AdminRideHailingPage.vue");
const AdminFeedbackQuestionnairesPage = () =>
  import("@/pages/AdminFeedbackQuestionnairesPage.vue");
const ContactAuthorPage = () => import("@/pages/ContactAuthorPage.vue");
const ContactSupportPage = () => import("@/pages/ContactSupportPage.vue");
const AboutPage = () => import("@/pages/AboutPage.vue");
const EventPlazaPage = () => import("@/pages/EventPlazaPage.vue");
const EventPRSearchPage = () => import("@/pages/EventPRSearchPage.vue");
const AnchorEventLandingPage = () => import("@/pages/AnchorEventLandingPage.vue");
const WeChatOAuthCallbackPage = () =>
  import("@/pages/WeChatOAuthCallbackPage.vue");

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/me",
    name: "me",
    component: MePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/locations/apply",
    name: "poi-location-apply",
    component: LocationApplicationPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/pr/mine",
    name: "pr-mine",
    component: MyPRsPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/pr/:id",
    name: "pr-detail",
    component: PRPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/pr/:id/pairing-code",
    name: "pr-pairing-code",
    component: PRPairingCodePage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/pr/new",
    name: "pr-create",
    component: PRCreatePage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/pr/:id/partners/:partnerId",
    name: "pr-partner-profile",
    component: UserProfilePage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/pr/:id/messages",
    name: "pr-messages",
    component: PRMessagesPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/order/new",
    name: "order-new",
    component: NewOrderPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/orders/:orderId",
    name: "commerce-order-detail",
    component: CommerceOrderDetailPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/bills/:billId",
    name: "commerce-bill-detail",
    component: CommerceBillDetailPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/bill-lines/:billLineId/checkout",
    name: "payment-checkout",
    component: PaymentCheckoutPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
  {
    path: "/admin/login",
    name: "admin-login",
    component: AdminLoginPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/bi",
    name: "bi-entry",
    component: BIEntryPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/routes/apply",
    name: "anchor-event-route-apply",
    component: RouteApplicationPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/locations/pick",
    name: "location-picker",
    component: LocationPickerPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/admin/analytics",
    name: "admin-analytics",
    redirect: { name: "admin-analytics-overview" },
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["analytics"],
    },
  },
  {
    path: "/admin/analytics/overview",
    name: "admin-analytics-overview",
    component: AdminAnalyticsPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["analytics"],
    },
  },
  {
    path: "/admin/analytics/pr-funnels",
    name: "admin-analytics-pr-funnels",
    component: AdminAnalyticsPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["analytics"],
    },
  },
  {
    path: "/admin/analytics/anchor-events",
    name: "admin-analytics-anchor-events",
    component: AdminAnalyticsPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["analytics"],
    },
  },
  {
    path: "/admin/analytics/official-account",
    name: "admin-analytics-official-account",
    component: AdminAnalyticsPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["analytics"],
    },
  },
  {
    path: "/admin/anchor-events",
    name: "admin-anchor-events",
    component: AdminAnchorEventPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/pr",
    name: "admin-pr",
    component: AdminPRPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/pr-messages",
    name: "admin-pr-messages",
    redirect: { name: "admin-pr" },
  },
  {
    path: "/admin/pois",
    name: "admin-pois",
    component: AdminPoisPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/commerce/products",
    name: "admin-commerce-products",
    component: AdminCommerceProductPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/commerce/placement-offer",
    name: "admin-commerce-placement-offer",
    component: AdminCommercePlacementOfferPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/commerce/orders-bills",
    name: "admin-commerce-orders-bills",
    component: AdminCommerceOrderBillPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/commerce/fulfillments",
    name: "admin-commerce-fulfillments",
    component: AdminCommerceFulfillmentPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/payment",
    name: "admin-payment",
    component: AdminPaymentPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/ride-hailing",
    name: "admin-ride-hailing",
    component: AdminRideHailingPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/admin/feedback-questionnaires",
    name: "admin-feedback-questionnaires",
    component: AdminFeedbackQuestionnairesPage,
    meta: {
      wechatSharePolicy: "route",
      requiredRoles: ["service"],
    },
  },
  {
    path: "/contact-support",
    name: "contact-support",
    component: ContactSupportPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/contact-author",
    name: "contact-author",
    component: ContactAuthorPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/about",
    name: "about",
    component: AboutPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/events",
    name: "event-plaza",
    component: EventPlazaPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/events/search",
    name: "event-pr-search",
    component: EventPRSearchPage,
    meta: {
      wechatSharePolicy: "route",
    },
  },
  {
    path: "/events/:eventId",
    name: "anchor-event",
    redirect: (to) => ({
      name: "anchor-event-landing",
      params: to.params,
      query: to.query,
      hash: to.hash,
    }),
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/e/:eventId",
    name: "anchor-event-landing",
    component: AnchorEventLandingPage,
    meta: {
      wechatSharePolicy: "skip",
      wechatAutoLoginPolicy: "skip",
    },
  },
  {
    path: "/wechat/oauth/callback",
    name: "wechat-oauth-callback",
    component: WeChatOAuthCallbackPage,
    meta: {
      wechatSharePolicy: "skip",
    },
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;

    if (to.path.startsWith("/admin/") && to.hash) {
      return { left: 0, top: 0 };
    }

    if (to.hash) {
      return {
        el: to.hash,
        top: 0,
        behavior: "smooth",
      };
    }

    return { left: 0, top: 0 };
  },
});

router.beforeEach((to) => {
  const requiredRoles = to.meta.requiredRoles;
  if (!requiredRoles?.length) {
    return true;
  }

  if (getStoredAdminHasAnyRole(requiredRoles)) {
    return true;
  }

  return {
    name: "admin-login",
    query: {
      redirect: to.fullPath,
    },
  };
});

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

router.afterEach((to) => {
  if (typeof window !== "undefined") {
    captureSpmAttributionFromUrl(window.location.href);
  }

  trackEvent("page_view", {
    page: sanitizeSensitiveRoutePath(to.fullPath),
    routeName: typeof to.name === "string" ? to.name : undefined,
    prId: parsePositiveInt(to.params.id),
  });
});
