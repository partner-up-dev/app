import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminPoisByIdsResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)["by-ids"]["$get"]
>;
export type AdminPoisByNamesResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)["by-names"]["$get"]
>;

export type AdminPoisResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)["$get"]
>;

export type UpsertAdminPoiResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)[":poiId"]["$put"]
>;
export type CreateAdminPoiResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)["$post"]
>;
export type ReviewAdminPoiResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)[":poiId"]["publish"]["$post"]
>;
export type AdminPoiAvailabilityRulesInput =
  AdminPoisResponse[number]["availabilityRules"];
type MeetingPointInput = {
  description: string | null;
  imageUrl: string | null;
};

export const useAdminPois = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminPoisResponse>({
    queryKey: queryKeys.admin.pois(),
    queryFn: async () => {
      const res = await adminClient.api.admin.pois.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 POIs 失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

const normalizeIdsCsv = (idsCsv: string): string =>
  idsCsv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .join(",");

export const useAdminPoisByIds = (
  idsCsv: MaybeRef<string>,
  enabled: MaybeRef<boolean> = true,
) => {
  const normalizedIdsCsv = computed(() => normalizeIdsCsv(unref(idsCsv)));
  const queryKey = computed(() =>
    queryKeys.admin.poisByIds(normalizedIdsCsv.value),
  );

  return useQuery<AdminPoisByIdsResponse>({
    queryKey,
    queryFn: async () => {
      const ids = normalizedIdsCsv.value;
      if (!ids) {
        return [];
      }

      const res = await adminClient.api.admin.pois["by-ids"].$get({
        query: { ids },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 POIs 失败"));
      }

      return await res.json();
    },
    enabled: computed(() => unref(enabled) && normalizedIdsCsv.value.length > 0),
  });
};

export const useAdminPoisByNames = (
  namesCsv: MaybeRef<string>,
  enabled: MaybeRef<boolean> = true,
) => {
  const normalizedNamesCsv = computed(() => normalizeIdsCsv(unref(namesCsv)));
  const queryKey = computed(() =>
    queryKeys.admin.poisByNames(normalizedNamesCsv.value),
  );

  return useQuery<AdminPoisByNamesResponse>({
    queryKey,
    queryFn: async () => {
      const names = normalizedNamesCsv.value;
      if (!names) {
        return [];
      }

      const res = await adminClient.api.admin.pois["by-names"].$get({
        query: { names },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 POIs 失败"));
      }

      return await res.json();
    },
    enabled: computed(() => unref(enabled) && normalizedNamesCsv.value.length > 0),
  });
};

type PoiCoordinateInput = [number, number] | null;

type AdminPoiMutationInput = {
  name: string;
  fullAddress: string | null;
  gallery: string[];
  gcj02: PoiCoordinateInput;
  wgs84: PoiCoordinateInput;
  bd09: PoiCoordinateInput;
  perTimeWindowCap: number | null;
  availabilityRules: AdminPoiAvailabilityRulesInput;
  meetingPoint?: MeetingPointInput | null;
};

export const useCreateAdminPoi = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateAdminPoiResponse, Error, AdminPoiMutationInput>({
    mutationFn: async (input) => {
      const res = await adminClient.api.admin.pois.$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 POI 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pois(),
      });
    },
  });
};

export const useUpsertAdminPoi = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpsertAdminPoiResponse,
    Error,
    AdminPoiMutationInput & { poiId: number }
  >({
    mutationFn: async ({
      poiId,
      name,
      fullAddress,
      gallery,
      gcj02,
      wgs84,
      bd09,
      perTimeWindowCap,
      availabilityRules,
      meetingPoint,
    }) => {
      const res = await adminClient.api.admin.pois[":poiId"].$put({
        param: { poiId: String(poiId) },
        json: {
          name,
          fullAddress,
          gallery,
          gcj02,
          wgs84,
          bd09,
          perTimeWindowCap,
          availabilityRules,
          meetingPoint,
        },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存 POI 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pois(),
      });
    },
  });
};

const buildPoiReviewMutation = (action: "publish" | "reject") => {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewAdminPoiResponse,
    Error,
    { poiId: number; rejectReason?: string | null }
  >({
    mutationFn: async ({ poiId, rejectReason }) => {
      const res =
        action === "publish"
          ? await adminClient.api.admin.pois[":poiId"].publish.$post({
              param: { poiId: String(poiId) },
            })
          : await adminClient.api.admin.pois[":poiId"].reject.$post({
              param: { poiId: String(poiId) },
              json: { rejectReason: rejectReason ?? null },
            });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 POI 审批状态失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pois(),
      });
    },
  });
};

export const usePublishAdminPoi = () => buildPoiReviewMutation("publish");

export const useRejectAdminPoi = () => buildPoiReviewMutation("reject");
