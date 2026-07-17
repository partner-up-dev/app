import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";

const PAIRING_CODE_NAMESPACE = "partner-up:pr-pairing-code:";
const PAIRING_CODE_MODULUS = 10_000;
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export type PRPairingIdentity = {
  code: string;
  backgroundColor: string;
  foregroundColor: string;
};

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

const parsePairingCodeNumber = (code: string): number => Number.parseInt(code, 10);

const deriveBackgroundColor = (code: string): string => {
  const codeNumber = parsePairingCodeNumber(code);
  const hue = (codeNumber * 0.036).toFixed(3);
  const saturation = 72 + (codeNumber % 5) * 4;
  const lightness = 42 + (Math.floor(codeNumber / 5) % 5) * 3;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const hslToRgb = ({
  hue,
  saturation,
  lightness,
}: {
  hue: number;
  saturation: number;
  lightness: number;
}): [number, number, number] => {
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const huePrime = hue / 60;
  const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = normalizedLightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondComponent;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = secondComponent;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = secondComponent;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = secondComponent;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = secondComponent;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondComponent;
  }

  return [red + match, green + match, blue + match];
};

const toLinearRgb = (channel: number): number =>
  channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const getRelativeLuminance = ([red, green, blue]: [number, number, number]): number =>
  0.2126 * toLinearRgb(red) + 0.7152 * toLinearRgb(green) + 0.0722 * toLinearRgb(blue);

const deriveForegroundColor = (code: string): string => {
  const codeNumber = parsePairingCodeNumber(code);
  const hue = codeNumber * 0.036;
  const saturation = 72 + (codeNumber % 5) * 4;
  const lightness = 42 + (Math.floor(codeNumber / 5) % 5) * 3;
  const luminance = getRelativeLuminance(hslToRgb({ hue, saturation, lightness }));

  return luminance > 0.42 ? "#111111" : "#ffffff";
};

export const derivePRPairingIdentity = (prId: PRId): PRPairingIdentity => {
  const code = derivePRPairingCode(prId);

  return {
    code,
    backgroundColor: deriveBackgroundColor(code),
    foregroundColor: deriveForegroundColor(code),
  };
};

export const canShowPRPairingCode = (pr: PRDetailView): boolean =>
  pr.status === "READY" && pr.partnerSection.viewer.isParticipant;
