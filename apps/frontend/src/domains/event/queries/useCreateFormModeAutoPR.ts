import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRAllowEditAfterReady, PRRoute } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
  type ApiError,
} from "@/shared/api/error";
import type { TimeWindow } from "@/domains/event/model/time-window-view";

export type FormModeAutoCreatePlace =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      route: PRRoute;
    };

export type CreateFormModeAutoPRInput = {
  eventId: number;
  timeWindow: TimeWindow;
  place: FormModeAutoCreatePlace;
  preferences?: readonly string[];
  allowEditAfterReady?: PRAllowEditAfterReady | null;
};

export type CreateFormModeAutoPRResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["form-mode"]["auto-create"]["$post"]
>;

export type CreateFormModeAutoPRError = ApiError & {
  status?: number;
};

const normalizeFormModeAutoCreateTimeWindow = (
  timeWindow: TimeWindow,
): [string, string] => {
  const [startAt, endAt] = timeWindow;
  if (!startAt || !endAt) {
    throw new Error("Form Mode auto create requires a concrete time window");
  }
  return [startAt, endAt];
};

export const buildFormModeAutoCreateBody = (
  input: Omit<CreateFormModeAutoPRInput, "eventId">,
) => ({
  timeWindow: normalizeFormModeAutoCreateTimeWindow(input.timeWindow),
  place:
    input.place.kind === "location"
      ? ({
          kind: "location" as const,
          locationId: input.place.locationId,
        })
      : ({
          kind: "route" as const,
          route: input.place.route,
        }),
  preferences: [...(input.preferences ?? [])],
  allowEditAfterReady: input.allowEditAfterReady ?? null,
});

export const useCreateFormModeAutoPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateFormModeAutoPRResponse,
    CreateFormModeAutoPRError,
    CreateFormModeAutoPRInput
  >({
    mutationFn: async ({
      eventId,
      timeWindow,
      place,
      preferences,
      allowEditAfterReady,
    }) => {
      const response = await client.api.events[":eventId"]["form-mode"][
        "auto-create"
      ].$post(
        {
          param: {
            eventId: String(eventId),
          },
          json: buildFormModeAutoCreateBody({
            timeWindow,
            place,
            preferences,
            allowEditAfterReady,
          }),
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!response.ok) {
        const payload = await readApiErrorPayload(response);
        const error = buildApiError(
          resolveApiErrorMessage(payload, "自动创建搭子失败"),
          payload,
        ) as CreateFormModeAutoPRError;
        error.status = response.status;
        throw error;
      }

      return await response.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.demandCards(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.formMode(variables.eventId),
      });
    },
  });
};
