import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import type { FeedbackQuestionnaireDefinition } from "@partner-up-dev/backend";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type FeedbackQuestionnairesRoute =
  (typeof adminClient.api.admin)["feedback-questionnaires"];
type TemplatesRoute = FeedbackQuestionnairesRoute["templates"];
type TemplateRoute = TemplatesRoute[":templateId"];

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminFeedbackQuestionnaireTemplatesResponse = InferResponseType<
  TemplatesRoute["$get"]
>;
export type AdminFeedbackQuestionnaireTemplateResponse = InferResponseType<
  TemplatesRoute["$post"]
>;

export type AdminFeedbackQuestionnaireTemplateInput = {
  key: string;
  version: string;
  title: string;
  definition: FeedbackQuestionnaireDefinition;
};

export const useAdminFeedbackQuestionnaireTemplates = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<AdminFeedbackQuestionnaireTemplatesResponse>({
    queryKey: queryKeys.admin.feedbackQuestionnaireTemplates(),
    queryFn: async () => {
      const res =
        await adminClient.api.admin["feedback-questionnaires"].templates.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取问卷模板失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminFeedbackQuestionnaireTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AdminFeedbackQuestionnaireTemplateResponse,
    Error,
    AdminFeedbackQuestionnaireTemplateInput
  >({
    mutationFn: async (input) => {
      const res =
        await adminClient.api.admin["feedback-questionnaires"].templates.$post({
          json: input,
        });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建问卷模板失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.feedbackQuestionnaireTemplates(),
      });
    },
  });
};

export const useUpdateAdminFeedbackQuestionnaireTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation<
    InferResponseType<TemplateRoute["$patch"]>,
    Error,
    { templateId: number; input: AdminFeedbackQuestionnaireTemplateInput }
  >({
    mutationFn: async ({ templateId, input }) => {
      const res = await adminClient.api.admin["feedback-questionnaires"].templates[
        ":templateId"
      ].$patch({
        param: { templateId: templateId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存问卷模板失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.feedbackQuestionnaireTemplates(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};
