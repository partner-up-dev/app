import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import type { PRDiscoveryCreationSuggestion } from "@/domains/pr/model/pr-discovery-creation-suggestion";
import type { PRDiscoveryPlaceSelection } from "@/domains/pr/model/pr-discovery-place-options";
import type { TimeWindow } from "@/domains/pr/model/pr-discovery-time-window";

export type PRDiscoveryDirectCreateCommand = {
  timeWindows: Array<{ startAt: string; endAt: string }>;
  place: PRDiscoveryPlaceSelection;
  preferences: string[];
  allowEditAfterReady: PRAllowEditAfterReady | null;
};

const toCompleteTimeWindow = (
  timeWindow: TimeWindow | null | undefined,
): { startAt: string; endAt: string } | null => {
  const startAt = timeWindow?.[0];
  const endAt = timeWindow?.[1];
  if (!startAt || !endAt) return null;
  return { startAt, endAt };
};

export const buildPRDiscoveryDirectCreateCommand = (input: {
  timeWindow: TimeWindow | null;
  place: PRDiscoveryPlaceSelection | null;
  preferences?: readonly string[];
  allowEditAfterReady?: PRAllowEditAfterReady | null;
}): PRDiscoveryDirectCreateCommand | null => {
  const timeWindow = toCompleteTimeWindow(input.timeWindow);
  if (!timeWindow || !input.place) return null;
  return {
    timeWindows: [timeWindow],
    place: input.place,
    preferences: [...(input.preferences ?? [])],
    allowEditAfterReady: input.allowEditAfterReady ?? null,
  };
};

export const buildPRDiscoverySuggestionCreateCommand = (
  suggestion: PRDiscoveryCreationSuggestion,
): PRDiscoveryDirectCreateCommand | null =>
  buildPRDiscoveryDirectCreateCommand({
    timeWindow: suggestion.timeWindow,
    place: suggestion.place,
    preferences: suggestion.preferenceTags,
    allowEditAfterReady: null,
  });

export const usePRDiscoveryCreation = () => ({
  buildDirectCreateCommand: buildPRDiscoveryDirectCreateCommand,
  buildSuggestionCreateCommand: buildPRDiscoverySuggestionCreateCommand,
});
