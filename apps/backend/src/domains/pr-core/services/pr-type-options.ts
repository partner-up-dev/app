export type NaturalLanguagePRTypeSource = "PARTNER_REQUEST" | "ANCHOR_EVENT";

export type NaturalLanguagePRTypeCandidate = {
  type: string;
  source: NaturalLanguagePRTypeSource;
};

export type NaturalLanguagePRTypePromptHints = {
  existingPRTypes: string[];
  anchorEventTypes: string[];
};

const normalizeTypeKey = (value: string): string =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

const normalizeNewTypeLabel = (value: string): string =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

const appendCandidates = (
  candidates: NaturalLanguagePRTypeCandidate[],
  seenKeys: Set<string>,
  types: string[],
  source: NaturalLanguagePRTypeSource,
): void => {
  for (const type of types) {
    const trimmed = type.trim();
    const key = normalizeTypeKey(trimmed);
    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    candidates.push({ type: trimmed, source });
  }
};

export const buildNaturalLanguagePRTypeCandidates = ({
  existingPRTypes,
  anchorEventTypes,
}: NaturalLanguagePRTypePromptHints): NaturalLanguagePRTypeCandidate[] => {
  const candidates: NaturalLanguagePRTypeCandidate[] = [];
  const seenKeys = new Set<string>();

  appendCandidates(candidates, seenKeys, existingPRTypes, "PARTNER_REQUEST");
  appendCandidates(candidates, seenKeys, anchorEventTypes, "ANCHOR_EVENT");

  return candidates;
};

export const toNaturalLanguagePRTypePromptHints = (
  candidates: NaturalLanguagePRTypeCandidate[],
): NaturalLanguagePRTypePromptHints => ({
  existingPRTypes: candidates
    .filter((candidate) => candidate.source === "PARTNER_REQUEST")
    .map((candidate) => candidate.type),
  anchorEventTypes: candidates
    .filter((candidate) => candidate.source === "ANCHOR_EVENT")
    .map((candidate) => candidate.type),
});

export const canonicalizeNaturalLanguagePRType = (
  parsedType: string,
  candidates: NaturalLanguagePRTypeCandidate[],
): string => {
  const parsedKey = normalizeTypeKey(parsedType);
  const candidate = candidates.find(
    (entry) => normalizeTypeKey(entry.type) === parsedKey,
  );
  return candidate?.type ?? normalizeNewTypeLabel(parsedType);
};
