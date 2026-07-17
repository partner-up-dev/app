import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

type JoinGatesRoute = (typeof client.api.pr)[":id"]["join-gates"];
type ResolveJoinGateRoute = JoinGatesRoute[":gateKey"]["resolve"];

export type PRJoinGateProjectionResponse = InferResponseType<JoinGatesRoute["$get"]>;
export type PRJoinGateProjectionItem = PRJoinGateProjectionResponse["gates"][number];
export type ResolvePRJoinGateResponse = InferResponseType<ResolveJoinGateRoute["$post"]>;

export type ResolvePRJoinGateInput = {
  id: PRId;
  gateKey: string;
  payload: {
    kind: "JOIN_NOTICE";
    version: string;
    accepted: true;
  };
};

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const payload = await readApiErrorPayload(response);
  return resolveApiErrorMessage(payload, fallback);
};

export const usePRJoinGates = (id: Ref<PRId | null>, queryEnabled?: Ref<boolean>) => {
  const queryClient = useQueryClient();
  const enabled = computed(() => id.value !== null && (queryEnabled?.value ?? true));
  const queryKey = computed(() => queryKeys.pr.joinGates(id.value));

  const query = useQuery<PRJoinGateProjectionResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"]["join-gates"].$get(
        {
          param: { id: prId.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, i18n.global.t("errors.fetchRequestFailed")));
      }

      return await res.json();
    },
    enabled: () => enabled.value,
  });

  const resolveGate = useMutation<ResolvePRJoinGateResponse, Error, ResolvePRJoinGateInput>({
    mutationFn: async ({ id, gateKey, payload }) => {
      const res = await client.api.pr[":id"]["join-gates"][":gateKey"].resolve.$post(
        {
          param: {
            id: id.toString(),
            gateKey,
          },
          json: payload,
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const errorPayload = await readApiErrorPayload(res);
        throw buildApiError(
          resolveApiErrorMessage(errorPayload, i18n.global.t("common.operationFailed")),
          errorPayload,
        );
      }

      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<PRJoinGateProjectionResponse>(queryKeys.pr.joinGates(variables.id), {
        gates: data.gates,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.joinGates(variables.id),
      });
    },
  });

  return {
    ...query,
    resolveGate,
  };
};
