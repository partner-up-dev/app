import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import type {
  AnchorEventRoutePool,
  AnchorEventParticipationFrequencyLimit,
  PRRoute,
  PRJoinGateConfig,
} from "@partner-up-dev/backend";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type AnchorEventsRoute = AdminApi["anchor-events"];
type AnchorEventWorkspaceRoute = AnchorEventsRoute["workspace"];
type AnchorEventRoute = AnchorEventsRoute[":eventId"];
type RouteApplicationRoute = AdminApi["route-applications"][":applicationId"];

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as {
    detail?: string;
    error?: string;
  };
  return payload.detail || payload.error || fallback;
};

export type AdminAnchorEventWorkspaceResponse = InferResponseType<
  AnchorEventWorkspaceRoute["$get"]
>;
export type AdminRouteApplication =
  AdminAnchorEventWorkspaceResponse["routeApplications"][number];

export type CreateAdminAnchorEventResponse = InferResponseType<
  AnchorEventsRoute["$post"]
>;

export type UpdateAdminAnchorEventResponse = InferResponseType<
  AnchorEventRoute["$patch"]
>;
export type AcceptAdminRouteApplicationResponse = InferResponseType<
  RouteApplicationRoute["accept"]["$post"]
>;
export type AcceptAdminRouteApplicationInput = {
  applicationId: number;
  route: PRRoute;
};
export type RejectAdminRouteApplicationResponse = InferResponseType<
  RouteApplicationRoute["reject"]["$post"]
>;

export type AdminAnchorRecurringStartRuleInput = {
  id: string;
  kind: "RECURRING";
  weekdays: number[];
  timeOfDay: string;
  description: string | null;
};

export type AdminAnchorAbsoluteStartRuleInput = {
  id: string;
  kind: "ABSOLUTE";
  startAt: string;
  description: string | null;
};

export type AdminAnchorTimePoolConfigInput = {
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  startRules: Array<
    AdminAnchorRecurringStartRuleInput | AdminAnchorAbsoluteStartRuleInput
  >;
};

type MeetingPointInput = {
  description: string | null;
  imageUrl: string | null;
};

export type AdminAnchorEventInput = {
  title: string;
  type: string;
  description: string | null;
  locationPool: string[];
  routePool: AnchorEventRoutePool;
  meetingPoint?: MeetingPointInput | null;
  locationMeetingPoints?: Record<string, MeetingPointInput>;
  joinGateConfig: PRJoinGateConfig;
  participationFrequencyLimit: AnchorEventParticipationFrequencyLimit;
  feedbackQuestionnaireTemplateId: number | null;
  defaultPrNotes: string | null;
  timePoolConfig: AdminAnchorTimePoolConfigInput;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  prCreationPolicy: "USER_AND_ADMIN" | "ADMIN_ONLY";
  fullPrExpansionPolicy: "ENABLED" | "DISABLED";
  prTimeWindowEditorDefaultMode: "NORMAL" | "FUZZY" | "ADVANCED";
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export const useAdminAnchorEventWorkspace = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<AdminAnchorEventWorkspaceResponse>({
    queryKey: queryKeys.admin.anchorEventWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin["anchor-events"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "取得活動管理資料失敗"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminAnchorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminAnchorEventResponse,
    Error,
    AdminAnchorEventInput
  >({
    mutationFn: async (input) => {
      const res = await adminClient.api.admin["anchor-events"].$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "建立活動失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useUpdateAdminAnchorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminAnchorEventResponse,
    Error,
    { eventId: number; input: AdminAnchorEventInput }
  >({
    mutationFn: async ({ eventId, input }) => {
      const res = await adminClient.api.admin["anchor-events"][
        ":eventId"
      ].$patch({
        param: { eventId: eventId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新活動失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useAcceptAdminRouteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AcceptAdminRouteApplicationResponse,
    Error,
    AcceptAdminRouteApplicationInput
  >({
    mutationFn: async ({ applicationId, route }) => {
      const res = await adminClient.api.admin["route-applications"][
        ":applicationId"
      ].accept.$post({
        param: { applicationId: applicationId.toString() },
        json: { route },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "通过路线申请失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
    },
  });
};

export const useRejectAdminRouteApplication = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RejectAdminRouteApplicationResponse,
    Error,
    { applicationId: number; rejectReason: string | null }
  >({
    mutationFn: async ({ applicationId, rejectReason }) => {
      const res = await adminClient.api.admin["route-applications"][
        ":applicationId"
      ].reject.$post({
        param: { applicationId: applicationId.toString() },
        json: { rejectReason },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "驳回路线申请失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
    },
  });
};
