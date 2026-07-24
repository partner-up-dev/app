import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferRequestType, InferResponseType } from "hono";
import { computed, type MaybeRef, unref } from "vue";
import {
  type AdminPRTypeConfigCreateResponse,
  type AdminPRTypeConfigDetailResponse,
  type AdminPRTypeConfigSliceResponse,
  toAdminPRTypeConfigAuthoringRequest,
  toAdminPRTypeConfigCompletionRequest,
  toAdminPRTypeConfigCoordinationRequest,
  toAdminPRTypeConfigCreateRequest,
  toAdminPRTypeConfigDiscoveryRequest,
  toAdminPRTypeConfigParticipationRequest,
} from "@/domains/admin/adapters/pr-type-config-adapter";
import type {
  AdminPRTypeConfigAuthoring,
  AdminPRTypeConfigCompletion,
  AdminPRTypeConfigCoordination,
  AdminPRTypeConfigDiscovery,
  AdminPRTypeConfigDraft,
  AdminPRTypeConfigParticipation,
} from "@/domains/admin/model/pr-type-config-editor";
import { adminClient } from "@/lib/admin-rpc";
import { readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

type ConfigApi = (typeof adminClient.api.admin)["pr-type-configs"];
type CatalogRoute = ConfigApi["catalog"];
type DetailRoute = ConfigApi[":type"];
type PreferenceTagsRoute = DetailRoute["preference-tags"];
type PreferenceTagModerationRoute = PreferenceTagsRoute[":tagId"]["moderate"];

export type AdminPRTypeConfigCatalogResponse = InferResponseType<CatalogRoute["$get"]>;

export class AdminPRTypeConfigRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminPRTypeConfigRequestError";
  }
}
export type AdminPRTypePreferenceTagsResponse = InferResponseType<PreferenceTagsRoute["$get"]>;
export type AdminPRTypePreferenceTagModerationInput = InferRequestType<
  PreferenceTagModerationRoute["$post"]
>["json"];
export type AdminPRTypePreferenceTagModerationResponse = InferResponseType<
  PreferenceTagModerationRoute["$post"]
>;

const readErrorMessage = async (response: Response, fallback: string): Promise<string> =>
  resolveApiErrorMessage(await readApiErrorPayload(response), fallback);

export const useAdminPRTypeConfigCatalog = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminPRTypeConfigCatalogResponse>({
    queryKey: queryKeys.admin.prTypeConfigCatalog(),
    queryFn: async () => {
      const response = await adminClient.api.admin["pr-type-configs"].catalog.$get();
      if (!response.ok)
        throw new Error(await readErrorMessage(response, "取得 PR 类型配置目录失败"));
      return await response.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useAdminPRTypeConfigDetail = (type: MaybeRef<string | null>) =>
  useQuery<AdminPRTypeConfigDetailResponse>({
    queryKey: computed(() => queryKeys.admin.prTypeConfigDetail(unref(type))),
    queryFn: async () => {
      const resolvedType = unref(type)?.trim();
      if (!resolvedType) throw new Error("缺少 PR 类型");
      const response = await adminClient.api.admin["pr-type-configs"][":type"].$get({
        param: { type: resolvedType },
      });
      if (!response.ok)
        throw new AdminPRTypeConfigRequestError(
          await readErrorMessage(response, "取得 PR 类型配置失败"),
          response.status,
        );
      return await response.json();
    },
    enabled: computed(() => Boolean(unref(type)?.trim())),
  });

export const useCreateAdminPRTypeConfig = () => {
  const queryClient = useQueryClient();
  return useMutation<
    AdminPRTypeConfigCreateResponse,
    Error,
    { type: string; input: AdminPRTypeConfigDraft }
  >({
    mutationFn: async ({ type, input }) => {
      const response = await adminClient.api.admin["pr-type-configs"][":type"].$put({
        param: { type },
        json: toAdminPRTypeConfigCreateRequest(input),
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "保存 PR 类型配置失败"));
      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.admin.prTypeConfigDetail(variables.type), data);
      queryClient.removeQueries({
        queryKey: queryKeys.admin.prTypePreferenceTags(variables.type, undefined),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.prTypeConfigCatalog() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prTypeConfigDetail(variables.type),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.prWorkspace() });
    },
  });
};

const useAdminPRTypeConfigSliceMutation = <Input>(
  request: (type: string, input: Input) => Promise<Response>,
  fallback: string,
) => {
  const queryClient = useQueryClient();
  return useMutation<AdminPRTypeConfigSliceResponse, Error, { type: string; input: Input }>({
    mutationFn: async ({ type, input }) => {
      const response = await request(type, input);
      if (!response.ok) throw new Error(await readErrorMessage(response, fallback));
      return (await response.json()) as AdminPRTypeConfigSliceResponse;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.prTypeConfigCatalog() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prTypeConfigDetail(variables.type),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.prWorkspace() });
    },
  });
};

