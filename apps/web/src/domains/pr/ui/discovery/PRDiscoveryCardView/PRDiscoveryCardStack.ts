import type { PRDiscoveryCardViewModel } from "@/domains/pr/model/pr-discovery-card";
import type { PRDiscoveryCreationSuggestion } from "@/domains/pr/model/pr-discovery-creation-suggestion";
import type { PRDiscoveryPlaceOption } from "@/domains/pr/model/pr-discovery-place-options";
import type {
  PRDiscoveryCardGroup,
  PRDiscoveryPersistedCandidate,
  PRDiscoveryTypeDetail,
} from "@/domains/pr/model/pr-discovery-types";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import type { PRDiscoveryDirectCreateCommand } from "@/domains/pr/use-cases/usePRDiscoveryCreation";

export type FrontPRDiscoveryCardHandle = {
  triggerAction: (action: "skip" | "view-detail") => void;
  playHintWobble: () => void;
};

export type PRDiscoveryCardStackProps = {
  type?: string;
  typeDetail?: PRDiscoveryTypeDetail | null;
  items?: readonly PRDiscoveryPersistedCandidate[];
  cardGroups?: readonly PRDiscoveryCardGroup[];
  suggestions?: readonly PRDiscoveryCreationSuggestion[];
  authoringOptions?: PRAuthoringOptions | null;
  showCreate?: boolean;
  exhausted?: boolean;
  pending?: boolean;
  errorMessage?: string | null;
};

export type PRDiscoveryCardStackEmits = {
  skip: [candidate: PRDiscoveryPersistedCandidate | null];
  detail: [candidate: PRDiscoveryPersistedCandidate];
  "create-direct": [command: PRDiscoveryDirectCreateCommand];
  "card-stage-active-change": [isActive: boolean];
};

export const prDiscoveryCardStackDefaults = {
  type: "",
  typeDetail: null,
  items: () => [] as PRDiscoveryPersistedCandidate[],
  cardGroups: () => [] as PRDiscoveryCardGroup[],
  suggestions: () => [] as PRDiscoveryCreationSuggestion[],
  authoringOptions: null,
  showCreate: true,
  exhausted: false,
  pending: false,
  errorMessage: null,
};

export const PR_DISCOVERY_CARD_OVERFLOW_GUARD_CLASS = "pr-discovery-card-overflow-guard";
export const PR_DISCOVERY_CARD_DRAG_HINT_DELAY_MS = 3000;

export type { PRDiscoveryCardViewModel, PRDiscoveryPlaceOption };
