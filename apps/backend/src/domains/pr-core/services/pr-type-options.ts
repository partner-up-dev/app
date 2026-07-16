export type NaturalLanguagePRTypeSource = "OBSERVED_PR" | "PR_TYPE_CONFIG";

export type NaturalLanguagePRTypeCandidate = {
  type: string;
  source: NaturalLanguagePRTypeSource;
};

export type NaturalLanguagePRTypePromptHints = {
  observedPRTypes: string[];
  configuredPRTypes: string[];
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
  observedPRTypes,
  configuredPRTypes,
}: NaturalLanguagePRTypePromptHints): NaturalLanguagePRTypeCandidate[] => {
  const candidates: NaturalLanguagePRTypeCandidate[] = [];
  const seenKeys = new Set<string>();

  appendCandidates(candidates, seenKeys, observedPRTypes, "OBSERVED_PR");
  appendCandidates(candidates, seenKeys, configuredPRTypes, "PR_TYPE_CONFIG");

  return candidates;
};

export const toNaturalLanguagePRTypePromptHints = (
  candidates: NaturalLanguagePRTypeCandidate[],
): NaturalLanguagePRTypePromptHints => ({
  observedPRTypes: candidates
    .filter((candidate) => candidate.source === "OBSERVED_PR")
    .map((candidate) => candidate.type),
  configuredPRTypes: candidates
    .filter((candidate) => candidate.source === "PR_TYPE_CONFIG")
    .map((candidate) => candidate.type),
});

export const canonicalizeNaturalLanguagePRType = (
  parsedType: string,
  candidates: NaturalLanguagePRTypeCandidate[],
): string => {
  const parsedKey = normalizeTypeKey(parsedType);
  const candidate = candidates.find((entry) => normalizeTypeKey(entry.type) === parsedKey);
  return candidate?.type ?? normalizeNewTypeLabel(parsedType);
};
