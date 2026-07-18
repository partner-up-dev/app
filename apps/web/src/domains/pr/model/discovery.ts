export const PR_DISCOVERY_VIEW_MODES = ["LIST", "CARD", "FORM"] as const;
export type PRDiscoveryViewMode = (typeof PR_DISCOVERY_VIEW_MODES)[number];

export const isPRDiscoveryViewMode = (value: unknown): value is PRDiscoveryViewMode =>
  typeof value === "string" && PR_DISCOVERY_VIEW_MODES.includes(value as PRDiscoveryViewMode);

/** The server owns assignment; this preference only lets an explicit local choice win. */
export const resolvePRDiscoveryViewMode = (input: {
  serverViewMode: unknown;
  preferredViewMode?: unknown;
}): PRDiscoveryViewMode => {
  if (isPRDiscoveryViewMode(input.preferredViewMode)) return input.preferredViewMode;
  if (isPRDiscoveryViewMode(input.serverViewMode)) return input.serverViewMode;
  return "LIST";
};

/**
 * A discovery list is exhausted only when authoring cannot offer any viable
 * start/place capacity. Candidate count alone is not sufficient because the
 * list may legitimately be empty while creation suggestions remain available.
 */
export const isPRAuthoringOptionsExhausted = (
  options:
    | {
        startOptions?: readonly {
          locationOptions?: readonly { disabled?: boolean }[];
          routeOptions?: readonly { disabled?: boolean }[];
        }[];
        locationOptions?: readonly unknown[];
        routeOptions?: readonly unknown[];
      }
    | null
    | undefined,
): boolean => {
  if (!options) return false;
  const startOptions = options.startOptions ?? [];
  if (startOptions.length === 0) return true;
  if ((options.locationOptions?.length ?? 0) + (options.routeOptions?.length ?? 0) === 0) {
    return true;
  }
  return !startOptions.some((start) =>
    [...(start.locationOptions ?? []), ...(start.routeOptions ?? [])].some(
      (place) => place.disabled !== true,
    ),
  );
};

export const PR_DISCOVERY_VIEW_PREFERENCE_KEY = "pr-discovery.view-mode";

const viewPreferenceKey = (type: string): string =>
  `${PR_DISCOVERY_VIEW_PREFERENCE_KEY}:${type.trim()}`;

export const readPRDiscoveryViewPreference = (
  storage: Pick<Storage, "getItem"> | null,
  type = "",
): PRDiscoveryViewMode | null => {
  if (!storage) return null;
  const value = storage.getItem(viewPreferenceKey(type));
  return isPRDiscoveryViewMode(value) ? value : null;
};

export const writePRDiscoveryViewPreference = (
  storage: Pick<Storage, "setItem"> | null,
  viewMode: PRDiscoveryViewMode,
  type = "",
): void => {
  storage?.setItem(viewPreferenceKey(type), viewMode);
};
