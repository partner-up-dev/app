import { createHash, timingSafeEqual } from "node:crypto";

export type FakeCaocaoSignedParams = Record<string, string>;

export function createFakeCaocaoSignature(input: {
  params: FakeCaocaoSignedParams;
  signKey: string;
}): string {
  const signingParams: FakeCaocaoSignedParams = {
    ...input.params,
    sign_key: input.signKey,
  };
  const source = Object.keys(signingParams)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((key) => `${key}${signingParams[key]}`)
    .join("");

  return createHash("sha1").update(source, "utf8").digest("hex");
}

export function fakeCaocaoSignaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
