import type { InferRequestType, InferResponseType } from "hono";
import type { client } from "@/lib/rpc";

/**
 * PR transport aliases are owned by the domain adapter boundary.
 *
 * Keeping route inference here lets model and UI-facing types depend on a
 * stable domain contract without importing the Hono client mechanics.
 */
export type PRAuthoringOptions = InferResponseType<
  (typeof client.api.pr.authoring.options)["$get"]
>;

export type PRDetailResponse = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type PRDiscoveryDirectoryResponse = InferResponseType<
  (typeof client.api.pr.discovery)["$get"]
>;
export type PRDiscoveryRecommendationResponse = InferResponseType<
  (typeof client.api.pr.discovery.recommend)["$post"]
>;
export type PRDiscoveryCatalogResponse = InferResponseType<
  (typeof client.api.pr.discovery.catalog)["$get"]
>;
export type PRDiscoveryTypeDetailResponse = InferResponseType<
  (typeof client.api.pr.discovery.types)[":type"]["$get"]
>;
export type PRDiscoveryRecommendationInput = InferRequestType<
  (typeof client.api.pr.discovery.recommend)["$post"]
>["json"];
