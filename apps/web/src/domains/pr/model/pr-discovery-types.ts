import type {
  PRDiscoveryCatalogResponse,
  PRDiscoveryDirectoryResponse as PRDiscoveryDirectoryContract,
  PRDiscoveryRecommendationResponse as PRDiscoveryRecommendationContract,
  PRDiscoveryTypeDetailResponse,
} from "@/domains/pr/contracts";
import type { PRDiscoveryCreationSuggestion } from "@/domains/pr/model/pr-discovery-creation-suggestion";

export type PRDiscoveryDirectoryResponse = PRDiscoveryDirectoryContract;
export type PRDiscoveryCatalogItem = PRDiscoveryCatalogResponse[number];
export type PRDiscoveryTypeDetail = PRDiscoveryTypeDetailResponse;
export type PRDiscoveryRecommendationResponse = PRDiscoveryRecommendationContract;
export type PRDiscoveryPersistedCandidate = PRDiscoveryDirectoryContract["candidates"][number];
export type PRDiscoveryListRecord = PRDiscoveryDirectoryContract["listRecords"][number];
export type PRDiscoveryCardGroup = PRDiscoveryDirectoryContract["cardGroups"][number];
export type PRDiscoveryMatchedCandidate =
  PRDiscoveryRecommendationContract["matchedCandidate"] extends infer Candidate
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
