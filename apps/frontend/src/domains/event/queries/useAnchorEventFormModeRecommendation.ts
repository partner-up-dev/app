import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import { buildCorrelationHeaders } from "@/shared/telemetry/correlation";

export type AnchorEventFormModeRecommendationPlaceInput =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      routePoolEntryId: string;
    };

export type AnchorEventFormModeRecommendationTimeWindowInput = {
  startAt: string;
  endAt: string;
};

export const useAnchorEventFormModeRecommendation = () =>
  useMutation<
    AnchorEventFormModeRecommendationResponse,
    Error,
    {
      eventId: number;
      place: AnchorEventFormModeRecommendationPlaceInput;
      timeWindows: AnchorEventFormModeRecommendationTimeWindowInput[];
      preferences: string[];
      correlationId?: string;
    }
  >({
    mutationFn: async ({
      eventId,
      place,
      timeWindows,
      preferences,
      correlationId,
    }) => {
      const response = await client.api.events[":eventId"]["form-mode"][
        "recommendation"
      ].$post(
        {
          param: {
            eventId: eventId.toString(),
          },
          json: {
            place,
            timeWindows,
            preferences,
            correlationId,
          },
        },
        {
          init: {
            headers: buildCorrelationHeaders(correlationId),
          },
        },
      );

      if (!response.ok) {
        throw new Error("获取推荐结果失败");
      }

      return await response.json();
    },
  });
