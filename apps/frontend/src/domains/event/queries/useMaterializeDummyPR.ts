import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRRoute } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
  type ApiError,
} from "@/shared/api/error";
import type { TimeWindow } from "@/domains/event/model/time-window-view";

export type MaterializeDummyPRPlace =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      routePoolEntryId: string;
      route: PRRoute;
    };

export type MaterializeDummyPRInput = {
  eventId: number;
  timeWindow: TimeWindow;
  place: MaterializeDummyPRPlace;
  preferences?: readonly string[];
};

export type MaterializeDummyPRResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["dummy-prs"]["materialize"]["$post"]
>;

export type MaterializeDummyPRError = ApiError & {
  status?: number;
};

const normalizeDummyMaterializationTimeWindow = (
  timeWindow: TimeWindow,
): [string, string] => {
  const [startAt, endAt] = timeWindow;
  if (!startAt || !endAt) {
    throw new Error("Dummy PR materialization requires a concrete time window");
  }
  return [startAt, endAt];
};

export const buildDummyPRMaterializationBody = (
  input: Omit<MaterializeDummyPRInput, "eventId">,
) => ({
  timeWindow: normalizeDummyMaterializationTimeWindow(input.timeWindow),
  place:
    input.place.kind === "location"
      ? ({
          kind: "location" as const,
          locationId: input.place.locationId,
        })
      : ({
          kind: "route" as const,
          routePoolEntryId: input.place.routePoolEntryId,
        }),
  preferences: [...(input.preferences ?? [])],
});

export const useMaterializeDummyPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    MaterializeDummyPRResponse,
    MaterializeDummyPRError,
    MaterializeDummyPRInput
  >({
    mutationFn: async ({ eventId, timeWindow, place, preferences }) => {
      const response = await client.api.events[":eventId"]["dummy-prs"][
        "materialize"
      ].$post(
        {
          param: {
            eventId: String(eventId),
          },
          json: buildDummyPRMaterializationBody({
            timeWindow,
            place,
            preferences,
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
          resolveApiErrorMessage(payload, "打开搭子详情失败"),
          payload,
        ) as MaterializeDummyPRError;
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
    },
  });
};
