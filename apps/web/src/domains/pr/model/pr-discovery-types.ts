import type { InferResponseType } from "hono";
import type { PRDiscoveryCreationSuggestion } from "@/domains/pr/model/pr-discovery-creation-suggestion";
import { client } from "@/lib/rpc";

type DirectoryResponse = InferResponseType<(typeof client.api.pr.discovery)["$get"]>;
type RecommendationResponse = InferResponseType<
  (typeof client.api.pr.discovery.recommend)["$post"]
>;
type CatalogResponse = InferResponseType<(typeof client.api.pr.discovery.catalog)["$get"]>;
type TypeDetailResponse = InferResponseType<
  (typeof client.api.pr.discovery.types)[":type"]["$get"]
>;
export type PRDiscoveryDirectoryResponse = DirectoryResponse;
export type PRDiscoveryCatalogItem = CatalogResponse[number];
export type PRDiscoveryTypeDetail = TypeDetailResponse;
export type PRDiscoveryRecommendationResponse = RecommendationResponse;
export type PRDiscoveryPersistedCandidate = DirectoryResponse["candidates"][number];
export type PRDiscoveryListRecord = DirectoryResponse["listRecords"][number];
export type PRDiscoveryCardGroup = DirectoryResponse["cardGroups"][number];
export type PRDiscoveryMatchedCandidate =
  RecommendationResponse["matchedCandidate"] extends infer Candidate
    ? NonNullable<Candidate>
    : never;
export type PRDiscoveryRecommendationCandidate = PRDiscoveryMatchedCandidate;
export type PRDiscoveryCardItem = PRDiscoveryPersistedCandidate | PRDiscoveryCreationSuggestion;
export const isPRDiscoveryCreationSuggestion = (
  item: PRDiscoveryCardItem,
): item is PRDiscoveryCreationSuggestion => "kind" in item && item.kind === "creation-suggestion";
export const isPRDiscoveryPersistedCandidate = (
  item: PRDiscoveryCardItem,
): item is PRDiscoveryPersistedCandidate => !isPRDiscoveryCreationSuggestion(item);
