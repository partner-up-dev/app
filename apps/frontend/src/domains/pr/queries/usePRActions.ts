import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRId, PRStatusManual } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import type { PRUserUpdateContentFields } from "@/domains/pr/model/types";
import {
  buildApiError,
  type ApiErrorPayload,
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";
import {
  handleWeChatAuthRequiredError,
  isWeChatAuthRequiredError,
} from "@/processes/wechat/auth-error";
import { setPendingWeChatAction } from "@/processes/wechat/pending-wechat-action";

type PRActionInput = {
  id: PRId;
};

type PRJoinInput = PRActionInput;

type PRWaitlistInput = PRActionInput;
type PRWaitlistMutationInput = PRWaitlistInput & {
  alternativePrReminderOptIn?: boolean;
};

type PRCancelWaitlistInput = PRActionInput;

type PRCheckInInput = PRActionInput;

type PRUpdateContentInput = {
  id: PRId;
  fields: PRUserUpdateContentFields;
};

type PRUpdateStatusInput = {
  id: PRId;
  status: PRStatusManual;
};

const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const PR_TYPE_IMMUTABLE_CODE = "PR_TYPE_IMMUTABLE";

const resolveErrorMessage = (
  response: Response,
  payload: ApiErrorPayload | null,
  fallback: string,
): string => {
  if (
    typeof window !== "undefined" &&
    handleWeChatAuthRequiredError(
      response.status,
      payload,
      window.location.href,
    )
  ) {
    return resolveApiErrorMessage(
      payload,
      i18n.global.t("prPage.wechatReminder.loginHint"),
    );
  }

  return resolveApiErrorMessage(payload, fallback);
};

const resolveUpdateContentErrorMessage = (
  response: Response,
  payload: ApiErrorPayload | null,
): string => {
  if (payload?.code === PR_TYPE_IMMUTABLE_CODE) {
    return i18n.global.t("errors.prTypeImmutable");
  }
  return resolveErrorMessage(
    response,
    payload,
    i18n.global.t("errors.updateContentFailed"),
  );
};

const isPRJoinGateUnresolvedError = (
  payload: ApiErrorPayload | null,
): boolean => payload?.code === PR_JOIN_GATE_UNRESOLVED_CODE;

export const useJoinPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRJoinInput) => {
      const requestJoin = async () =>
        client.api.pr[":id"].join.$post(
          {
            param: { id: id.toString() },
            json: {},
          },
          {
            init: {
              credentials: "include",
            },
          },
        );

      const res = await requestJoin();
      const payload = res.ok ? null : await readApiErrorPayload(res);

      if (!res.ok) {
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "PR_JOIN",
            prId: id,
          });
        }
        const fallbackMessage = isPRJoinGateUnresolvedError(payload)
          ? "请先完成加入前置项"
          : i18n.global.t("errors.joinRequestFailed");
        throw buildApiError(
          resolveErrorMessage(res, payload, fallbackMessage),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.joinGates(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useWaitlistPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      alternativePrReminderOptIn,
    }: PRWaitlistMutationInput) => {
      const res = await client.api.pr[":id"].waitlist.$post(
        {
          param: { id: id.toString() },
          json: {
            alternativePrReminderOptIn: alternativePrReminderOptIn === true,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      const payload = res.ok ? null : await readApiErrorPayload(res);

      if (!res.ok) {
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "PR_WAITLIST",
            prId: id,
          });
        }
        const fallbackMessage = isPRJoinGateUnresolvedError(payload)
          ? "请先完成候补前置项"
          : i18n.global.t("errors.waitlistRequestFailed");
        throw buildApiError(
          resolveErrorMessage(res, payload, fallbackMessage),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.joinGates(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.notificationSubscriptions(),
      });
    },
  });
};

export const useCancelWaitlistPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRCancelWaitlistInput) => {
      const res = await client.api.pr[":id"].waitlist.cancel.$post(
        {
          param: { id: id.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      const payload = res.ok ? null : await readApiErrorPayload(res);

      if (!res.ok) {
        throw buildApiError(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.cancelWaitlistFailed"),
          ),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.joinGates(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useExitPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRActionInput) => {
      const res = await client.api.pr[":id"].exit.$post(
        {
          param: { id: id.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "PR_EXIT",
            prId: id,
          });
        }
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.exitRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useConfirmPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRActionInput) => {
      const res = await client.api.pr[":id"].confirm.$post(
        {
          param: { id: id.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "PR_CONFIRM",
            prId: id,
          });
        }
        throw buildApiError(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.confirmSlotFailed"),
          ),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useCheckInPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRCheckInInput) => {
      const res = await client.api.pr[":id"]["check-in"].$post(
        {
          param: { id: id.toString() },
          json: {},
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        if (res.status === 403) {
          return {
            eligible: false,
            canRequest: false,
            requested: false,
            reason: "SLOT_NOT_ELIGIBLE",
          };
        }

        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.checkInSlotFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useUpdatePRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: PRUpdateContentInput) => {
      const res = await client.api.pr[":id"].content.$patch({
        param: { id: id.toString() },
        json: { fields },
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw buildApiError(
          resolveUpdateContentErrorMessage(res, payload),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useUpdatePRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: PRUpdateStatusInput) => {
      const res = await client.api.pr[":id"].status.$patch({
        param: { id: id.toString() },
        json: { status },
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.updateStatusFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};
