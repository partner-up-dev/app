export type AnchorEventLandingMode = "FORM" | "CARD_RICH" | "LIST";

const STORAGE_KEY_PREFIX = "partnerup:anchor-event-landing-mode";

const buildStorageKey = (
  eventId: number,
  assignmentRevision: number,
): string => `${STORAGE_KEY_PREFIX}:${eventId}:${assignmentRevision}`;

export const isValidAnchorEventLandingMode = (
  value: unknown,
): value is AnchorEventLandingMode =>
  value === "FORM" || value === "CARD_RICH" || value === "LIST";

export const normalizeAnchorEventLandingMode = (
  value: unknown,
): AnchorEventLandingMode | null => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "form") {
      return "FORM";
    }
    if (
      normalized === "card" ||
      normalized === "card_rich" ||
      normalized === "card-rich"
    ) {
      return "CARD_RICH";
    }
    if (normalized === "list") {
      return "LIST";
    }
    return null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    const mode = normalizeAnchorEventLandingMode(item);
    if (mode !== null) {
      return mode;
    }
  }

  return null;
};

export const readStoredAnchorEventLandingMode = (
  eventId: number,
  assignmentRevision: number,
): AnchorEventLandingMode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      buildStorageKey(eventId, assignmentRevision),
    );
    return isValidAnchorEventLandingMode(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const writeStoredAnchorEventLandingMode = (
  eventId: number,
  assignmentRevision: number,
  mode: AnchorEventLandingMode,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildStorageKey(eventId, assignmentRevision),
      mode,
    );
  } catch {
    // Ignore localStorage failures.
  }
};
