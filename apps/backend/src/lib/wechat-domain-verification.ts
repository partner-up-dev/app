// Also update scripts/ci/fc/prepare_fc_package.sh to copy the verification file during deployment packaging.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MPWX_DOMAIN_VERIFICATION_FILENAME = "XdiIXm3WSq.txt";
export const WXOA_DOMAIN_VERIFICATION_FILENAME = "MP_verify_bDsck6MFYTmV24vd.txt";

const verificationFileRoots = [
  "../../../frontend/public/",
  "../../frontend/public/",
  "../verification/",
];

const buildVerificationFileCandidates = (filename: string): URL[] => {
  return verificationFileRoots.map(
    (rootPath) => new URL(`${rootPath}${filename}`, import.meta.url),
  );
};

const cachedVerificationContents = new Map<string, string>();

export const getWechatDomainVerificationContent = (filename: string): string => {
  const cachedContent = cachedVerificationContents.get(filename);
  if (cachedContent !== undefined) {
    return cachedContent;
  }

  const verificationFileCandidates = buildVerificationFileCandidates(filename);

  for (const candidate of verificationFileCandidates) {
    try {
      const content = readFileSync(candidate, "utf8");
      cachedVerificationContents.set(filename, content);
      return content;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  const attemptedPaths = verificationFileCandidates.map((candidate) => fileURLToPath(candidate));
  throw new Error(
    `WeChat domain verification file "${filename}" not found. Tried: ${attemptedPaths.join(", ")}`,
  );
};
