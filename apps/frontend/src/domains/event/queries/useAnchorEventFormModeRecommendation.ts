import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import type {
  FormModeFuzzyTimePreset,
} from "@/domains/event/model/form-mode";
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

export type AnchorEventFormModeRecommendationTimeInput =
  | {
      mode: "EXACT";
      startAt: string;
    }
  | {
      mode: "FUZZY";
      datePreset: string;
      timePreset: FormModeFuzzyTimePreset;
      candidateStartKeys: string[];
    };

export const useAnchorEventFormModeRecommendation = () =>
  useMutation<
    AnchorEventFormModeRecommendationResponse,
    Error,
    {
      eventId: number;
      place: AnchorEventFormModeRecommendationPlaceInput;
      timeSelection: AnchorEventFormModeRecommendationTimeInput;
      preferences: string[];
      correlationId?: string;
    }
  >({
    mutationFn: async ({
      eventId,
      place,
      timeSelection,
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
            timeSelection,
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
