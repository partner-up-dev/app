import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

export type AnchorEventListResponse = InferResponseType<
  (typeof client.api.events)["$get"]
>;

export type AnchorEventListItem = AnchorEventListResponse[number];

export type AnchorEventDetailResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["$get"]
>;

export type AnchorEventDemandCardsResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["demand-cards"]["$get"]
>;

export type AnchorEventFormModeResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["form-mode"]["$get"]
>;

export type AnchorEventFormModeRecommendationResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["form-mode"]["recommendation"]["$post"]
>;

export type AnchorEventPreferenceTagSubmissionResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["preference-tags"]["submissions"]["$post"]
>;

export type AnchorEventTimeWindow =
  AnchorEventDetailResponse["browseTimeWindows"][number];

export type AnchorEventTimeWindowPR = AnchorEventTimeWindow["prs"][number];
