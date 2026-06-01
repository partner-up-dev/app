import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";

const PAIRING_CODE_NAMESPACE = "partner-up:pr-pairing-code:";
const PAIRING_CODE_MODULUS = 10_000;
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

const hashStringToUint32 = (value: string): number => {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
};

export const derivePRPairingCode = (prId: PRId): string => {
  const hash = hashStringToUint32(`${PAIRING_CODE_NAMESPACE}${prId}`);
  return String(hash % PAIRING_CODE_MODULUS).padStart(4, "0");
};

export const canShowPRPairingCode = (pr: PRDetailView): boolean =>
  pr.status === "READY" && pr.partnerSection.viewer.isParticipant;