export const useUpdateAdminPRTypeConfigAuthoring = () =>
  useAdminPRTypeConfigSliceMutation<AdminPRTypeConfigAuthoring>(
    (type, input) =>
      adminClient.api.admin["pr-type-configs"][":type"].authoring.$put({
        param: { type },
        json: toAdminPRTypeConfigAuthoringRequest(input),
      }),
    "保存 Authoring 配置失败",
  );

export const useUpdateAdminPRTypeConfigDiscovery = () =>
  useAdminPRTypeConfigSliceMutation<AdminPRTypeConfigDiscovery>(
    (type, input) =>
      adminClient.api.admin["pr-type-configs"][":type"].discovery.$put({
        param: { type },
        json: toAdminPRTypeConfigDiscoveryRequest(input),
      }),
    "保存 Discovery 配置失败",
  );

export const useUpdateAdminPRTypeConfigParticipation = () =>
  useAdminPRTypeConfigSliceMutation<AdminPRTypeConfigParticipation>(
    (type, input) =>
      adminClient.api.admin["pr-type-configs"][":type"].participation.$put({
        param: { type },
        json: toAdminPRTypeConfigParticipationRequest(input),
      }),
    "保存 Participation 配置失败",
  );

export const useUpdateAdminPRTypeConfigCoordination = () =>
  useAdminPRTypeConfigSliceMutation<AdminPRTypeConfigCoordination>(
    (type, input) =>
      adminClient.api.admin["pr-type-configs"][":type"].coordination.$put({
        param: { type },
        json: toAdminPRTypeConfigCoordinationRequest(input),
      }),
    "保存 Coordination 配置失败",
  );

export const useUpdateAdminPRTypeConfigCompletion = () =>
  useAdminPRTypeConfigSliceMutation<AdminPRTypeConfigCompletion>(
    (type, input) =>
      adminClient.api.admin["pr-type-configs"][":type"].completion.$put({
        param: { type },
        json: toAdminPRTypeConfigCompletionRequest(input),
      }),
    "保存 Completion 配置失败",
  );

export const useAdminPRTypePreferenceTags = (
  type: MaybeRef<string | null>,
  moderationStatus: MaybeRef<"PENDING" | "PUBLISHED" | "REJECTED" | undefined> = undefined,
) =>
  useQuery<AdminPRTypePreferenceTagsResponse>({
    queryKey: computed(() =>
      queryKeys.admin.prTypePreferenceTags(unref(type), unref(moderationStatus)),
    ),
    queryFn: async () => {
      const resolvedType = unref(type)?.trim();
      if (!resolvedType) throw new Error("缺少 PR 类型");
      const response = await adminClient.api.admin["pr-type-configs"][":type"][
        "preference-tags"
      ].$get({
        param: { type: resolvedType },
        query: unref(moderationStatus) ? { moderationStatus: unref(moderationStatus) } : {},
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "取得偏好标签失败"));
      return await response.json();
    },
    enabled: computed(() => Boolean(unref(type)?.trim())),
  });

export const useModerateAdminPRTypePreferenceTag = () => {
  const queryClient = useQueryClient();
  return useMutation<
    AdminPRTypePreferenceTagModerationResponse,
    Error,
    { type: string; tagId: number; input: AdminPRTypePreferenceTagModerationInput }
  >({
    mutationFn: async ({ type, tagId, input }) => {
      const response = await adminClient.api.admin["pr-type-configs"][":type"]["preference-tags"][
        ":tagId"
      ].moderate.$post({
        param: { type, tagId: String(tagId) },
        json: input,
      });
      if (!response.ok)
        throw new Error(await readErrorMessage(response, "更新偏好标签审核状态失败"));
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prTypePreferenceTags(variables.type, undefined),
      });
    },
  });
};
